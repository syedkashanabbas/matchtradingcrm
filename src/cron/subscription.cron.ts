import cron from "node-cron";
import { prisma } from "../config/prisma";

/**
 * Runs every day at midnight
 * Checks for expired subscriptions
 */
export const startSubscriptionCron = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Running subscription check...");

    try {
      // 🔍 find users whose subscription expired
      const expiredUsers = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          subscriptionEnd: {
            lt: new Date(),
          },
        },
      });

      // ❌ deactivate them
      for (const user of expiredUsers) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            status: "INACTIVE",
          },
        });
      }

      console.log(`✅ Updated ${expiredUsers.length} expired users`);
    } catch (error) {
      console.error("❌ Cron error:", error);
    }
  });
};
