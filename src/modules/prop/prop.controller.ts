import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createPropAccount,
  getPropAccounts,
  getActivePropAccount,
  getPropAccount,
  updatePropAccount,
  archivePropAccount,
  validatePropAccount,
  updatePropPhase,
  getPropStats,
  getSupportedPropFirms,
} from "./prop.service";

export const createProp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const propData = req.body;

    const prop = await createPropAccount(userId, propData);
    res.status(201).json(prop);
  } catch (error: any) {
    console.error("Create prop error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getPropList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { includeArchived } = req.query;

    const props = await getPropAccounts(userId, includeArchived === 'true');
    res.json(props);
  } catch (error: any) {
    console.error("Get prop list error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getActiveProp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const prop = await getActivePropAccount(userId);
    
    if (!prop) {
      return res.status(404).json({ message: "No active prop account found" });
    }
    
    res.json(prop);
  } catch (error: any) {
    console.error("Get active prop error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getProp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const prop = await getPropAccount(id as string, userId);
    res.json(prop);
  } catch (error: any) {
    console.error("Get prop error:", error);
    res.status(404).json({ message: error.message });
  }
};

export const updateProp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updateData = req.body;

    const prop = await updatePropAccount(id as string, userId, updateData);
    res.json(prop);
  } catch (error: any) {
    console.error("Update prop error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const archiveProp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await archivePropAccount(id as string, userId);
    res.json(result);
  } catch (error: any) {
    console.error("Archive prop error:", error);
    res.status(404).json({ message: error.message });
  }
};

export const validateProp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await validatePropAccount(id as string, userId);
    res.json(result);
  } catch (error: any) {
    console.error("Validate prop error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const updatePropAccountPhase = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { phase } = req.body;

    if (!phase) {
      return res.status(400).json({ message: "Phase is required" });
    }

    const prop = await updatePropPhase(id as string, userId, phase);
    res.json(prop);
  } catch (error: any) {
    console.error("Update prop phase error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getPropStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const stats = await getPropStats(userId);
    res.json(stats);
  } catch (error: any) {
    console.error("Get prop stats error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getSupportedPropFirmsList = async (req: Request, res: Response) => {
  try {
    const firms = getSupportedPropFirms();
    res.json(firms);
  } catch (error: any) {
    console.error("Get supported prop firms error:", error);
    res.status(500).json({ message: error.message });
  }
};
