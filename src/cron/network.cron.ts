import cron from "node-cron";
import { snapshotAllSponsors, periodOf } from "../modules/commission/qualification.service";
import { freezeExpiredChallenges } from "../modules/challenge/challenge.service";

/**
 * Network engine crons (spec v1.1 tasks 4.3 and 4.7):
 * 1. Monthly, at billing cycle start (1st, 00:10 UTC): freeze the
 *    qualification snapshot for every sponsor. The commission engine also
 *    freezes on first use, so a missed run never breaks correctness - the
 *    cron just makes the whole month's state visible upfront.
 * 2. Every 10 minutes: freeze expired challenges (leaderboard -> winners log).
 */
export const startNetworkCron = () => {
  cron.schedule("10 0 1 * *", async () => {
    const period = periodOf();
    console.log(`🔄 Freezing qualification snapshots for ${period}...`);
    try {
      const created = await snapshotAllSponsors(period);
      console.log(`✅ Qualification snapshots frozen: ${created} new for ${period}`);
    } catch (error) {
      console.error("❌ Qualification snapshot cron error:", error);
    }
  });

  cron.schedule("*/10 * * * *", async () => {
    try {
      const frozen = await freezeExpiredChallenges();
      if (frozen > 0) console.log(`🏁 Challenges frozen: ${frozen}`);
    } catch (error) {
      console.error("❌ Challenge freeze cron error:", error);
    }
  });
};
