import { prisma } from "../../config/prisma";

/**
 * Qualification snapshots (spec v1.1 §7.4).
 * "Active paying direct" = level-1 referral with an ongoing recurring payment
 * (client subscription or $40 membership - §7.10 treats them as equivalent).
 * Qualifications are frozen per billing period ("YYYY-MM"): the monthly cron
 * pre-creates snapshots at cycle start, and the engine freezes one on first
 * use if the cron has not run for a user yet. Mid-month changes never alter
 * already-assigned commissions.
 */

export const periodOf = (date: Date = new Date()): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

export const countActivePayingDirects = async (userId: string): Promise<number> => {
  return prisma.user.count({
    where: {
      referredByUserId: userId,
      subscriptions: { some: { status: { in: ["ACTIVE", "TRIALING"] } } },
    },
  });
};

export interface QualificationThresholds {
  level2: number; // min active paying directs to unlock L2 (spec default 3)
  level3: number; // min active paying directs to unlock L3 (spec default 5)
}

/** Thresholds from the active plan; spec v1.1 §7.3 defaults when unset. */
export const getActiveThresholds = async (): Promise<QualificationThresholds> => {
  const plan = await prisma.commissionPlan.findFirst({
    where: { isActive: true },
    include: { levels: true },
  });
  const level2 = plan?.levels.find(l => l.level === 2)?.minActiveDirects;
  const level3 = plan?.levels.find(l => l.level === 3)?.minActiveDirects;
  return { level2: level2 ?? 3, level3: level3 ?? 5 };
};

export const getOrCreateSnapshot = async (
  userId: string,
  period: string,
  thresholds: QualificationThresholds
) => {
  const existing = await prisma.qualificationSnapshot.findUnique({
    where: { userId_period: { userId, period } },
  });
  if (existing) return existing;

  const activeDirectCount = await countActivePayingDirects(userId);
  try {
    return await prisma.qualificationSnapshot.create({
      data: {
        userId,
        period,
        activeDirectCount,
        qualifiesLevel2: activeDirectCount >= thresholds.level2,
        qualifiesLevel3: activeDirectCount >= thresholds.level3,
      },
    });
  } catch {
    // Unique race with a concurrent payment/cron: the frozen row wins
    const raced = await prisma.qualificationSnapshot.findUnique({
      where: { userId_period: { userId, period } },
    });
    if (!raced) throw new Error(`Failed to freeze qualification snapshot for ${userId} ${period}`);
    return raced;
  }
};

/**
 * Monthly cron entry point (spec v1.1 task 4.3): freezes the snapshot for
 * every user who sponsors at least one other user. Idempotent per period.
 */
export const snapshotAllSponsors = async (period: string = periodOf()): Promise<number> => {
  const thresholds = await getActiveThresholds();
  const sponsors = await prisma.user.findMany({
    where: { referrals: { some: {} } },
    select: { id: true },
  });

  let created = 0;
  for (const sponsor of sponsors) {
    const existing = await prisma.qualificationSnapshot.findUnique({
      where: { userId_period: { userId: sponsor.id, period } },
    });
    if (existing) continue;
    await getOrCreateSnapshot(sponsor.id, period, thresholds);
    created++;
  }
  return created;
};

/** Agent-facing qualification state (spec v1.1 §7.9 GET /api/network/qualification). */
export const getQualificationState = async (userId: string) => {
  const period = periodOf();
  const thresholds = await getActiveThresholds();
  const [snapshot, liveCount] = await Promise.all([
    getOrCreateSnapshot(userId, period, thresholds),
    countActivePayingDirects(userId),
  ]);

  return {
    period,
    // Frozen values used by this month's commission runs
    snapshot: {
      activeDirectCount: snapshot.activeDirectCount,
      qualifiesLevel2: snapshot.qualifiesLevel2,
      qualifiesLevel3: snapshot.qualifiesLevel3,
    },
    // Live progress towards next month's qualification
    activeDirects: liveCount,
    thresholds,
    progressToLevel2: Math.min(liveCount / Math.max(thresholds.level2, 1), 1),
    progressToLevel3: Math.min(liveCount / Math.max(thresholds.level3, 1), 1),
  };
};
