import { prisma } from "../../config/prisma";
import { stripe } from "../../config/stripe";
import { env } from "../../config/env-validation";
import { SubscriptionStatus, ClientStatus } from "@prisma/client";
import { completeStep } from "../onboarding/onboarding.service";
import { maybeTriggerProvisioning } from "../provisioning/provisioning.service";
import { enqueueServiceCommand } from "../provisioning/service-control.service";
import { getPlanCatalog, getPlanByCode, Plan } from "./plan-catalog";
import * as coingate from "../../integrations/coingate/client";
import { generateSecureToken } from "../../utils/encryption";

const GRACE_PERIOD_DAYS = parseInt(process.env.GRACE_PERIOD_DAYS || "7", 10);

// ------------------------------------------------------------------
// Catalog
// ------------------------------------------------------------------

export const getSubscriptionPlans = (): Plan[] => getPlanCatalog();

// ------------------------------------------------------------------
// Checkout (card via Stripe, crypto via CoinGate)
// ------------------------------------------------------------------

export const createCardCheckout = async (userId: string, planCode: string) => {
  const plan = getPlanByCode(planCode);
  if (!plan) throw new Error(`Unknown plan: ${planCode}`);
  if (!plan.stripePriceId) throw new Error(`Plan ${plan.code} has no Stripe price configured`);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Guard against double billing: one recurring Stripe subscription per user.
  // Plan changes for card subscribers go through the Customer Portal.
  const existingStripe = await prisma.subscription.findFirst({
    where: {
      userId,
      provider: "stripe",
      status: { in: ["ACTIVE", "PAST_DUE"] },
      stripeSubscriptionId: { not: null },
      currentPeriodEnd: { gt: new Date() },
    },
  });
  if (existingStripe) {
    throw new Error(
      "You already have an active card subscription - manage or change your plan from the Customer Portal"
    );
  }

  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${env.CLIENT_URL}/dashboard/client/onboarding/review?success=true`,
    cancel_url: `${env.CLIENT_URL}/dashboard/client/onboarding/payment?canceled=true`,
    metadata: { userId, plan: plan.code },
    subscription_data: { metadata: { userId, plan: plan.code } },
  });

  return { url: session.url };
};

export const createCryptoCheckout = async (
  userId: string,
  planCode: string,
  purpose: "subscription" | "renewal" = "subscription"
) => {
  const plan = getPlanByCode(planCode);
  if (!plan) throw new Error(`Unknown plan: ${planCode}`);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const localOrderId = `eidos-${purpose}-${generateSecureToken(8)}`;
  const ipnToken = generateSecureToken(24);

  const record = await prisma.cryptoOrder.create({
    data: {
      userId,
      planCode: plan.code,
      localOrderId,
      ipnToken,
      amount: plan.price,
      currency: plan.currency,
      purpose,
    },
  });

  const serverUrl = process.env.SERVER_URL || `http://localhost:${env.PORT}`;
  const order = await coingate.createOrder({
    localOrderId,
    amount: plan.price,
    currency: plan.currency,
    title: `EIDOS ${plan.name} - ${purpose === "renewal" ? "renewal" : "subscription"}`,
    description: `${plan.name} plan (${plan.price} ${plan.currency}/${plan.interval})`,
    callbackUrl: `${serverUrl}/webhooks/coingate`,
    successUrl: `${env.CLIENT_URL}/dashboard/client/onboarding/payment/result?order=${record.id}`,
    cancelUrl: `${env.CLIENT_URL}/dashboard/client/onboarding/payment?canceled=true`,
    ipnToken,
  });

  await prisma.cryptoOrder.update({
    where: { id: record.id },
    data: {
      coingateOrderId: String(order.id),
      status: order.status ?? "new",
      paymentUrl: order.payment_url ?? null,
    },
  });

  return { url: order.payment_url, orderId: record.id };
};

// ------------------------------------------------------------------
// Activation - shared by the Stripe webhook and the CoinGate IPN
// ------------------------------------------------------------------

