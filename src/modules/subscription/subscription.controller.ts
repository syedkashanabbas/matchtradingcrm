import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createCardCheckout,
  createCryptoCheckout,
  getUserSubscription,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionPlans,
  listInvoices,
  createPortalSession,
} from "./subscription.service";
import { prisma } from "../../config/prisma";

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ success: false, error: { code, message } });

/**
 * POST /api/subscriptions/checkout { plan, method: "card" | "crypto", purpose? }
 * Card -> Stripe hosted checkout; Crypto -> CoinGate order (spec §6.2).
 */
export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { plan, method = "card", purpose } = req.body ?? {};

    if (!plan) {
      return fail(res, 400, "VALIDATION_ERROR", "Plan is required");
    }
    if (method !== "card" && method !== "crypto") {
      return fail(res, 400, "VALIDATION_ERROR", "method must be 'card' or 'crypto'");
    }

    if (method === "crypto") {
      const result = await createCryptoCheckout(
        userId,
        String(plan),
        purpose === "renewal" ? "renewal" : "subscription"
      );
      return res.json({ success: true, url: result.url, orderId: result.orderId, method: "crypto" });
    }

    const result = await createCardCheckout(userId, String(plan));
    res.json({ success: true, url: result.url, method: "card" });
  } catch (error: any) {
    console.error("Create checkout session error:", error);
    fail(res, 400, "CHECKOUT_FAILED", error.message);
  }
};

/** GET /api/subscriptions/current */
export const getCurrentSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const subscription = await getUserSubscription(req.user.userId);
    if (!subscription) {
      return fail(res, 404, "NO_SUBSCRIPTION", "No subscription found");
    }
    res.json({ success: true, data: subscription });
  } catch (error: any) {
    console.error("Get subscription error:", error);
    fail(res, 500, "SUBSCRIPTION_FETCH_FAILED", error.message);
  }
};

/** GET /api/subscriptions/invoices */
export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const invoices = await listInvoices(req.user.userId);
    res.json({ success: true, data: invoices });
  } catch (error: any) {
    console.error("List invoices error:", error);
    fail(res, 500, "INVOICES_FAILED", error.message);
  }
};

/** POST /api/subscriptions/portal - Stripe Customer Portal session */
export const createPortal = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createPortalSession(req.user.userId);
    res.json({ success: true, url: result.url });
  } catch (error: any) {
    console.error("Create portal error:", error);
    fail(res, 400, "PORTAL_FAILED", error.message);
  }
};

/** GET /api/subscriptions/crypto-orders/:id - outcome page polling */
export const getCryptoOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.cryptoOrder.findFirst({
      where: { id: req.params.id as string, userId: req.user.userId },
      select: {
        id: true,
        planCode: true,
        amount: true,
        currency: true,
        status: true,
        purpose: true,
        paymentUrl: true,
        createdAt: true,
      },
    });
    if (!order) {
      return fail(res, 404, "ORDER_NOT_FOUND", "Crypto order not found");
    }
    res.json({ success: true, data: order });
  } catch (error: any) {
    fail(res, 500, "ORDER_FETCH_FAILED", error.message);
  }
};

/** POST /api/subscriptions/cancel */
export const cancelUserSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { immediate } = req.body ?? {};
    const subscription = await cancelSubscription(req.user.userId, immediate);
    res.json({ success: true, data: subscription });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    fail(res, 400, "CANCEL_FAILED", error.message);
  }
};

/** POST /api/subscriptions/reactivate */
export const reactivateUserSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const subscription = await reactivateSubscription(req.user.userId);
    res.json({ success: true, data: subscription });
  } catch (error: any) {
    console.error("Reactivate subscription error:", error);
    fail(res, 400, "REACTIVATE_FAILED", error.message);
  }
};

/** GET /api/subscriptions/plans (public) */
export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = getSubscriptionPlans().map(plan => ({
      id: plan.code,
      code: plan.code,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      features: plan.features ?? [],
      popular: plan.popular ?? false,
    }));
    res.json({ success: true, data: plans });
  } catch (error: any) {
    console.error("Get plans error:", error);
    fail(res, 500, "PLANS_FAILED", error.message);
  }
};
