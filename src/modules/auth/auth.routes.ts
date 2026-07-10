import { Router } from "express";
import { login, register, forgotPassword, verifyOtp, resetPassword, refresh } from "./auth.controller";
import { authRateLimit, sensitiveRateLimit } from "../../middleware/rateLimit.middleware";

const router = Router();

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/refresh", authRateLimit, refresh);
router.post("/forgot-password", sensitiveRateLimit, forgotPassword);
router.post("/verify-otp", sensitiveRateLimit, verifyOtp);
router.post("/reset-password", sensitiveRateLimit, resetPassword);

export default router;