export interface PaymentActivation {
  userId: string;
  planCode: string;
  provider: "stripe" | "coingate";
  /** stripe subscription id or coingate order id */
  externalRef: string;
  periodStart: Date;
  periodEnd: Date;
  stripeCustomerId?: string;
}

/**
 * Creates or renews the user's subscription after a confirmed payment.
 * Same state transitions for both providers (spec §6.2 flow step 3).
 */
export const activateSubscriptionFromPayment = async (activation: PaymentActivation) => {
  const existing =
    activation.provider === "stripe"
      ? await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: activation.externalRef },
        })
      : await prisma.subscription.findFirst({
          where: { userId: activation.userId, provider: "coingate" },
          orderBy: { createdAt: "desc" },
        });

  let subscription;
  if (existing) {
    subscription = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        plan: activation.planCode,
        currentPeriodStart: activation.periodStart,
        currentPeriodEnd: activation.periodEnd,
        gracePeriodEnd: null,
        ...(activation.provider === "coingate" ? { externalOrderId: activation.externalRef } : {}),
      },
    });
  } else {
    subscription = await prisma.subscription.create({
      data: {
        userId: activation.userId,
        provider: activation.provider,
        plan: activation.planCode,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: activation.periodStart,
        currentPeriodEnd: activation.periodEnd,
        ...(activation.provider === "stripe"
          ? {
              stripeSubscriptionId: activation.externalRef,
              stripeCustomerId: activation.stripeCustomerId,
            }
          : { externalOrderId: activation.externalRef }),
      },
    });
  }

  await prisma.user.update({
    where: { id: activation.userId },
    data: {
      status: ClientStatus.ACTIVE,
      subscriptionEnd: activation.periodEnd,
      gracePeriodEnd: null,
    },
  });

  // Onboarding payment step + provisioning trigger + service reactivation
  await completeStep(activation.userId, "payment");
  await maybeTriggerProvisioning(activation.userId);
  await reactivateServiceIfPaused(activation.userId);

  return subscription;
};

// ------------------------------------------------------------------
// Failure / cancellation transitions
// ------------------------------------------------------------------

/** Payment failed -> PAST_DUE + grace period + notifications + service Stop (§6.1/§5.5). */
export const handleSubscriptionPaymentFailed = async (stripeSubscriptionId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });
  if (!subscription) {
    console.warn(`Payment failed for unknown subscription ${stripeSubscriptionId}`);
    return null;
  }

  return applyPaymentFailure(subscription.id);
};

export const applyPaymentFailure = async (subscriptionId: string) => {
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: SubscriptionStatus.PAST_DUE, gracePeriodEnd },
  });

  await prisma.user.update({
    where: { id: subscription.userId },
    data: { status: ClientStatus.SUSPENDED, gracePeriodEnd },
  });

  await createAlert(
    subscription.userId,
    "PAYMENT_FAILURE",
    "Payment Failed",
    `Your subscription payment has failed. You have ${GRACE_PERIOD_DAYS} days to update your payment method before the service is suspended permanently.`,
    "HIGH"
  );

  await suspendServiceIfActive(subscription.userId);

  return subscription;
};

export const handleSubscriptionDeleted = async (stripeSubscriptionId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });
  if (!subscription) throw new Error("Subscription not found");

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: SubscriptionStatus.CANCELED },
  });

  await prisma.user.update({
    where: { id: subscription.userId },
    data: { status: ClientStatus.INACTIVE },
  });

  await createAlert(
    subscription.userId,
    "SUBSCRIPTION_EXPIRED",
    "Subscription Canceled",
    "Your subscription has been canceled and your service has been deactivated.",
    "CRITICAL"
  );

  // Suspend now; permanent EasierProp deletion needs admin confirmation (§5.5)
  await suspendServiceIfActive(subscription.userId);
  await notifyAdminsOfCancellation(subscription.userId);

  return subscription;
};

// ------------------------------------------------------------------
// Reads
// ------------------------------------------------------------------

export const getUserSubscription = async (userId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) return null;

  const plan = getPlanByCode(subscription.plan);
  return {
    ...subscription,
    planName: plan?.name ?? subscription.plan,
    price: plan ? `${plan.price} ${plan.currency}/${plan.interval}` : null,
  };
};

