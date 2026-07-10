import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env-validation";
import { NetworkService } from "../network/network.service";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../../config/email";

/** Strips sensitive fields before a user object leaves the API. */
export const sanitizeUser = <T extends { password?: string }>(user: T) => {
  const { password, ...safe } = user;
  return safe;
};

export const registerUser = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  termsAccepted: true;
  privacyAccepted: true;
  refCode?: string;
}) => {
  // check existing user
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("User already exists");
  }

  // hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Registration always creates CLIENT users. Admins are created exclusively
  // via the seed script driven by ADMIN_EMAIL / ADMIN_PASSWORD env vars (D2).
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      country: data.country,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      role: 'CLIENT',
      status: 'NEW',
    },
  });

  // Process referral (also generates the user's own referral code)
  const networkService = new NetworkService(prisma);
  await networkService.processReferralOnRegistration(user.id, data.refCode);

  // Fire-and-forget welcome email (5.3)
  sendWelcomeEmail(user.email, user.firstName).catch(() => {});

  return sanitizeUser(user);
};

export const loginUser = async (data: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(data.password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  // User validation - all authenticated users can log in
  // (Admin-specific restrictions should be handled at route level)

  // generate tokens
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign({ userId: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  let payload: { userId: string };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw new Error("Invalid refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) {
    throw new Error("Invalid refresh token");
  }

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" },
  );

  return { accessToken, user: sanitizeUser(user) };
};

export const requestPasswordReset = async (email: string) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Email not found");
  }

  // Generate 6-digit OTP (never logged - it is a credential)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiry to 10 minutes from now
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Store or update OTP in database
  await prisma.passwordResetOTP.upsert({
    where: { email },
    update: {
      otp,
      expiresAt,
      isUsed: false,
    },
    create: {
      email,
      otp,
      expiresAt,
    },
  });

  // Send OTP via email
  await sendPasswordResetEmail(email, otp);

  return { message: "OTP sent to your email" };
};

const assertValidOtp = async (email: string, otp: string) => {
  const storedOTP = await prisma.passwordResetOTP.findUnique({
    where: { email },
  });

  if (!storedOTP) {
    throw new Error("OTP not found or expired");
  }

  if (storedOTP.isUsed) {
    throw new Error("OTP has already been used");
  }

  if (storedOTP.expiresAt < new Date()) {
    throw new Error("OTP has expired");
  }

  if (storedOTP.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  return storedOTP;
};

/** Validates the OTP without consuming it (the reset step consumes it). */
export const verifyOTP = async (email: string, otp: string) => {
  await assertValidOtp(email, otp);
  return { message: "OTP verified successfully" };
};

/**
 * Resets the password ONLY with a valid, unused, unexpired OTP.
 * The OTP is consumed here, atomically with the password change.
 */
export const resetPassword = async (email: string, otp: string, newPassword: string) => {
  await assertValidOtp(email, otp);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.passwordResetOTP.update({
      where: { email },
      data: { isUsed: true },
    }),
    prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    }),
  ]);

  return { message: "Password reset successfully" };
};
