import { verifyEaAccess as verifyApiKey } from "../apikey/apikey.service";
import { validateDeviceAccess, registerDevice, getMaxDevicesForApiKey } from "../device/device.service";
import { getActiveEaConfig } from "../config/config.service";
import { getUserSubscription } from "../subscription/subscription.service";
import { prisma } from "../../config/prisma";
import { ClientStatus } from "@prisma/client";

export interface EAValidationRequest {
  apiKey: string;
  fingerprint: string;
  deviceInfo: {
    accountLogin: string;
    brokerServer: string;
    terminalPath: string;
    computerName: string;
    eaVersion: string;
  };
}

export interface EAValidationResponse {
  valid: boolean;
  config?: any;
  error?: string;
  restrictions?: {
    maxDevices: number;
    currentDevices: number;
  };
  user?: {
    id: string;
    status: string;
    plan: string;
  };
  subscription?: {
    status: string;
    plan: string;
    currentPeriodEnd?: Date;
    gracePeriodEnd?: Date;
  };
}

export const verifyEaAccess = async (apiKey: string, deviceId: string) => {
  try {
    // Use the proper API key verification from apikey service
    return await verifyApiKey(apiKey, deviceId);
  } catch (error) {
    console.error("verifyEaAccess error:", error);
    throw error;
  }
};

export const validateEARequest = async (request: EAValidationRequest): Promise<EAValidationResponse> => {
  try {
    const { apiKey, fingerprint, deviceInfo } = request;

    // Step 1: Verify API key
    const keyVerification = await verifyEaAccess(apiKey, fingerprint);
    if (!keyVerification.allowed) {
      return {
        valid: false,
        error: keyVerification.reason,
      };
    }

    const userId = keyVerification.userId;

    // Step 2: Get user and subscription information
    const [user, subscription] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      getUserSubscription(userId),
    ]);

    if (!user) {
      return {
        valid: false,
        error: "USER_NOT_FOUND",
      };
    }

    // Step 3: Check user status
    if (user.status === ClientStatus.INACTIVE) {
      return {
        valid: false,
        error: "USER_DEACTIVATED",
        user: {
          id: user.id,
          status: user.status,
          plan: subscription?.plan || "FREE",
        },
        subscription: subscription ? {
          status: subscription.status,
          plan: subscription.plan,
          currentPeriodEnd: subscription.currentPeriodEnd,
          gracePeriodEnd: user.gracePeriodEnd || undefined,
        } : undefined,
      };
    }

    if (user.status === ClientStatus.SUSPENDED) {
      return {
        valid: false,
        error: "USER_SUSPENDED",
        user: {
          id: user.id,
          status: user.status,
          plan: subscription?.plan || "FREE",
        },
        subscription: subscription ? {
          status: subscription.status,
          plan: subscription.plan,
          currentPeriodEnd: subscription.currentPeriodEnd,
          gracePeriodEnd: user.gracePeriodEnd || undefined,
        } : undefined,
      };
    }

    // Step 4: Check subscription status
    if (subscription) {
      const now = new Date();
      
      // Check if subscription is active
      if (subscription.status !== "ACTIVE" || subscription.currentPeriodEnd < now) {
        // Check if user is in grace period
        if (user.gracePeriodEnd && user.gracePeriodEnd > now) {
          // Allow access during grace period
          console.log(`User ${userId} is in grace period, allowing EA access`);
        } else {
          return {
            valid: false,
            error: "SUBSCRIPTION_EXPIRED",
            user: {
              id: user.id,
              status: user.status,
              plan: subscription.plan,
            },
            subscription: {
              status: subscription.status,
              plan: subscription.plan,
              currentPeriodEnd: subscription.currentPeriodEnd,
              gracePeriodEnd: user.gracePeriodEnd || undefined,
            },
          };
        }
      }
    } else {
      // No subscription - check if user is in trial period or has free access
      const userCreated = new Date(user.createdAt);
      const trialDays = 7; // 7-day trial
      const trialEnd = new Date(userCreated.getTime() + trialDays * 24 * 60 * 60 * 1000);
      
      if (new Date() > trialEnd) {
        return {
          valid: false,
          error: "NO_SUBSCRIPTION",
          user: {
            id: user.id,
            status: user.status,
            plan: "FREE",
          },
        };
      }
    }

    // Step 5: Get API key details
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: { userId },
      include: { devices: true },
    });

    if (!apiKeyRecord) {
      return {
        valid: false,
        error: "API_KEY_NOT_FOUND",
      };
    }

    // Step 6: Check device limits
    const maxDevices = await getMaxDevicesForApiKey(apiKeyRecord.id);
    const currentDevices = apiKeyRecord.devices.filter(d => d.isActive).length;

    // Step 7: Validate device access
    const deviceValid = await validateDeviceAccess(apiKeyRecord.id, fingerprint);
    
    if (!deviceValid) {
      if (currentDevices >= maxDevices) {
        return {
          valid: false,
          error: "DEVICE_LIMIT_EXCEEDED",
          restrictions: {
            maxDevices,
            currentDevices,
          },
          user: {
            id: user.id,
            status: user.status,
            plan: subscription?.plan || "FREE",
          },
          subscription: subscription ? {
            status: subscription.status,
            plan: subscription.plan,
            currentPeriodEnd: subscription.currentPeriodEnd,
            gracePeriodEnd: user.gracePeriodEnd || undefined,
          } : undefined,
        };
      } else {
        // Register new device
        await registerDevice(apiKeyRecord.id, deviceInfo);
      }
    }

    // Step 8: Get EA configuration
    const config = await getActiveEaConfig();

    // Step 9: Update API key usage
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    // Step 10: Create audit log
    await prisma.auditEvent.create({
      data: {
        userId,
        action: "EA_VALIDATION_SUCCESS",
        resource: "EA",
        details: {
          fingerprint,
          deviceInfo,
          plan: subscription?.plan || "FREE",
        },
        severity: "LOW",
      },
    });

    return {
      valid: true,
      config: config?.config,
      user: {
        id: user.id,
        status: user.status,
        plan: subscription?.plan || "FREE",
      },
      subscription: subscription ? {
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodEnd: subscription.currentPeriodEnd,
        gracePeriodEnd: user.gracePeriodEnd || undefined,
      } : undefined,
    };

  } catch (error: any) {
    console.error("EA validation error:", error);
    
    // Create audit log for validation failure
    await prisma.auditEvent.create({
      data: {
        action: "EA_VALIDATION_ERROR",
        resource: "EA",
        details: {
          error: error.message,
          fingerprint: request.fingerprint,
        },
        severity: "MEDIUM",
      },
    });

    return {
      valid: false,
      error: "VALIDATION_ERROR",
    };
  }
};

