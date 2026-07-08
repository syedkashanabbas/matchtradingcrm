import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createVpsOnboarding,
  createBrokerOnboarding,
  createPropOnboarding,
  createPlatformOnboarding,
  createSubscriptionOnboarding,
  getOnboardingStatus
} from "./onboarding.controller";

const router = Router();

// All onboarding endpoints require authentication
router.use(authenticate);

router.get('/status', getOnboardingStatus);
router.post('/vps', createVpsOnboarding);
router.post('/broker', createBrokerOnboarding);
router.post('/prop', createPropOnboarding);
router.post('/platform', createPlatformOnboarding);
router.post('/subscription', createSubscriptionOnboarding);

export default router;
