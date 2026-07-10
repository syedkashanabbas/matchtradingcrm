import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createBrokerOnboarding,
  createPropOnboarding,
  getOnboardingStatus,
} from "./onboarding.controller";

const router = Router();

// All onboarding endpoints require authentication.
// The payment step is completed by the billing webhooks (Stripe / CoinGate),
// not by a direct endpoint; the wizard starts checkout via /api/subscriptions.
router.use(authenticate);

router.get("/status", getOnboardingStatus);
router.post("/broker", createBrokerOnboarding);
router.post("/prop", createPropOnboarding);

export default router;
