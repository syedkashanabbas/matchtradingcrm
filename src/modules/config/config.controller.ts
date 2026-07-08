import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createEaConfig,
  getEaConfigs,
  getActiveEaConfig,
  getEaConfig,
  updateEaConfig,
  deleteEaConfig,
  activateEaConfig,
  getConfigHistory,
  validateConfigAgainstSchema,
  verifyConfigSignature,
  getDefaultEaConfig,
} from "./config.service";

export const createConfig = async (req: AuthRequest, res: Response) => {
  try {
    const configData = req.body;
    const userId = req.user.userId;

    // Validate config against schema
    if (configData.schema) {
      const isValid = await validateConfigAgainstSchema(configData.config, configData.schema);
      if (!isValid) {
        return res.status(400).json({ message: "Configuration does not match the provided schema" });
      }
    }

    const config = await createEaConfig(configData);
    res.status(201).json(config);
  } catch (error: any) {
    console.error("Create config error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getConfigs = async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;
    const configs = await getEaConfigs(includeInactive === 'true');
    res.json(configs);
  } catch (error: any) {
    console.error("Get configs error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getActiveConfig = async (req: Request, res: Response) => {
  try {
    const config = await getActiveEaConfig();
    
    if (!config) {
      return res.status(404).json({ message: "No active configuration found" });
    }
    
    res.json(config);
  } catch (error: any) {
    console.error("Get active config error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await getEaConfig(id as string);
    res.json(config);
  } catch (error: any) {
    console.error("Get config error:", error);
    res.status(404).json({ message: error.message });
  }
};

export const updateConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.userId;

    // Validate config against schema if both are provided
    if (updateData.config && updateData.schema) {
      const isValid = await validateConfigAgainstSchema(updateData.config, updateData.schema);
      if (!isValid) {
        return res.status(400).json({ message: "Configuration does not match the provided schema" });
      }
    }

    const config = await updateEaConfig(id as string, updateData, userId);
    res.json(config);
  } catch (error: any) {
    console.error("Update config error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await deleteEaConfig(id as string, userId);
    res.json(result);
  } catch (error: any) {
    console.error("Delete config error:", error);
    res.status(404).json({ message: error.message });
  }
};

export const activateConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const config = await activateEaConfig(id as string, userId);
    res.json(config);
  } catch (error: any) {
    console.error("Activate config error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getConfigVersionHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await getConfigHistory(id as string);
    res.json(history);
  } catch (error: any) {
    console.error("Get config history error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const verifyConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isValid = await verifyConfigSignature(id as string);
    res.json({ valid: isValid });
  } catch (error: any) {
    console.error("Verify config error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getDefaultConfig = async (req: Request, res: Response) => {
  try {
    const config = getDefaultEaConfig();
    res.json(config);
  } catch (error: any) {
    console.error("Get default config error:", error);
    res.status(500).json({ message: error.message });
  }
};
