import { prisma } from "../../config/prisma";
import { encryptData, decryptData } from "../../utils/encryption";
import { PropPhase, ClientStatus } from "@prisma/client";

export const createPropAccount = async (userId: string, propData: {
  firmName: string;
  mt5AccountNumber: string;
  mt5Password: string;
  mt5Server: string;
  ftmoCreditDetail?: string;
  ftmoAccountDetail?: string;
  ftmoUserName?: string;
}) => {
  // Archive any existing active prop accounts
  await archiveExistingPropAccounts(userId);

  // Encrypt sensitive data
  const encryptedMt5Password = encryptData(propData.mt5Password);

  const propAccount = await prisma.propAccount.create({
    data: {
      userId,
      firmName: propData.firmName,
      mt5AccountNumber: propData.mt5AccountNumber,
      mt5Password: encryptedMt5Password,
      mt5Server: propData.mt5Server,
      phase: PropPhase.CHALLENGE,
      isActive: true,
      ftmoCreditDetail: propData.ftmoCreditDetail || null,
      ftmoAccountDetail: propData.ftmoAccountDetail || null,
      ftmoUserName: propData.ftmoUserName || null,
    },
  });

  // Update user onboarding step
  await updateUserOnboardingStep(userId, "prop", "COMPLETED");

  return propAccount;
};

export const getPropAccounts = async (userId: string, includeArchived: boolean = false) => {
  const whereClause: any = { userId };
  
  if (!includeArchived) {
    whereClause.isActive = true;
  }

  const propAccounts = await prisma.propAccount.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  // Decrypt sensitive data for response
  return propAccounts.map(account => ({
    ...account,
    mt5Password: account.mt5Password ? decryptData(account.mt5Password) : null,
  }));
};

