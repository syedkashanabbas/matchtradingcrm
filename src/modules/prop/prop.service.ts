import { prisma } from "../../config/prisma";
import { encryptData, decryptData, maskSecret } from "../../utils/encryption";
import { PropPhase } from "@prisma/client";
import { completeStep } from "../onboarding/onboarding.service";
import { enqueueServiceCommand } from "../provisioning/service-control.service";

export const createPropAccount = async (userId: string, propData: {
  firmName: string;
  mt5AccountNumber: string;
  mt5Password: string;
  mt5Server: string;
  phase?: "CHALLENGE" | "FUNDED";
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
      phase: propData.phase === "FUNDED" ? PropPhase.FUNDED : PropPhase.CHALLENGE,
      isActive: true,
      ftmoCreditDetail: propData.ftmoCreditDetail || null,
      ftmoAccountDetail: propData.ftmoAccountDetail || null,
      ftmoUserName: propData.ftmoUserName || null,
    },
  });

  // Update user onboarding step
  await completeStep(userId, "prop");

  // Post-provisioning rotation: incremental sync to EasierProp (§5.4)
  const provision = await prisma.easierPropProvision.findUnique({ where: { userId } });
  if (provision?.status === "COMPLETED") {
    await enqueueServiceCommand(userId, "SYNC_PROP_ROTATION", { newPropAccountId: propAccount.id }, userId);
  }

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

  // Never return plaintext credentials (D1): passwords are masked.
  return propAccounts.map(account => ({
    ...account,
    mt5Password: maskSecret(account.mt5AccountNumber),
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

  // Never return plaintext credentials (D1): password is masked.
  return {
    ...account,
    mt5Password: maskSecret(account.mt5AccountNumber),
  };
};

export const getPropAccount = async (id: string, userId: string) => {
  const account = await prisma.propAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    throw new Error("Prop firm account not found");
  }

  // Never return plaintext credentials (D1): password is masked.
  return {
    ...account,
    mt5Password: maskSecret(account.mt5AccountNumber),
  };
};

/**
 * INTERNAL ONLY - returns decrypted credentials for the EasierProp sync and
 * the audited admin reveal endpoint. Never expose through a client response.
 */
export const getPropAccountDecrypted = async (id: string, userId: string) => {
  const account = await prisma.propAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    throw new Error("Prop firm account not found");
  }

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
  // Whitelist updatable fields (never spread raw input) and encrypt secrets
  const dataToUpdate: Record<string, unknown> = {};
  for (const field of ["firmName", "mt5AccountNumber", "mt5Server", "ftmoCreditDetail", "ftmoAccountDetail", "ftmoUserName"] as const) {
    const value = updateData[field];
    if (typeof value === "string") dataToUpdate[field] = value;
  }
  if (updateData.phase === "CHALLENGE" || updateData.phase === "FUNDED") {
    dataToUpdate.phase = updateData.phase;
  }
  if (typeof updateData.isActive === "boolean") {
    dataToUpdate.isActive = updateData.isActive;
  }
  if (typeof updateData.mt5Password === "string" && updateData.mt5Password) {
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
  const account = await getPropAccountDecrypted(id, userId);
  
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
