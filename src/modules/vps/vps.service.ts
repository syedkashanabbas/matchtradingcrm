import { prisma } from "../../config/prisma";
import { encryptData, decryptData } from "../../utils/encryption";
import { ClientStatus } from "@prisma/client";

export const createVpsConfig = async (userId: string, vpsData: {
  provider: string;
  ipAddress: string;
  sshUsername: string;
  sshPassword: string;
  panelUrl?: string;
  panelUsername?: string;
  panelPassword?: string;
}) => {
  // Validate IP address format
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(vpsData.ipAddress)) {
    throw new Error("Invalid IP address format. Please provide a valid IPv4 address (e.g., 192.168.1.100)");
  }

  // Encrypt sensitive data
  const encryptedSshPassword = encryptData(vpsData.sshPassword);
  const encryptedPanelPassword = vpsData.panelPassword ? encryptData(vpsData.panelPassword) : null;

  const vpsConfig = await prisma.vpsConfig.create({
    data: {
      userId,
      provider: vpsData.provider,
      ipAddress: vpsData.ipAddress,
      sshUsername: vpsData.sshUsername,
      sshPassword: encryptedSshPassword,
      panelUrl: vpsData.panelUrl,
      panelUsername: vpsData.panelUsername,
      panelPassword: encryptedPanelPassword,
      status: "review",
    },
  });

  // Update user status if this is first VPS setup
  await updateUserOnboardingStep(userId, "vps", "COMPLETED");

  return vpsConfig;
};

export const getVpsConfigs = async (userId: string) => {
  const vpsConfigs = await prisma.vpsConfig.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Decrypt sensitive data for response
  return vpsConfigs.map(config => ({
    ...config,
    sshPassword: config.sshPassword ? decryptData(config.sshPassword) : null,
    panelPassword: config.panelPassword ? decryptData(config.panelPassword) : null,
  }));
};

export const getVpsConfig = async (id: string, userId: string) => {
  const config = await prisma.vpsConfig.findFirst({
    where: { id, userId },
  });

  if (!config) {
    throw new Error("VPS configuration not found");
  }

  // Decrypt sensitive data
  return {
    ...config,
    sshPassword: config.sshPassword ? decryptData(config.sshPassword) : null,
    panelPassword: config.panelPassword ? decryptData(config.panelPassword) : null,
  };
};

export const updateVpsConfig = async (id: string, userId: string, updateData: {
  provider?: string;
  ipAddress?: string;
  sshUsername?: string;
  sshPassword?: string;
  panelUrl?: string;
  panelUsername?: string;
  panelPassword?: string;
  status?: string;
}) => {
  // Validate IP address format if provided
  if (updateData.ipAddress) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(updateData.ipAddress)) {
      throw new Error("Invalid IP address format. Please provide a valid IPv4 address (e.g., 192.168.1.100)");
    }
  }

  // Encrypt sensitive fields if provided
  const dataToUpdate: any = { ...updateData };
  
  if (updateData.sshPassword) {
    dataToUpdate.sshPassword = encryptData(updateData.sshPassword);
  }
  
  if (updateData.panelPassword) {
    dataToUpdate.panelPassword = encryptData(updateData.panelPassword);
  }

  const config = await prisma.vpsConfig.updateMany({
    where: { id, userId },
    data: dataToUpdate,
  });

  if (config.count === 0) {
    throw new Error("VPS configuration not found or you don't have permission to update it");
  }

  return getVpsConfig(id, userId);
};

export const deleteVpsConfig = async (id: string, userId: string) => {
  const result = await prisma.vpsConfig.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) {
    throw new Error("VPS configuration not found or you don't have permission to delete it");
  }

  return { message: "VPS configuration deleted successfully" };
};

export const testVpsConnection = async (id: string, userId: string) => {
  const config = await getVpsConfig(id, userId);
  
  // Here you would implement actual connection testing logic
  // For now, we'll simulate a connection test
  
  try {
    // Simulate SSH connection test
    const isConnected = await simulateSshConnection(config.ipAddress, config.sshUsername, config.sshPassword);
    
    // Update status based on test result
    await prisma.vpsConfig.update({
      where: { id },
      data: { 
        status: isConnected ? "active" : "failed",
      },
    });

    return {
      success: isConnected,
      message: isConnected ? "VPS connection successful" : "VPS connection failed",
      timestamp: new Date(),
    };
  } catch (error) {
    await prisma.vpsConfig.update({
      where: { id },
      data: { status: "failed" },
    });

    throw new Error("VPS connection test failed");
  }
};

export const getVpsStats = async (userId: string) => {
  const totalConfigs = await prisma.vpsConfig.count({
    where: { userId },
  });

  const activeConfigs = await prisma.vpsConfig.count({
    where: { 
      userId,
      status: "active",
    },
  });

  const pendingConfigs = await prisma.vpsConfig.count({
    where: { 
      userId,
      status: "pending",
    },
  });

  return {
    total: totalConfigs,
    active: activeConfigs,
    pending: pendingConfigs,
    failed: totalConfigs - activeConfigs - pendingConfigs,
  };
};

// Helper function to simulate SSH connection (replace with actual implementation)
const simulateSshConnection = async (ipAddress: string, username: string, password: string): Promise<boolean> => {
  // This is a placeholder - implement actual SSH connection logic
  // You would use a library like 'ssh2' or 'node-ssh'
  
  try {
    // Simulate connection attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, return true if IP looks valid
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ipAddress);
  } catch (error) {
    return false;
  }
};

// Helper function to update user onboarding step
const updateUserOnboardingStep = async (userId: string, stepId: string, status: string) => {
  await prisma.onboardingStep.upsert({
    where: {
      userId_stepId: {
        userId,
        stepId,
      },
    },
    update: {
      status: status as any,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
    create: {
      userId,
      stepId,
      status: status as any,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  // Check if all required steps are completed
  await checkAndUpdateUserStatus(userId);
};

const checkAndUpdateUserStatus = async (userId: string) => {
  const completedSteps = await prisma.onboardingStep.count({
    where: {
      userId,
      status: "COMPLETED",
    },
  });

  const requiredSteps = ["payment", "vps", "broker", "prop"];
  
  if (completedSteps === requiredSteps.length) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: ClientStatus.ACTIVE },
    });
  }
};
