import { prisma } from "../../config/prisma";
import { encryptData, decryptData, maskSecret } from "../../utils/encryption";
import { completeStep } from "../onboarding/onboarding.service";
import { enqueueServiceCommand } from "../provisioning/service-control.service";

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

    // Mark the broker onboarding step complete (recomputes user status)
    await completeStep(userId, "broker");

    // Post-provisioning addition: register the new broker on EasierProp (§5.4)
    const provision = await prisma.easierPropProvision.findUnique({ where: { userId } });
    if (provision?.status === "COMPLETED") {
      await enqueueServiceCommand(userId, "SYNC_BROKER_ADD", { brokerAccountId: brokerAccount.id }, userId);
    }

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

/**
 * Broker replacement (§5.4): archives the old broker, creates the new one and
 * enqueues the incremental EasierProp sync (register new + remove old +
 * update hedge setup).
 */
export const replaceBrokerAccount = async (
  userId: string,
  oldBrokerAccountId: string,
  data: {
    brokerName: string;
    mt5AccountNumber: string;
    mt5Password: string;
    mt5Server: string;
    brokerPortalPassword?: string;
  }
) => {
  const oldAccount = await prisma.brokerAccount.findFirst({
    where: { id: oldBrokerAccountId, userId, archivedAt: null },
  });
  if (!oldAccount) {
    throw new Error("Broker account to replace not found or already archived");
  }

  const newAccount = await prisma.brokerAccount.create({
    data: {
      userId,
      brokerName: data.brokerName,
      mt5AccountNumber: data.mt5AccountNumber,
      mt5Password: encryptData(data.mt5Password),
      mt5Server: data.mt5Server,
      brokerPortalPassword: data.brokerPortalPassword ? encryptData(data.brokerPortalPassword) : null,
      status: "active",
    },
  });

  await prisma.brokerAccount.update({
    where: { id: oldAccount.id },
    data: { status: "archived", archivedAt: new Date() },
  });

  const provision = await prisma.easierPropProvision.findUnique({ where: { userId } });
  if (provision?.status === "COMPLETED") {
    await enqueueServiceCommand(
      userId,
      "SYNC_BROKER_REPLACE",
      { newBrokerAccountId: newAccount.id, oldBrokerAccountId: oldAccount.id },
      userId
    );
  }

  return {
    id: newAccount.id,
    brokerName: newAccount.brokerName,
    mt5AccountNumber: newAccount.mt5AccountNumber,
    mt5Server: newAccount.mt5Server,
    status: newAccount.status,
    createdAt: newAccount.createdAt,
  };
};

/** Hedge-broker selector (§5.4): the client designates which broker the hedge uses. */
export const setHedgeBroker = async (userId: string, brokerAccountId: string, requestedBy: string) => {
  const broker = await prisma.brokerAccount.findFirst({
    where: { id: brokerAccountId, userId, archivedAt: null },
  });
  if (!broker) throw new Error("Broker account not found or archived");

  const command = await enqueueServiceCommand(userId, "SET_HEDGE_BROKER", { brokerAccountId }, requestedBy);
  return command;
};

export const getBrokerAccounts = async (userId: string) => {
  const brokerAccounts = await prisma.brokerAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Never return plaintext credentials (D1): passwords are masked.
  return brokerAccounts.map(account => ({
    ...account,
    mt5Password: maskSecret(account.mt5AccountNumber),
    brokerPortalPassword: account.brokerPortalPassword ? maskSecret(account.mt5AccountNumber) : null,
  }));
};

export const getBrokerAccount = async (id: string, userId: string) => {
  const account = await prisma.brokerAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    throw new Error("Broker account not found");
  }

  // Never return plaintext credentials (D1): passwords are masked.
  return {
    ...account,
    mt5Password: maskSecret(account.mt5AccountNumber),
    brokerPortalPassword: account.brokerPortalPassword ? maskSecret(account.mt5AccountNumber) : null,
  };
};

/**
 * INTERNAL ONLY - returns decrypted credentials for the EasierProp sync and
 * the audited admin reveal endpoint. Never expose through a client response.
 */
export const getBrokerAccountDecrypted = async (id: string, userId: string) => {
  const account = await prisma.brokerAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    throw new Error("Broker account not found");
  }

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
  // Whitelist updatable fields (never spread raw input) and encrypt secrets
  const dataToUpdate: Record<string, string> = {};
  for (const field of ["brokerName", "mt5AccountNumber", "mt5Server", "status"] as const) {
    const value = updateData[field];
    if (typeof value === "string") dataToUpdate[field] = value;
  }
  if (typeof updateData.mt5Password === "string" && updateData.mt5Password) {
    dataToUpdate.mt5Password = encryptData(updateData.mt5Password);
  }
  if (typeof updateData.brokerPortalPassword === "string" && updateData.brokerPortalPassword) {
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
  const account = await prisma.brokerAccount.findFirst({ where: { id, userId } });
  if (!account) {
    throw new Error("Broker account not found or you don't have permission to delete it");
  }
  if (account.epAccountId) {
    throw new Error("This broker is registered on EasierProp - use 'Replace credentials' instead of deleting");
  }

  await prisma.brokerAccount.delete({ where: { id: account.id } });

  return { message: "Broker account deleted successfully" };
};

export const validateBrokerAccount = async (id: string, userId: string) => {
  const account = await getBrokerAccountDecrypted(id, userId);
  
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


