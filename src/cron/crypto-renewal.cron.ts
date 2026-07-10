import cron from "node-cron";
import { prisma } from "../config/prisma";
import { createCryptoCheckout } from "../modules/subscription/subscription.service";
import { sendEmail } from "../config/email";
import { SubscriptionStatus } from "@prisma/client";

const RENEWAL_DAYS_BEFORE = parseInt(process.env.CRYPTO_RENEWAL_DAYS_BEFORE || "7", 10);

/**
 * Crypto renewal cron (M3, spec §6.2 flow 4): crypto has no recurring charge,
 * so N days before expiry we email a link to a fresh CoinGate order.
 * Runs daily at 09:00.
 */
export const startCryptoRenewalCron = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("🔄 Running crypto renewal check...");
    try {
      await processCryptoRenewals();
    } catch (error) {
      console.error("❌ Crypto renewal cron error:", error);
    }
  });
  console.log("⏱  Crypto renewal cron scheduled (daily 09:00)");
};

export const processCryptoRenewals = async (): Promise<number> => {
  const threshold = new Date(Date.now() + RENEWAL_DAYS_BEFORE * 24 * 3600 * 1000);

  const expiring = await prisma.subscription.findMany({
    where: {
      provider: "coingate",
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: { gt: new Date(), lte: threshold },
    },
    include: { user: { select: { id: true, email: true, firstName: true } } },
  });

  let sent = 0;
  for (const subscription of expiring) {
    // One pending renewal order per user at a time
    const pendingRenewal = await prisma.cryptoOrder.findFirst({
      where: {
        userId: subscription.userId,
        purpose: "renewal",
        status: { in: ["new", "pending", "confirming"] },
        createdAt: { gt: subscription.currentPeriodStart },
      },
    });
    if (pendingRenewal) continue;

    try {
      const { url } = await createCryptoCheckout(subscription.userId, subscription.plan, "renewal");

      const expiryDate = subscription.currentPeriodEnd.toLocaleDateString();
      await sendEmail(
        subscription.user.email,
        "Your EIDOS subscription expires soon - renew with crypto",
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Time to renew your subscription</h2>
            <p>Hi ${subscription.user.firstName},</p>
            <p>Your EIDOS <strong>${subscription.plan}</strong> subscription expires on <strong>${expiryDate}</strong>.</p>
            <p>Crypto payments don't renew automatically - use the button below to pay for the next period:</p>
            <p style="text-align:center; margin: 30px 0;">
              <a href="${url}" style="background:#4f46e5; color:#fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Renew now
              </a>
            </p>
            <p>If you don't renew by the expiry date, your service enters a short grace period and is then suspended.</p>
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message from EIDOS.</p>
          </div>
        `
      );

      await prisma.notification.create({
        data: {
          userId: subscription.userId,
          type: "PAYMENT_FAILURE",
          title: "Subscription expiring soon",
          message: `Your subscription expires on ${expiryDate}. Renew with crypto from your subscription page.`,
          severity: "MEDIUM",
        },
      });

      sent++;
    } catch (error: any) {
      console.error(`Failed to send crypto renewal for user ${subscription.userId}:`, error.message);
    }
  }

  console.log(`✅ Crypto renewal check done - ${sent} renewal emails sent`);
  return sent;
};
