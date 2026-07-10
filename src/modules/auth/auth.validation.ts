import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(10).regex(/^[\+]?[0-9]{10,15}$/, 'Please enter a valid phone number (10-15 digits)'),
  country: z.string().min(2, "Country is required").max(100),
  termsAccepted: z.literal(true, { message: "You must accept the Terms of Service" }),
  privacyAccepted: z.literal(true, { message: "You must accept the Privacy Policy" }),
  refCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
