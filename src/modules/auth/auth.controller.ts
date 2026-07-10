import { Request, Response } from "express";
import { loginUser, registerUser, requestPasswordReset, verifyOTP, resetPassword as resetUserPassword, refreshAccessToken } from "./auth.service";
import { loginSchema, registerSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema, refreshSchema } from "./auth.validation";

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await registerUser(data);

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data);

    res.json({
      message: "Login successful",
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const data = refreshSchema.parse(req.body);
    const result = await refreshAccessToken(data.refreshToken);

    res.json({
      message: "Token refreshed",
      ...result,
    });
  } catch {
    // Always 401 so the client knows to re-authenticate
    res.status(401).json({
      message: "Invalid refresh token",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await requestPasswordReset(data.email);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const data = verifyOtpSchema.parse(req.body);
    const result = await verifyOTP(data.email, data.otp);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const result = await resetUserPassword(data.email, data.otp, data.newPassword);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};
