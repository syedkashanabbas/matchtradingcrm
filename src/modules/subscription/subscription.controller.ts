import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createSubscription,
  getUserSubscription,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionPlans,
  createFreeSubscription,
} from "./subscription.service";
import { updateOnboardingProgress } from "../onboarding/onboarding.service";

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body;
    const userId = req.user.userId;

    if (!plan) {
      return res.status(400).json({ message: "Plan is required" });
    }

    // Convert plan to uppercase to match service expectations
    const normalizedPlan = plan.toUpperCase();
    
    // Validate plan
    if (!['FREE', 'PRO', 'ENTERPRISE'].includes(normalizedPlan)) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    // For free plan, activate immediately without Stripe
    if (normalizedPlan === 'FREE') {
      const subscription = await createFreeSubscription(userId);
      // Update onboarding progress to subscribed
      await updateOnboardingProgress(userId, 'subscribed');
      res.json({
        url: null,
        message: 'Free plan activated',
        subscription
      });
      return;
    }

    // For paid plans, create Stripe session
    const session = await createSubscription(userId, normalizedPlan as any);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Create checkout session error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getCurrentSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return res.status(404).json({ message: "No subscription found" });
    }

    res.json(subscription);
  } catch (error: any) {
    console.error("Get subscription error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const cancelUserSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { immediate } = req.body;

    const subscription = await cancelSubscription(userId, immediate);
    res.json(subscription);
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const reactivateUserSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const subscription = await reactivateSubscription(userId);
    res.json(subscription);
  } catch (error: any) {
    console.error("Reactivate subscription error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = getSubscriptionPlans();
    res.json(plans);
  } catch (error: any) {
    console.error("Get plans error:", error);
    res.status(500).json({ message: error.message });
  }
};
