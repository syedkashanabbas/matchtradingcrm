import cron from "node-cron";
import { prisma } from "../config/prisma";
import { suspendServiceIfActive, applyPaymentFailure } from "../modules/subscription/subscription.service";
import { SubscriptionStatus, ClientStatus } from "@prisma/client";

/**
 * Daily subscription lifecycle cron (spec §6.1/§6.2):
 * 1. ACTIVE subscriptions past their period end -> PAST_DUE + grace period
 *    (covers crypto, where no webhook fires at expiry).
 * 2. PAST_DUE subscriptions past their grace period -> UNPAID; user INACTIVE
 *    and service suspended.
 */
export const startSubscriptionCron = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Running subscription check...");
    try {
      await processSubscriptionLifecycle();
    } catch (error) {
      console.error("❌ Cron error:", error);
    }
  });
};

export const processSubscriptionLifecycle = async () => {
  const now = new Date();

  // 1) Expired but still marked ACTIVE (e.g. unpaid crypto renewals) -> grace period
  const expired = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: { lt: now },
    },
  });
  for (const subscription of expired) {
    await applyPaymentFailure(subscription.id);
  }

  // 2) Grace period ran out -> UNPAID + user INACTIVE + service suspended
  const graceExpired = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.PAST_DUE,
      gracePeriodEnd: { lt: now },
    },
  });
  for (const subscription of graceExpired) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.UNPAID },
    });
    await prisma.user.update({
      where: { id: subscription.userId },
      data: { status: ClientStatus.INACTIVE },
    });
    await suspendServiceIfActive(subscription.userId);
  }

  console.log(
    `✅ Subscription lifecycle: ${expired.length} moved to grace period, ${graceExpired.length} suspended after grace`
  );
};
