import { prisma } from "../../config/prisma";
import crypto from "crypto";

export const createEaConfig = async (configData: {
  version: string;
  config: object;
  schema: object;
  minEaVersion?: string;
  signature?: string;
}) => {
  // Check if version already exists
  const existingConfig = await prisma.eaConfig.findUnique({
    where: { version: configData.version },
  });

  if (existingConfig) {
    throw new Error("Configuration version already exists");
  }

  // Generate digital signature if not provided
  const signature = configData.signature || generateConfigSignature(configData.config);

  const config = await prisma.eaConfig.create({
    data: {
      version: configData.version,
      config: configData.config,
      schema: configData.schema,
      minEaVersion: configData.minEaVersion,
      signature,
      isActive: true,
    },
  });

  // Create history entry
  await prisma.configHistory.create({
    data: {
      configId: config.id,
      changes: {
        action: "CREATE",
        version: configData.version,
        config: configData.config,
      },
    },
  });

  return config;
};

export const getEaConfigs = async (includeInactive: boolean = false) => {
  const whereClause: any = {};
  
  if (!includeInactive) {
    whereClause.isActive = true;
  }

  return prisma.eaConfig.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });
};

export const getActiveEaConfig = async () => {
  return prisma.eaConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
};

export const getEaConfig = async (id: string) => {
  const config = await prisma.eaConfig.findUnique({
    where: { id },
    include: {
      history: {
        orderBy: { changedAt: "desc" },
      },
    },
  });

  if (!config) {
    throw new Error("Configuration not found");
  }

  return config;
};

export const getEaConfigByVersion = async (version: string) => {
  const config = await prisma.eaConfig.findUnique({
    where: { version },
  });

  if (!config) {
    throw new Error("Configuration version not found");
  }

  return config;
};

export const updateEaConfig = async (id: string, updateData: {
  config?: object;
  schema?: object;
  minEaVersion?: string;
  isActive?: boolean;
}, changedBy?: string) => {
  const existingConfig = await prisma.eaConfig.findUnique({
    where: { id },
  });

  if (!existingConfig) {
    throw new Error("Configuration not found");
  }

  // Store changes for history
  const changes: any = {
    action: "UPDATE",
    previousVersion: existingConfig.version,
  };

  // Update signature if config changed
  const dataToUpdate: any = { ...updateData };
  if (updateData.config) {
    dataToUpdate.signature = generateConfigSignature(updateData.config);
    changes.configUpdate = true;
  }

  if (updateData.schema) {
    changes.schemaUpdate = true;
  }

  if (updateData.minEaVersion) {
    changes.minEaVersionUpdate = true;
  }

  if (updateData.isActive !== undefined) {
    changes.statusUpdate = true;
    changes.previousStatus = existingConfig.isActive;
    changes.newStatus = updateData.isActive;
  }

  // Update configuration
  const config = await prisma.eaConfig.update({
    where: { id },
    data: dataToUpdate,
  });

  // Create history entry
  await prisma.configHistory.create({
    data: {
      configId: config.id,
      changes,
      changedBy,
    },
  });

  return config;
};

export const deleteEaConfig = async (id: string, changedBy?: string) => {
  const existingConfig = await prisma.eaConfig.findUnique({
    where: { id },
  });

  if (!existingConfig) {
    throw new Error("Configuration not found");
  }

  // Create history entry before deletion
  await prisma.configHistory.create({
    data: {
      configId: existingConfig.id,
      changes: {
        action: "DELETE",
        version: existingConfig.version,
        config: existingConfig.config,
      },
      changedBy,
    },
  });

  // Delete configuration
  await prisma.eaConfig.delete({
    where: { id },
  });

  return { message: "Configuration deleted successfully" };
};

export const activateEaConfig = async (id: string, changedBy?: string) => {
  // Deactivate all other configs
  await prisma.eaConfig.updateMany({
    where: {
      id: { not: id },
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  // Activate the specified config
  const config = await prisma.eaConfig.update({
    where: { id },
    data: {
      isActive: true,
    },
  });

  // Create history entry
  await prisma.configHistory.create({
    data: {
      configId: config.id,
      changes: {
        action: "ACTIVATE",
        version: config.version,
      },
      changedBy,
    },
  });

  return config;
};

export const validateConfigAgainstSchema = async (config: object, schema: object): Promise<boolean> => {
  // This is a simplified validation - in production, you'd use a proper JSON schema validator
  try {
    // Basic validation logic
    const configKeys = Object.keys(config);
    const schemaKeys = Object.keys(schema);

    // Check if all required keys are present
    for (const key of schemaKeys) {
      const schemaField = (schema as any)[key];
      if (schemaField.required && !configKeys.includes(key)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const getConfigHistory = async (configId: string) => {
  return prisma.configHistory.findMany({
    where: { configId },
    orderBy: { changedAt: "desc" },
  });
};

export const generateConfigSignature = (config: object): string => {
  const configString = JSON.stringify(config, Object.keys(config).sort());
  return crypto.createHash('sha256').update(configString).digest('hex');
};

export const verifyConfigSignature = async (configId: string): Promise<boolean> => {
  const config = await prisma.eaConfig.findUnique({
    where: { id: configId },
  });

  if (!config || !config.signature) {
    return false;
  }

  const expectedSignature = generateConfigSignature(config.config as any);
  return expectedSignature === config.signature;
};

export const getDefaultEaConfig = () => {
  return {
    version: "1.0.0",
    config: {
      trading: {
        maxDrawdown: 10,
        riskPerTrade: 2,
        maxPositions: 5,
        stopLoss: 50,
        takeProfit: 100,
      },
      filters: {
        newsFilter: true,
        weekendFilter: false,
        volatilityFilter: true,
        maxSpread: 3,
      },
      timing: {
        tradingHours: {
          start: "00:00",
          end: "23:59",
        },
        weekdays: [1, 2, 3, 4, 5],
      },
      notifications: {
        tradeAlerts: true,
        errorAlerts: true,
        dailyReport: true,
      },
    },
    schema: {
      trading: {
        maxDrawdown: { type: "number", required: true, min: 1, max: 100 },
        riskPerTrade: { type: "number", required: true, min: 0.1, max: 10 },
        maxPositions: { type: "number", required: true, min: 1, max: 20 },
        stopLoss: { type: "number", required: true, min: 10, max: 500 },
        takeProfit: { type: "number", required: true, min: 10, max: 1000 },
      },
      filters: {
        newsFilter: { type: "boolean", required: true },
        weekendFilter: { type: "boolean", required: true },
        volatilityFilter: { type: "boolean", required: true },
        maxSpread: { type: "number", required: true, min: 0, max: 10 },
      },
      timing: {
        tradingHours: {
          start: { type: "string", required: true, pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" },
          end: { type: "string", required: true, pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" },
        },
        weekdays: { type: "array", required: true, items: { type: "number", min: 1, max: 5 } },
      },
      notifications: {
        tradeAlerts: { type: "boolean", required: true },
        errorAlerts: { type: "boolean", required: true },
        dailyReport: { type: "boolean", required: true },
      },
    },
    minEaVersion: "1.0.0",
  };
};