export const registerEADevice = async (apiKey: string, deviceInfo: any) => {
  try {
    // Find the API key
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: { hashedKey: apiKey },
    });

    if (!apiKeyRecord) {
      throw new Error("API key not found");
    }

    // Generate fingerprint
    const fingerprint = require("../device/device.service").generateDeviceFingerprint(deviceInfo);

    // Register device
    const device = await registerDevice(apiKeyRecord.id, deviceInfo);

    // Create audit log
    await prisma.auditEvent.create({
      data: {
        userId: apiKeyRecord.userId,
        action: "EA_DEVICE_REGISTERED",
        resource: "EA_DEVICE",
        details: {
          fingerprint,
          deviceInfo,
        },
        severity: "LOW",
      },
    });

    return device;
  } catch (error: any) {
    console.error("Register EA device error:", error);
    throw error;
  }
};

export const unregisterEADevice = async (apiKey: string, fingerprint: string) => {
  try {
    // Find the API key
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: { hashedKey: apiKey },
    });

    if (!apiKeyRecord) {
      throw new Error("API key not found");
    }

    // Find and deactivate device
    const device = await prisma.apiKeyDevice.findFirst({
      where: {
        apiKeyId: apiKeyRecord.id,
        fingerprint,
      },
    });

    if (!device) {
      throw new Error("Device not found");
    }

    await prisma.apiKeyDevice.update({
      where: { id: device.id },
      data: { isActive: false },
    });

    // Create audit log
    await prisma.auditEvent.create({
      data: {
        userId: apiKeyRecord.userId,
        action: "EA_DEVICE_UNREGISTERED",
        resource: "EA_DEVICE",
        details: {
          fingerprint,
        },
        severity: "LOW",
      },
    });

    return { message: "Device unregistered successfully" };
  } catch (error: any) {
    console.error("Unregister EA device error:", error);
    throw error;
  }
};

export const getEAConfig = async (version?: string) => {
  try {
    let config;
    
    if (version) {
      config = await prisma.eaConfig.findUnique({
        where: { version },
      });
    } else {
      config = await getActiveEaConfig();
    }

    if (!config) {
      throw new Error("Configuration not found");
    }

    return {
      version: config.version,
      config: config.config,
      signature: config.signature,
      minEaVersion: config.minEaVersion,
    };
  } catch (error: any) {
    console.error("Get EA config error:", error);
    throw error;
  }
};