export const getActivePropAccount = async (userId: string) => {
  const account = await prisma.propAccount.findFirst({
    where: {
      userId,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!account) {
    return null;
  }

  // Decrypt sensitive data
  return {
    ...account,
    mt5Password: account.mt5Password ? decryptData(account.mt5Password) : null,
  };
};

export const getPropAccount = async (id: string, userId: string) => {
  const account = await prisma.propAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    throw new Error("Prop firm account not found");
  }

  // Decrypt sensitive data
  return {
    ...account,
    mt5Password: account.mt5Password ? decryptData(account.mt5Password) : null,
  };
};

export const updatePropAccount = async (id: string, userId: string, updateData: {
  firmName?: string;
  mt5AccountNumber?: string;
  mt5Password?: string;
  mt5Server?: string;
  phase?: PropPhase;
  isActive?: boolean;
  ftmoCreditDetail?: string;
  ftmoAccountDetail?: string;
  ftmoUserName?: string;
}) => {
  // Encrypt sensitive fields if provided
  const dataToUpdate: any = { ...updateData };
  
  if (updateData.mt5Password) {
    dataToUpdate.mt5Password = encryptData(updateData.mt5Password);
  }

  const result = await prisma.propAccount.updateMany({
    where: { id, userId },
    data: dataToUpdate,
  });

  if (result.count === 0) {
    throw new Error("Prop firm account not found or you don't have permission to update it");
  }

  return getPropAccount(id, userId);
};

export const archivePropAccount = async (id: string, userId: string) => {
  const result = await prisma.propAccount.updateMany({
    where: { id, userId },
    data: {
      isActive: false,
      phase: PropPhase.ARCHIVED,
      archivedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new Error("Prop firm account not found or you don't have permission to archive it");
  }

  return { message: "Prop firm account archived successfully" };
};

export const validatePropAccount = async (id: string, userId: string) => {
  const account = await getPropAccount(id, userId);
  
  // Here you would implement actual MT5 connection validation
  // For now, we'll simulate validation
  
  try {
    const isValid = await simulateMt5Validation(account.mt5Server, account.mt5AccountNumber, account.mt5Password);
    
    return {
      success: isValid,
      message: isValid ? "Prop firm account validated successfully" : "Prop firm account validation failed",
      timestamp: new Date(),
    };
  } catch (error) {
    throw new Error("Prop firm account validation failed");
  }
};

export const updatePropPhase = async (id: string, userId: string, phase: PropPhase) => {
  const result = await prisma.propAccount.updateMany({
    where: { id, userId },
    data: { phase },
  });

  if (result.count === 0) {
    throw new Error("Prop firm account not found or you don't have permission to update it");
  }

  // Create alert for phase change
  const account = await getPropAccount(id, userId);
  await createAlert(userId, "ACCOUNT_CHANGE", "Prop Firm Phase Updated", `Your prop firm account phase has been updated to ${phase}`, "MEDIUM");

  return getPropAccount(id, userId);
};

export const getSupportedPropFirms = () => {
  return [
    {
      name: "Funded Next",
      phases: ["Challenge", "Verification", "Funded"],
      features: ["Up to $200,000", "80% profit split", "No time limit"],
      requirements: ["8% max drawdown", "10% profit target", "Minimum 5 trading days"],
    },
    {
      name: "FTMO",
      phases: ["Challenge", "Verification", "Funded"],
      features: ["Up to $400,000", "80-90% profit split", "Bi-weekly payouts"],
      requirements: ["10% max drawdown", "10% profit target", "Minimum 10 trading days"],
    },
    {
      name: "My Forex Funds",
      phases: ["Challenge", "Verification", "Funded"],
      features: ["Up to $500,000", "85% profit split", "First payout in 7 days"],
      requirements: ["8% max drawdown", "8% profit target", "Minimum 5 trading days"],
    },
    {
      name: "TopStep",
      phases: ["Combine", "Funded"],
      features: ["Up to $150,000", "80% profit split", "No minimum trading days"],
      requirements: ["12% max drawdown", "Profit target varies by combine"],
    },
    {
      name: "Blue Guardian",
      phases: ["Challenge", "Funded"],
      features: ["Up to $200,000", "85% profit split", "No time limit"],
      requirements: ["6% max drawdown", "10% profit target", "Minimum 4 trading days"],
    },
  ];
};

export const getPropStats = async (userId: string) => {
  const totalAccounts = await prisma.propAccount.count({
    where: { userId },
  });

  const activeAccounts = await prisma.propAccount.count({
    where: { 
      userId,
      isActive: true,
    },
  });

  const challengeAccounts = await prisma.propAccount.count({
    where: { 
      userId,
      phase: PropPhase.CHALLENGE,
      isActive: true,
    },
  });

  const fundedAccounts = await prisma.propAccount.count({
    where: { 
      userId,
      phase: PropPhase.FUNDED,
      isActive: true,
    },
  });

  return {
    total: totalAccounts,
    active: activeAccounts,
    challenge: challengeAccounts,
    funded: fundedAccounts,
    archived: totalAccounts - activeAccounts,
  };
};

// Helper function to archive existing active prop accounts
const archiveExistingPropAccounts = async (userId: string) => {
  const existingActive = await prisma.propAccount.findMany({
    where: {
      userId,
      isActive: true,
    },
  });

  for (const account of existingActive) {
    await prisma.propAccount.update({
      where: { id: account.id },
      data: {
        isActive: false,
        phase: PropPhase.ARCHIVED,
        archivedAt: new Date(),
      },
    });
  }
};

// Helper function to simulate MT5 validation (replace with actual implementation)
const simulateMt5Validation = async (server: string, accountNumber: string, password: string): Promise<boolean> => {
  // This is a placeholder - implement actual MT5 connection logic
  
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

// Helper function to create alerts
const createAlert = async (userId: string, type: any, title: string, message: string, severity: any) => {
  return prisma.alert.create({
    data: {
      userId,
      type,
      title,
      message,
      severity,
    },
  });
};
