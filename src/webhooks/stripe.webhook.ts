import { Request, Response } from "express";
import Stripe from "stripe";
import {
  activateSubscriptionFromPayment,
  handleSubscriptionPaymentFailed,
  handleSubscriptionDeleted,
} from "../modules/subscription/subscription.service";
import { createAuditEvent } from "../services/audit.service";
import { prisma } from "../config/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Stripe webhook (M3, spec §6.1): complete user state transitions.
 * Mounted with express.raw() so the signature can be verified.
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ success: false, error: { code: "MISSING_SIGNATURE", message: "Missing webhook signature" } });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ success: false, error: { code: "INVALID_SIGNATURE", message: err.message } });
  }

  console.log(`Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case "customer.subscription.created": {
        await handleSubscriptionCreatedOrRenewed(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted((event.data.object as Stripe.Subscription).id);
        break;
      }

      case "invoice.payment_succeeded": {
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (subscriptionId) {
          await handleSubscriptionPaymentFailed(subscriptionId);
        }
        break;
      }

      case "charge.refunded": {
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    await createAuditEvent({
      action: "WEBHOOK_PROCESSED",
      resource: "STRIPE",
      details: { eventType: event.type, eventId: event.id },
      severity: "LOW",
    });

    res.json({ received: true });
  } catch (error: any) {
    console.error(`Error handling webhook ${event.type}:`, error);
    await createAuditEvent({
      action: "WEBHOOK_ERROR",
      resource: "STRIPE",
      details: { eventType: event.type, eventId: event.id, error: error.message },
      severity: "HIGH",
    });
    res.status(500).json({ success: false, error: { code: "WEBHOOK_FAILED", message: "Webhook processing failed" } });
  }
};

// ------------------------------------------------------------------

const getSubscriptionPeriod = (subscription: Stripe.Subscription) => {
  const anySub = subscription as any;
  // Stripe moved period fields onto items in newer API versions; support both.
  const start = anySub.current_period_start ?? anySub.items?.data?.[0]?.current_period_start;
  const end = anySub.current_period_end ?? anySub.items?.data?.[0]?.current_period_end;
  return {
    periodStart: start ? new Date(start * 1000) : new Date(),
    periodEnd: end ? new Date(end * 1000) : new Date(Date.now() + 30 * 24 * 3600 * 1000),
  };
};

const getInvoiceSubscriptionId = (invoice: Stripe.Invoice): string | null => {
  const anyInvoice = invoice as any;
  const sub = anyInvoice.subscription ?? anyInvoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
};

const handleSubscriptionCreatedOrRenewed = async (subscription: Stripe.Subscription) => {
  const userId = subscription.metadata?.userId;
  const planCode = subscription.metadata?.plan;
  if (!userId || !planCode) {
    console.warn(`Subscription ${subscription.id} missing userId/plan metadata - skipping`);
    return;
  }

  const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);
  await activateSubscriptionFromPayment({
    userId,
    planCode,
    provider: "stripe",
    externalRef: subscription.id,
    periodStart,
    periodEnd,
    stripeCustomerId: subscription.customer as string,
  });
};

/**
 * Field sync only: subscription.updated fires for many non-payment changes
 * (cancel_at_period_end toggles, metadata edits). Activation side effects
 * (onboarding step, provisioning, service START, commissions) run exclusively
 * on subscription.created and invoice.payment_succeeded.
 */
const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  const record = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!record) return;

  const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);

  if (subscription.status === "past_due" || subscription.status === "unpaid") {
    await handleSubscriptionPaymentFailed(subscription.id);
  } else if (subscription.status === "active") {
    await prisma.subscription.update({
      where: { id: record.id },
      data: {
        status: "ACTIVE",
        plan: subscription.metadata?.plan ?? record.plan,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  await prisma.subscription.update({
    where: { id: record.id },
    data: { cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false },
  });
};

const handleInvoicePaymentSucceeded = async (invoice: Stripe.Invoice) => {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = stripeSubscription.metadata?.userId;
  const planCode = stripeSubscription.metadata?.plan;
  if (!userId || !planCode) {
    console.warn(`Invoice ${invoice.id}: subscription ${subscriptionId} missing metadata - skipping`);
    return;
  }

  const { periodStart, periodEnd } = getSubscriptionPeriod(stripeSubscription);
  await activateSubscriptionFromPayment({
    userId,
    planCode,
    provider: "stripe",
    externalRef: subscriptionId,
    periodStart,
    periodEnd,
    stripeCustomerId: stripeSubscription.customer as string,
  });

  // Commission engine (M4): one commission per upline ancestor, idempotent per invoice
  const { processPaymentCommissions } = await import("../modules/commission/commission.service");
  await processPaymentCommissions({
    userId,
    paymentRef: invoice.id ?? `invoice-${subscriptionId}`,
    provider: "stripe",
    amount: (invoice.amount_paid ?? 0) / 100,
    currency: (invoice.currency ?? "eur").toUpperCase(),
  });
};

const handleChargeRefunded = async (charge: Stripe.Charge) => {
  const isFullRefund = charge.amount_refunded >= charge.amount;

  await createAuditEvent({
    action: "CHARGE_REFUNDED",
    resource: "STRIPE",
    details: {
      chargeId: charge.id,
      refunded: charge.amount_refunded / 100,
      total: charge.amount / 100,
      full: isFullRefund,
    },
    severity: "HIGH",
  });

  const anyCharge = charge as any;
  const invoiceId = typeof anyCharge.invoice === "string" ? anyCharge.invoice : anyCharge.invoice?.id;
  if (!invoiceId) return;

  if (isFullRefund) {
    // Full refund: reverse all linked commissions (M4)
    const { reverseCommissionsForPayment } = await import("../modules/commission/commission.service");
    await reverseCommissionsForPayment(invoiceId);
  } else {
    // Partial refund: commissions are NOT auto-reversed - alert admins to
    // adjust manually (proportional reversal needs a human decision).
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await prisma.alert.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        type: "COMMISSION" as const,
        title: "Partial refund - review commissions",
        message: `Charge ${charge.id} (invoice ${invoiceId}) was partially refunded (${(charge.amount_refunded / 100).toFixed(2)} of ${(charge.amount / 100).toFixed(2)}). Linked commissions were NOT auto-reversed - review them manually.`,
        severity: "HIGH" as const,
      })),
    });
  }
};
