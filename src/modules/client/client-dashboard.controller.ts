import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { getClientDashboard, getSubscriptionInfo } from "./client-dashboard.service";

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const dashboard = await getClientDashboard(userId);

    res.json(dashboard);
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

export const getSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const subscription = await getSubscriptionInfo(userId);

    res.json(subscription);
  } catch (error: any) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
