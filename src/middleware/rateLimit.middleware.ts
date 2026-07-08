import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Authentication rate limiting (stricter)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// API key validation rate limiting (for EA checks)
export const apiKeyRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each API key to 60 requests per minute
  keyGenerator: (req: Request) => {
    // Use API key from request body or headers
    const apiKey = req.body.apiKey || req.headers['x-api-key'];
    return apiKey || req.ip;
  },
  message: {
    message: "Too many API key validation requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin operations rate limiting
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each admin to 50 admin requests per windowMs
  keyGenerator: (req: Request) => {
    // Use user ID from authenticated request
    return (req as any).user?.userId || req.ip;
  },
  message: {
    message: "Too many admin operations, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Sensitive operations rate limiting (password reset, etc.)
export const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 sensitive operations per hour
  message: {
    message: "Too many sensitive operations, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// File upload rate limiting
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    message: "Too many file uploads, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom rate limiting middleware with dynamic limits
export const createCustomRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || {
      message: "Rate limit exceeded, please try again later.",
    },
    keyGenerator: options.keyGenerator,
    skipSuccessfulRequests: options.skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limiting based on user subscription tier
export const subscriptionBasedRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // This would check user's subscription and apply different limits
  // For now, use general rate limiting
  return generalRateLimit(req, res, next);
};

// API key based rate limiting for EA endpoints
export const eaRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Extract API key from request
  const apiKey = req.body.apiKey || req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ message: "API key required" });
  }

  // Apply rate limiting based on API key
  return apiKeyRateLimit(req, res, next);
};
