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

// API key creation validation
export const validateApiKeyCreation = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(1, "API key name is required").max(100, "API key name must be less than 100 characters"),
      expiresAt: z.string().datetime().optional(),
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

// VPS configuration validation
export const validateVpsConfig = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      provider: z.string().min(1, "Provider is required"),
      ipAddress: z.string().min(1, "IP address is required"),
      sshUsername: z.string().min(1, "SSH username is required"),
      sshPassword: z.string().min(1, "SSH password is required"),
      panelUrl: z.string().url("Invalid panel URL format").optional(),
      panelUsername: z.string().optional(),
      panelPassword: z.string().optional(),
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

// EA configuration validation
export const validateEaConfig = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      version: z.string().min(1, "Version is required"),
      config: z.object({
        trading: z.object({
          maxDrawdown: z.number().min(1).max(100),
          riskPerTrade: z.number().min(0.1).max(10),
          maxPositions: z.number().min(1).max(20),
          stopLoss: z.number().min(10).max(500),
          takeProfit: z.number().min(10).max(1000),
        }),
        filters: z.object({
          newsFilter: z.boolean(),
          weekendFilter: z.boolean(),
          volatilityFilter: z.boolean(),
          maxSpread: z.number().min(0).max(10),
        }),
        timing: z.object({
          tradingHours: z.object({
            start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          }),
          weekdays: z.array(z.number().min(1).max(5)),
        }),
        notifications: z.object({
          tradeAlerts: z.boolean(),
          errorAlerts: z.boolean(),
          dailyReport: z.boolean(),
        }),
      }),
      schema: z.object({
        trading: z.object({
          maxDrawdown: z.object({ type: z.string(), required: z.literal(true) }),
          riskPerTrade: z.object({ type: z.string(), required: z.literal(true) }),
          maxPositions: z.object({ type: z.string(), required: z.literal(true) }),
          stopLoss: z.object({ type: z.string(), required: z.literal(true) }),
          takeProfit: z.object({ type: z.string(), required: z.literal(true) }),
        }),
        filters: z.object({
          newsFilter: z.object({ type: z.string(), required: z.literal(true) }),
          weekendFilter: z.object({ type: z.string(), required: z.literal(true) }),
          volatilityFilter: z.object({ type: z.string(), required: z.literal(true) }),
          maxSpread: z.object({ type: z.string(), required: z.literal(true) }),
        }),
        timing: z.object({
          tradingHours: z.object({
            start: z.object({ type: z.string(), required: z.literal(true) }),
            end: z.object({ type: z.string(), required: z.literal(true) }),
          }),
          weekdays: z.object({ type: z.string(), required: z.literal(true) }),
        }),
        notifications: z.object({
          tradeAlerts: z.object({ type: z.string(), required: z.literal(true) }),
          errorAlerts: z.object({ type: z.string(), required: z.literal(true) }),
          dailyReport: z.object({ type: z.string(), required: z.literal(true) }),
        }),
      }),
      minEaVersion: z.string().optional(),
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

// Device registration validation
export const validateDeviceRegistration = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      accountLogin: z.string().min(1, "Account login is required"),
      brokerServer: z.string().min(1, "Broker server is required"),
      terminalPath: z.string().min(1, "Terminal path is required"),
      computerName: z.string().min(1, "Computer name is required"),
      eaVersion: z.string().min(1, "EA version is required"),
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

// IP address validation
export const validateIPAddress = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ipAddress } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({
        message: "IP address is required",
      });
    }
    
    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    if (!ipRegex.test(ipAddress)) {
      return res.status(400).json({
        message: "Invalid IP address format",
      });
    }
    
    next();
  } catch (error: any) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      })) || [{ field: 'ipAddress', message: error.message }],
    });
  }
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
