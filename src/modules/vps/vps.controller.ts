import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createVpsConfig,
  getVpsConfigs,
  getVpsConfig,
  updateVpsConfig,
  deleteVpsConfig,
  testVpsConnection,
  getVpsStats,
} from "./vps.service";

export const createVps = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const vpsData = req.body;

    const vps = await createVpsConfig(userId, vpsData);
    res.status(201).json(vps);
  } catch (error: any) {
    console.error("Create VPS error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getVpsList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const vpsConfigs = await getVpsConfigs(userId);
    res.json(vpsConfigs);
  } catch (error: any) {
    console.error("Get VPS list error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getVps = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const vps = await getVpsConfig(id as string, userId);
    res.json(vps);
  } catch (error: any) {
    console.error("Get VPS error:", error);
    res.status(404).json({ message: error.message });
  }
};

export const updateVps = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updateData = req.body;

    const vps = await updateVpsConfig(id as string, userId, updateData);
    res.json(vps);
  } catch (error: any) {
    console.error("Update VPS error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteVps = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await deleteVpsConfig(id as string, userId);
    res.json(result);
  } catch (error: any) {
    console.error("Delete VPS error:", error);
    res.status(404).json({ message: error.message });
  }
};

export const testVps = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await testVpsConnection(id as string, userId);
    res.json(result);
  } catch (error: any) {
    console.error("Test VPS error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getVpsStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const stats = await getVpsStats(userId);
    res.json(stats);
  } catch (error: any) {
    console.error("Get VPS stats error:", error);
    res.status(500).json({ message: error.message });
  }
};
