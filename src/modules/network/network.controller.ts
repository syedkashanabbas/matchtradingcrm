import { Request, Response } from 'express';
import { NetworkService } from './network.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const networkService = new NetworkService(prisma);

export const getMyReferralLink = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await networkService.getMyReferralLink(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyTree = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await networkService.getMyTree(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDirectReferrals = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await networkService.getDirectReferrals(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getNetworkStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await networkService.getNetworkStats(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const result = await networkService.getLeaderboard();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getActivityFeed = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await networkService.getActivityFeed(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getInviterInfo = async (req: Request, res: Response) => {
  try {
    const { refCode } = req.params as { refCode: string };
    const result = await networkService.getInviterByReferralCode(refCode);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
