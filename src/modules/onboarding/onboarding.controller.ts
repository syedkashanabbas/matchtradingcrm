import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createOnboardingBroker,
  createOnboardingProp,
  getOnboardingStatus as getOnboardingStatusService,
} from "./onboarding.service";
import { onboardingBrokerSchema, onboardingPropSchema } from "./onboarding.validation";

export const createBrokerOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const parsed = onboardingBrokerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "),
        },
      });
    }

    const result = await createOnboardingBroker(userId, parsed.data);

    res.status(201).json({
      success: true,
      message: "Broker configuration saved successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Broker onboarding error:", error);
    res.status(400).json({ success: false, error: { code: "ONBOARDING_BROKER_FAILED", message: error.message } });
  }
};

export const createPropOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const parsed = onboardingPropSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "),
        },
      });
    }

    const result = await createOnboardingProp(userId, parsed.data);

    res.status(201).json({
      success: true,
      message: "Prop firm configuration saved successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Prop onboarding error:", error);
    res.status(400).json({ success: false, error: { code: "ONBOARDING_PROP_FAILED", message: error.message } });
  }
};

export const getOnboardingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const status = await getOnboardingStatusService(userId);

    res.json({ success: true, data: status });
  } catch (error: any) {
    console.error("Get onboarding status error:", error);
    res.status(500).json({ success: false, error: { code: "ONBOARDING_STATUS_FAILED", message: error.message } });
  }
};
