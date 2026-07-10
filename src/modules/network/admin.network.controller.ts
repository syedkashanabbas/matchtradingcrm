import { Request, Response } from 'express';
import { AdminNetworkService } from './admin.network.service';
import { PrismaClient } from '@prisma/client';
import { assignUplineSchema, changeUplineSchema } from '../../validators/network.validator';

const prisma = new PrismaClient();
const adminNetworkService = new AdminNetworkService(prisma);

export const getMemberships = async (req: Request, res: Response) => {
  try {
    const data = await adminNetworkService.getMemberships();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'MEMBERSHIPS_FAILED', message: error.message } });
  }
};

export const getOverview = async (req: Request, res: Response) => {
  try {
    const result = await adminNetworkService.getOverview();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserNetworkInfo = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (typeof userId !== 'string') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const result = await adminNetworkService.getUserNetworkInfo(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserTree = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (typeof userId !== 'string') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const result = await adminNetworkService.getUserTree(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrphans = async (req: Request, res: Response) => {
  try {
    const result = await adminNetworkService.getOrphans();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const assignUpline = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (typeof userId !== 'string') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const { uplineUserId } = assignUplineSchema.parse(req.body);
    const adminId = (req as any).user.userId;
    
    const result = await adminNetworkService.assignUpline(userId, uplineUserId, adminId);
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getAllClientNetworks = async (req: Request, res: Response) => {
  try {
    const result = await adminNetworkService.getAllClientNetworks();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const changeUpline = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (typeof userId !== 'string') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const { newUplineUserId } = changeUplineSchema.parse(req.body);
    const adminId = (req as any).user.userId;
    
    const result = await adminNetworkService.changeUpline(userId, newUplineUserId, adminId);
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};
