import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// Common validation schemas
const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters long");
const uuidSchema = z.string().uuid("Invalid ID format");

// User registration validation
export const validateUserRegistration = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      email: emailSchema,
      password: passwordSchema.regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
      firstName: z.string().min(2, "First name must be at least 2 characters long").max(50, "First name must be less than 50 characters"),
      lastName: z.string().min(2, "Last name must be at least 2 characters long").max(50, "Last name must be less than 50 characters"),
    });

    schema.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      })) || [{ field: 'general', message: error.message }],
    });
  }
};

// User login validation
export const validateUserLogin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      email: emailSchema,
      password: z.string().min(1, "Password is required"),
    });

    schema.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      })) || [{ field: 'general', message: error.message }],
    });
  }
};

// Broker account validation
export const validateBrokerAccount = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      brokerName: z.string().min(1, "Broker name is required"),
      mt5AccountNumber: z.string().min(1, "MT5 account number is required"),
      mt5Password: z.string().min(1, "MT5 password is required"),
      mt5Server: z.string().min(1, "MT5 server is required"),
      brokerPortalPassword: z.string().optional(),
    });

    schema.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      })) || [{ field: 'general', message: error.message }],
    });
  }
};

// Prop firm account validation
export const validatePropAccount = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      firmName: z.string().min(1, "Firm name is required"),
      mt5AccountNumber: z.string().min(1, "MT5 account number is required"),
      mt5Password: z.string().min(1, "MT5 password is required"),
      mt5Server: z.string().min(1, "MT5 server is required"),
    });

    schema.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      })) || [{ field: 'general', message: error.message }],
    });
  }
};

// UUID parameter validation
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params[paramName];
      uuidSchema.parse(id);
      next();
    } catch (error: any) {
      res.status(400).json({
        message: "Validation failed",
        errors: [{ field: paramName, message: "Invalid ID format" }],
      });
    }
  };
};

// Pagination validation
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    });

    schema.parse(req.query);
    next();
  } catch (error: any) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      })) || [{ field: 'general', message: error.message }],
    });
  }
};
