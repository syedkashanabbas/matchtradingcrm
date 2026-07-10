import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { secureCompare } from "../utils/encryption";
import { createAuditEvent } from "../services/audit.service";
import { activateSubscriptionFromPayment } from "../modules/subscription/subscription.service";
import { getPlanByCode } from "../modules/subscription/plan-catalog";
import { SubscriptionStatus } from "@prisma/client";

/**
 * CoinGate IPN callback (M3, spec §6.2).
 * CoinGate POSTs order state changes (paid, confirmed, expired, invalid...).
 * Verification: the per-order `token` we generated at order creation must be
 * echoed back; a mismatch is rejected (forged IPN).
 */
export const handleCoinGateIpn = async (req: Request, res: Response) => {
  const payload = req.body ?? {};
  const localOrderId: string | undefined = payload.order_id;
  const token: string | undefined = payload.token;
  const status: string | undefined = payload.status;

  if (!localOrderId || !token || !status) {
    return res.status(400).json({ success: false, error: { code: "INVALID_IPN", message: "Missing order_id, token or status" } });
  }

  const order = await prisma.cryptoOrder.findUnique({ where: { localOrderId } });
  if (!order) {
    return res.status(404).json({ success: false, error: { code: "ORDER_NOT_FOUND", message: "Unknown order" } });
  }

  // Token verification - reject forged IPNs (M3 acceptance criterion)
  if (!secureCompare(order.ipnToken, token)) {
    await createAuditEvent({
      action: "COINGATE_IPN_REJECTED",
      resource: "COINGATE",
      details: { localOrderId, reason: "token mismatch", ip: req.ip },
      severity: "HIGH",
    });
    return res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "IPN token mismatch" } });
  }

  const history = Array.isArray(order.ipnHistory) ? (order.ipnHistory as any[]) : [];
  history.push({ status, receivedAt: new Date().toISOString(), payload: { ...payload, token: undefined } });

  const isPaidStatus = status === "paid" || status === "confirmed";

  // Atomic claim: only ONE concurrent 'paid' IPN can move the order out of a
  // non-paid state; duplicates and late non-paid statuses never downgrade it.
  const claim = await prisma.cryptoOrder.updateMany({
    where: {
      id: order.id,
      status: { notIn: ["paid", "confirmed"] },
    },
    data: {
      status,
      ipnHistory: history as any,
      coingateOrderId: order.coingateOrderId ?? (payload.id ? String(payload.id) : null),
    },
  });
  const wonPaidClaim = isPaidStatus && claim.count === 1;

  await createAuditEvent({
    action: "COINGATE_IPN_PROCESSED",
    resource: "COINGATE",
    details: { localOrderId, status },
    severity: "LOW",
  });

  // Activation on paid (idempotent: the atomic claim above guarantees a
  // repeated/concurrent 'paid' IPN activates once; the commission engine is
  // additionally idempotent per paymentRef)
  if (wonPaidClaim) {
    const plan = getPlanByCode(order.planCode);
    const intervalDays = plan?.interval === "year" ? 365 : 30;

    // Renewals extend from the current period end when still in the future
    const existing = await prisma.subscription.findFirst({
      where: { userId: order.userId, provider: "coingate" },
      orderBy: { createdAt: "desc" },
    });
    const base =
      existing && existing.currentPeriodEnd > new Date() && existing.status === SubscriptionStatus.ACTIVE
        ? existing.currentPeriodEnd
        : new Date();
    const periodEnd = new Date(base.getTime() + intervalDays * 24 * 3600 * 1000);

    await activateSubscriptionFromPayment({
      userId: order.userId,
      planCode: order.planCode,
      provider: "coingate",
      externalRef: order.coingateOrderId ?? order.localOrderId,
      periodStart: new Date(),
      periodEnd,
    });

    // Commission engine (M4) - idempotent per paymentRef
    const { processPaymentCommissions } = await import("../modules/commission/commission.service");
    await processPaymentCommissions({
      userId: order.userId,
      paymentRef: order.localOrderId,
      provider: "coingate",
      amount: Number(order.amount),
      currency: order.currency,
    });
  }

  if (status === "refunded") {
    const { reverseCommissionsForPayment } = await import("../modules/commission/commission.service");
    await reverseCommissionsForPayment(order.localOrderId);
  }

  res.json({ received: true });
};
