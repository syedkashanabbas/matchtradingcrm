import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createCheckoutSession,
  getCurrentSubscription,
  getInvoices,
  createPortal,
  getCryptoOrder,
  cancelUserSubscription,
  reactivateUserSubscription,
  getPlans,
} from "./subscription.controller";

const router = Router();

// Get available plans (public) - no authentication required
router.get("/plans", getPlans);

// Apply authentication middleware to remaining routes
router.use(authenticate);

// Create checkout session (card via Stripe, crypto via CoinGate)
router.post("/checkout", createCheckoutSession);

// Current subscription
router.get("/current", getCurrentSubscription);

// Invoice history (Stripe + crypto orders)
router.get("/invoices", getInvoices);

// Stripe Customer Portal
router.post("/portal", createPortal);

// Crypto order status (outcome page polling)
router.get("/crypto-orders/:id", getCryptoOrder);

// Cancel / reactivate
router.post("/cancel", cancelUserSubscription);
router.post("/reactivate", reactivateUserSubscription);

export default router;
