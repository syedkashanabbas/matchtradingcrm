import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env-validation";
import { NetworkService } from "../network/network.service";
import { sendPasswordResetEmail } from "../../config/email";

export const registerUser = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
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

  // Check if this is the special admin email
  const isAdminEmail = data.email === 'exonomaai@gmail.com';
  
  // create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: isAdminEmail ? 'ADMIN' : 'CLIENT',
      status: isAdminEmail ? 'ACTIVE' : 'NEW',
    },
  });

  // Process referral if provided
  if (!isAdminEmail && data.refCode) {
    const networkService = new NetworkService(prisma);
    await networkService.processReferralOnRegistration(user.id, data.refCode);
  } else if (!isAdminEmail) {
    // Generate referral code for non-admin users
    const networkService = new NetworkService(prisma);
    await networkService.processReferralOnRegistration(user.id);
  }

  return user;
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
    user,
  };
};

export const requestPasswordReset = async (email: string) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Email not found");
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`🔢 Generated OTP for ${email}: ${otp}`);
  
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

export const verifyOTP = async (email: string, otp: string) => {
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

  // Mark OTP as used
  await prisma.passwordResetOTP.update({
    where: { email },
    data: { isUsed: true },
  });

  return { message: "OTP verified successfully" };
};

export const resetPassword = async (email: string, newPassword: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  return { message: "Password reset successfully" };
};
