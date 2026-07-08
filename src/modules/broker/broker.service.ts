import { prisma } from "../../config/prisma";
import { encryptData, decryptData } from "../../utils/encryption";
import { ClientStatus } from "@prisma/client";

export const createBrokerAccount = async (userId: string, data: {
  brokerName: string;
  mt5AccountNumber: string;
  mt5Password: string;
  mt5Server: string;
  brokerPortalPassword?: string;
}) => {
  try {
    const encryptedPassword = encryptData(data.mt5Password);
    const encryptedPortalPassword = data.brokerPortalPassword 
      ? encryptData(data.brokerPortalPassword) 
      : null;

    const brokerAccount = await prisma.brokerAccount.create({
      data: {
        userId,
        brokerName: data.brokerName,
        mt5AccountNumber: data.mt5AccountNumber,
        mt5Password: encryptedPassword,
        mt5Server: data.mt5Server,
        brokerPortalPassword: encryptedPortalPassword,
      },
    });

    // Update user onboarding status
    await updateUserOnboardingStatus(userId, ClientStatus.ACTIVE);

    return {
      id: brokerAccount.id,
      brokerName: brokerAccount.brokerName,
      mt5AccountNumber: brokerAccount.mt5AccountNumber,
      mt5Server: brokerAccount.mt5Server,
      status: brokerAccount.status,
      createdAt: brokerAccount.createdAt,
    };
  } catch (error) {
    console.error("Failed to create broker account:", error);
    throw new Error("Failed to create broker account");
  }
};

export const getBrokerAccounts = async (userId: string) => {
  const brokerAccounts = await prisma.brokerAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Decrypt sensitive data for response
  return brokerAccounts.map(account => ({
    ...account,
    mt5Password: account.mt5Password ? decryptData(account.mt5Password) : null,
    brokerPortalPassword: account.brokerPortalPassword ? decryptData(account.brokerPortalPassword) : null,
  }));
};

export const getBrokerAccount = async (id: string, userId: string) => {
  const account = await prisma.brokerAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    throw new Error("Broker account not found");
  }

  // Decrypt sensitive data
  return {
    ...account,
    mt5Password: account.mt5Password ? decryptData(account.mt5Password) : null,
    brokerPortalPassword: account.brokerPortalPassword ? decryptData(account.brokerPortalPassword) : null,
  };
};

export const updateBrokerAccount = async (id: string, userId: string, updateData: {
  brokerName?: string;
  mt5AccountNumber?: string;
  mt5Password?: string;
  mt5Server?: string;
  brokerPortalPassword?: string;
  status?: string;
}) => {
  // Encrypt sensitive fields if provided
  const dataToUpdate: any = { ...updateData };
  
  if (updateData.mt5Password) {
    dataToUpdate.mt5Password = encryptData(updateData.mt5Password);
  }
  
  if (updateData.brokerPortalPassword) {
    dataToUpdate.brokerPortalPassword = encryptData(updateData.brokerPortalPassword);
  }

  const result = await prisma.brokerAccount.updateMany({
    where: { id, userId },
    data: dataToUpdate,
  });

  if (result.count === 0) {
    throw new Error("Broker account not found or you don't have permission to update it");
  }

  return getBrokerAccount(id, userId);
};

export const deleteBrokerAccount = async (id: string, userId: string) => {
  const result = await prisma.brokerAccount.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) {
    throw new Error("Broker account not found or you don't have permission to delete it");
  }

  return { message: "Broker account deleted successfully" };
};

export const validateBrokerAccount = async (id: string, userId: string) => {
  const account = await getBrokerAccount(id, userId);
  
  // Here you would implement actual MT5 connection validation
  // For now, we'll simulate validation
  
  try {
    const isValid = await simulateMt5Validation(account.mt5Server, account.mt5AccountNumber, account.mt5Password);
    
    // Update status based on validation result
    await prisma.brokerAccount.update({
      where: { id },
      data: { 
        status: isValid ? "active" : "failed",
      },
    });

    return {
      success: isValid,
      message: isValid ? "Broker account validated successfully" : "Broker account validation failed",
      timestamp: new Date(),
    };
  } catch (error) {
    await prisma.brokerAccount.update({
      where: { id },
      data: { status: "failed" },
    });

    throw new Error("Broker account validation failed");
  }
};

export const getBrokerStats = async (userId: string) => {
  const totalAccounts = await prisma.brokerAccount.count({
    where: { userId },
  });

  const activeAccounts = await prisma.brokerAccount.count({
    where: { 
      userId,
      status: "active",
    },
  });

  return {
    total: totalAccounts,
    active: activeAccounts,
    inactive: totalAccounts - activeAccounts,
  };
};

export const getSupportedBrokers = () => {
  return [
    {
      name: "Vantage",
      mt5Servers: [
        "Vantage-International-Demo",
        "Vantage-International-Live",
        "Vantage-Global-Demo",
        "Vantage-Global-Live",
      ],
      features: ["ECN accounts", "Low spreads", "Fast execution"],
    },
    {
      name: "IC Markets",
      mt5Servers: [
        "ICMarkets-Demo01",
        "ICMarkets-Live01",
        "ICMarkets-Demo02",
        "ICMarkets-Live02",
      ],
      features: ["True ECN", "No dealing desk", "Deep liquidity"],
    },
    {
      name: "Pepperstone",
      mt5Servers: [
        "Pepperstone-Demo",
        "Pepperstone-Live",
        "Pepperstone-Edge",
      ],
      features: [" Razor accounts", "Fast execution", "No requotes"],
    },
    {
      name: "FXCM",
      mt5Servers: [
        "FXCM-Demo",
        "FXCM-Live",
        "FXCM-Pro",
      ],
      features: ["No dealing desk", "Competitive spreads", "Stable platform"],
    },
  ];
};

// Helper function to simulate MT5 validation (replace with actual implementation)
const simulateMt5Validation = async (server: string, accountNumber: string, password: string): Promise<boolean> => {
  // This is a placeholder - implement actual MT5 connection logic
  // You would use MT5 API or third-party libraries
  
  try {
    // Simulate validation attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, return true if all fields are provided
    return !!(server && accountNumber && password);
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

// Update user onboarding status
const updateUserOnboardingStatus = async (userId: string, status: ClientStatus) => {
  await prisma.user.update({
    where: { id: userId },
    data: { status },
  });
};
