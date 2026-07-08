import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { 
  createOnboardingVps, 
  createOnboardingBroker, 
  createOnboardingProp, 
  createOnboardingSubscription,
  getOnboardingProgress,
  updateOnboardingProgress 
} from "./onboarding.service";

export const createVpsOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const vpsData = req.body;

    const result = await createOnboardingVps(userId, vpsData);
    
    // Update progress
    await updateOnboardingProgress(userId, 'vps_ready');
    
    res.status(201).json({
      message: "VPS configuration saved successfully",
      data: result,
      progress: 'vps_ready'
    });
  } catch (error: any) {
    console.error("VPS onboarding error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const createBrokerOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const brokerData = req.body;

    const result = await createOnboardingBroker(userId, brokerData);
    
    // Update progress
    await updateOnboardingProgress(userId, 'broker_ready');
    
    res.status(201).json({
      message: "Broker configuration saved successfully",
      data: result,
      progress: 'broker_ready'
    });
  } catch (error: any) {
    console.error("Broker onboarding error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const createPropOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const propData = req.body;

    const result = await createOnboardingProp(userId, propData);
    
    // Update progress
    await updateOnboardingProgress(userId, 'prop_ready');
    
    res.status(201).json({
      message: "Prop firm configuration saved successfully",
      data: result,
      progress: 'prop_ready'
    });
  } catch (error: any) {
    console.error("Prop onboarding error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const createPlatformOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const platformData = req.body;

    const result = await createOnboardingSubscription(userId, platformData);
    
    // Update progress
    await updateOnboardingProgress(userId, 'platform_ready');
    
    res.status(201).json({
      message: "Platform configuration saved successfully",
      data: result,
      progress: 'platform_ready'
    });
  } catch (error: any) {
    console.error("Platform onboarding error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const createSubscriptionOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const subscriptionData = req.body;

    const result = await createOnboardingSubscription(userId, subscriptionData);
    
    // Update progress to "review" for admin approval
    await updateOnboardingProgress(userId, 'review');
    
    res.status(201).json({
      message: "Subscription configuration saved successfully",
      data: result,
      progress: 'review'
    });
  } catch (error: any) {
    console.error("Subscription onboarding error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getOnboardingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const progress = await getOnboardingProgress(userId);
    
    res.json({
      progress: progress || 'not_started',
      message: "Onboarding status retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get onboarding status error:", error);
    res.status(500).json({ message: error.message });
  }
};
