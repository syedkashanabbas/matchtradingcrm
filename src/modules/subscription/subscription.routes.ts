import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createCheckoutSession,
  getCurrentSubscription,
  cancelUserSubscription,
  reactivateUserSubscription,
  getPlans,
} from "./subscription.controller";

const router = Router();

// Get available plans (public) - no authentication required
router.get("/plans", getPlans);

// Apply authentication middleware to remaining routes
router.use(authenticate);

// Create checkout session
router.post("/checkout", createCheckoutSession);

// Get current subscription
router.get("/current", getCurrentSubscription);

// Cancel subscription
router.post("/cancel", cancelUserSubscription);

// Reactivate subscription
router.post("/reactivate", reactivateUserSubscription);

export default router;