/** Client invoices: Stripe invoices + CoinGate orders, newest first (§6.1). */
export const listInvoices = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const invoices: Array<{
    id: string;
    provider: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    url: string | null;
  }> = [];

  if (user.stripeCustomerId) {
    try {
      const stripeInvoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 24,
      });
      for (const invoice of stripeInvoices.data) {
        invoices.push({
          id: invoice.number ?? invoice.id ?? "unknown",
          provider: "stripe",
          amount: (invoice.amount_paid || invoice.amount_due) / 100,
          currency: (invoice.currency ?? "eur").toUpperCase(),
          status: invoice.status ?? "unknown",
          date: new Date(invoice.created * 1000).toISOString(),
          url: invoice.hosted_invoice_url ?? null,
        });
      }
    } catch (error: any) {
      console.error("Failed to list Stripe invoices:", error.message);
    }
  }

  const cryptoOrders = await prisma.cryptoOrder.findMany({
    where: { userId, status: { in: ["paid", "confirming", "pending"] } },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
  for (const order of cryptoOrders) {
    invoices.push({
      id: order.localOrderId,
      provider: "coingate",
      amount: Number(order.amount),
      currency: order.currency,
      status: order.status,
      date: order.createdAt.toISOString(),
      url: null,
    });
  }

  invoices.sort((a, b) => (a.date < b.date ? 1 : -1));
  return invoices;
};

/** Stripe Customer Portal session (§6.1). */
export const createPortalSession = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) {
    throw new Error("No Stripe customer for this user (card payments only)");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${env.CLIENT_URL}/dashboard/settings/subscription`,
  });

  return { url: session.url };
};

// ------------------------------------------------------------------
// Cancel / reactivate
// ------------------------------------------------------------------

export const cancelSubscription = async (userId: string, immediate: boolean = false) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) throw new Error("No active subscription found");

  if (subscription.provider === "stripe" && subscription.stripeSubscriptionId) {
    if (immediate) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } else {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }
  // Crypto has no recurring charge: cancelling just means "don't renew".

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });

  return subscription;
};

export const reactivateSubscription = async (userId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) throw new Error("No subscription found");

  if (subscription.provider === "stripe" && subscription.stripeSubscriptionId) {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: false },
  });

  return updated;
};

// ------------------------------------------------------------------
// Service-state helpers (M2 wiring)
// ------------------------------------------------------------------

export const suspendServiceIfActive = async (userId: string) => {
  const hedge = await prisma.hedgeSetup.findFirst({ where: { userId, status: "active" } });
  if (hedge) {
    await enqueueServiceCommand(userId, "STOP", {}, "system:subscription");
  }
};

export const reactivateServiceIfPaused = async (userId: string) => {
  // Cancel any STOP still waiting in the queue - the payment that just landed
  // supersedes it (prevents a stale STOP from suspending a paying user).
  const cancelled = await prisma.serviceCommand.updateMany({
    where: { userId, type: "STOP", status: "PENDING" },
    data: { status: "FAILED", lastError: "cancelled: subscription reactivated before execution" },
  });

  const hedge = await prisma.hedgeSetup.findFirst({ where: { userId, status: "paused" } });
  if (hedge || cancelled.count > 0) {
    await enqueueServiceCommand(userId, "START", {}, "system:subscription");
  }
};

const notifyAdminsOfCancellation = async (userId: string) => {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await prisma.alert.createMany({
    data: admins.map(admin => ({
      userId: admin.id,
      type: "SERVICE_STATE" as const,
      title: "Subscription cancelled - confirm service deletion",
      message: `Subscription for user ${userId} was permanently cancelled. The service was suspended; confirm permanent EasierProp deletion from the client detail page.`,
      severity: "HIGH" as const,
    })),
  });
};

const createAlert = async (
  userId: string,
  type: "PAYMENT_FAILURE" | "SUBSCRIPTION_EXPIRED",
  title: string,
  message: string,
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
) => {
  return prisma.alert.create({
    data: { userId, type, title, message, severity },
  });
};
