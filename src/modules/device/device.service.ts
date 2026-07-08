import { prisma } from "../../config/prisma";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const generateDeviceFingerprint = (deviceInfo: {
  accountLogin: string;
  brokerServer: string;
  terminalPath: string;
  computerName: string;
  eaVersion: string;
}): string => {
  const fingerprintData = {
    accountLogin: deviceInfo.accountLogin,
    brokerServer: deviceInfo.brokerServer,
    computerName: deviceInfo.computerName,
    eaVersion: deviceInfo.eaVersion,
  };
  
  const fingerprintString = JSON.stringify(fingerprintData, Object.keys(fingerprintData).sort());
  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
};

export const registerDevice = async (apiKeyId: string, deviceInfo: {
  accountLogin: string;
  brokerServer: string;
  terminalPath: string;
  computerName: string;
  eaVersion: string;
}) => {
  const fingerprint = generateDeviceFingerprint(deviceInfo);

  // Check if device already exists
  const existingDevice = await prisma.apiKeyDevice.findUnique({
    where: { fingerprint },
  });

  if (existingDevice) {
    // Update last seen
    return prisma.apiKeyDevice.update({
      where: { id: existingDevice.id },
      data: {
        lastSeenAt: new Date(),
        isActive: true,
        accountLogin: deviceInfo.accountLogin,
        brokerServer: deviceInfo.brokerServer,
        terminalPath: deviceInfo.terminalPath,
        computerName: deviceInfo.computerName,
        eaVersion: deviceInfo.eaVersion,
      },
    });
  }

  // Check device limits for the API key
  const deviceCount = await prisma.apiKeyDevice.count({
    where: {
      apiKeyId,
      isActive: true,
    },
  });

  const maxDevices = await getMaxDevicesForApiKey(apiKeyId);
  
  if (deviceCount >= maxDevices) {
    throw new Error(`Device limit exceeded. Maximum ${maxDevices} devices allowed per API key.`);
  }

  // Create new device
  return prisma.apiKeyDevice.create({
    data: {
      apiKeyId,
      fingerprint,
      accountLogin: deviceInfo.accountLogin,
      brokerServer: deviceInfo.brokerServer,
      terminalPath: deviceInfo.terminalPath,
      computerName: deviceInfo.computerName,
      eaVersion: deviceInfo.eaVersion,
      isActive: true,
      lastSeenAt: new Date(),
    },
  });
};

export const getMaxDevicesForApiKey = async (apiKeyId: string): Promise<number> => {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    include: { user: true },
  });

  if (!apiKey) {
    throw new Error("API key not found");
  }

  // Get user's subscription plan
  const subscription = await prisma.subscription.findFirst({
    where: { userId: apiKey.user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    return 1; // Free plan default
  }

  const deviceLimits = {
    FREE: 1,
    PRO: 3,
    ENTERPRISE: 10,
  };

  return deviceLimits[subscription.plan as keyof typeof deviceLimits] || 1;
};

export const getDevicesForApiKey = async (apiKeyId: string) => {
  return prisma.apiKeyDevice.findMany({
    where: { apiKeyId },
    orderBy: { lastSeenAt: "desc" },
  });
};

export const removeDevice = async (deviceId: string) => {
  return prisma.apiKeyDevice.update({
    where: { id: deviceId },
    data: {
      isActive: false,
    },
  });
};

export const updateDeviceLastSeen = async (fingerprint: string) => {
  return prisma.apiKeyDevice.updateMany({
    where: { fingerprint },
    data: {
      lastSeenAt: new Date(),
    },
  });
};

export const validateDeviceAccess = async (apiKeyId: string, fingerprint: string): Promise<boolean> => {
  const device = await prisma.apiKeyDevice.findUnique({
    where: { fingerprint },
    include: { apiKey: true },
  });

  if (!device) {
    return false;
  }

  if (device.apiKeyId !== apiKeyId) {
    return false;
  }

  if (!device.isActive) {
    return false;
  }

  // Update last seen
  await updateDeviceLastSeen(fingerprint);

  return true;
};

export const getDeviceStats = async (apiKeyId: string) => {
  const totalDevices = await prisma.apiKeyDevice.count({
    where: { apiKeyId },
  });

  const activeDevices = await prisma.apiKeyDevice.count({
    where: { 
      apiKeyId,
      isActive: true,
    },
  });

  const maxDevices = await getMaxDevicesForApiKey(apiKeyId);

  return {
    totalDevices,
    activeDevices,
    maxDevices,
    availableSlots: maxDevices - activeDevices,
  };
};

export const cleanupInactiveDevices = async (daysInactive: number = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  const inactiveDevices = await prisma.apiKeyDevice.findMany({
    where: {
      lastSeenAt: {
        lt: cutoffDate,
      },
      isActive: true,
    },
  });

  // Deactivate inactive devices
  for (const device of inactiveDevices) {
    await prisma.apiKeyDevice.update({
      where: { id: device.id },
      data: { isActive: false },
    });
  }

  return inactiveDevices.length;
};
