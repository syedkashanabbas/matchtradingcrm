import { prisma } from "../../config/prisma";
import { createAuditEvent } from "../../services/audit.service";
import { periodOf } from "../commission/qualification.service";

/**
 * Time-boxed challenges and travel promos (spec v1.1 §7.8).
 * Challenges: leaderboard competitions on a ranking metric, frozen at expiry
 * with a winners log. Travel promos: threshold goals with a per-collaborator
 * state flag (NOT_REACHED -> REACHED -> CONFIRMED -> REDEEMED).
 */

export const CHALLENGE_METRICS = ["new_active_directs", "revenue_generated", "new_l2_unlocked"] as const;
export const PROMO_METRICS = ["active_directs", "revenue"] as const;

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
}

// ------------------------------------------------------------------
// Leaderboard computation
// ------------------------------------------------------------------

const nameOf = (user: { firstName: string; lastName: string }) =>
  `${user.firstName} ${user.lastName.charAt(0)}.`;

/**
 * Computes the live leaderboard for a challenge window [startsAt, min(endsAt, now)].
 * - new_active_directs: directs recruited in the window that pay today
 * - revenue_generated: base amount of level-1 commissions earned in the window
 * - new_l2_unlocked: directs that reached L2 qualification during the window
 */
export const computeLeaderboard = async (challenge: {
  metric: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<LeaderboardEntry[]> => {
  const windowEnd = challenge.endsAt < new Date() ? challenge.endsAt : new Date();
  const scores = new Map<string, number>();

  if (challenge.metric === "new_active_directs") {
    const recruits = await prisma.user.findMany({
      where: {
        referredByUserId: { not: null },
        createdAt: { gte: challenge.startsAt, lte: windowEnd },
        subscriptions: { some: { status: { in: ["ACTIVE", "TRIALING"] } } },
      },
      select: { referredByUserId: true },
    });
    for (const recruit of recruits) {
      scores.set(recruit.referredByUserId!, (scores.get(recruit.referredByUserId!) ?? 0) + 1);
    }
  } else if (challenge.metric === "revenue_generated") {
    const grouped = await prisma.commission.groupBy({
      by: ["agentId"],
      where: {
        level: 1,
        status: { not: "REVERSED" },
        createdAt: { gte: challenge.startsAt, lte: windowEnd },
      },
      _sum: { baseAmount: true },
    });
    for (const row of grouped) {
      scores.set(row.agentId, Number(row._sum.baseAmount ?? 0));
    }
  } else if (challenge.metric === "new_l2_unlocked") {
    // Directs whose L2 qualification flipped to true between the snapshot of
    // the start month and the latest snapshot in the window.
    const startPeriod = periodOf(challenge.startsAt);
    const endPeriod = periodOf(windowEnd);
    const snapshots = await prisma.qualificationSnapshot.findMany({
      where: { period: { gte: startPeriod, lte: endPeriod } },
      orderBy: { period: "asc" },
      select: { userId: true, period: true, qualifiesLevel2: true },
    });
    const first = new Map<string, boolean>();
    const last = new Map<string, boolean>();
    for (const snapshot of snapshots) {
      if (!first.has(snapshot.userId)) first.set(snapshot.userId, snapshot.qualifiesLevel2);
      last.set(snapshot.userId, snapshot.qualifiesLevel2);
    }
    const unlockedUserIds = [...last.keys()].filter(
      userId => last.get(userId) === true && first.get(userId) !== true
    );
    if (unlockedUserIds.length > 0) {
      const sponsors = await prisma.user.findMany({
        where: { id: { in: unlockedUserIds }, referredByUserId: { not: null } },
        select: { referredByUserId: true },
      });
      for (const sponsor of sponsors) {
        scores.set(sponsor.referredByUserId!, (scores.get(sponsor.referredByUserId!) ?? 0) + 1);
      }
    }
  } else {
    throw new Error(`Unknown challenge metric: ${challenge.metric}`);
  }

  const userIds = [...scores.keys()];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const userById = new Map(users.map(u => [u.id, u]));

  return userIds
    .map(userId => ({
      userId,
      name: userById.has(userId) ? nameOf(userById.get(userId)!) : "Unknown",
      score: Math.round(scores.get(userId)! * 100) / 100,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

// ------------------------------------------------------------------
// Agent-facing reads (spec §7.9)
// ------------------------------------------------------------------

/** Active challenges with real-time leaderboard and the caller's position. */
export const getChallengesForAgent = async (userId: string) => {
  const now = new Date();
  const [active, frozen] = await Promise.all([
    prisma.challenge.findMany({
      where: { status: "ACTIVE", startsAt: { lte: now } },
      orderBy: { endsAt: "asc" },
    }),
    prisma.challenge.findMany({
      where: { status: "FROZEN" },
      orderBy: { endsAt: "desc" },
      take: 10,
    }),
  ]);

  const withLeaderboards = await Promise.all(
    active.map(async challenge => {
      const leaderboard = await computeLeaderboard(challenge);
      const mine = leaderboard.find(entry => entry.userId === userId) ?? null;
      return {
        id: challenge.id,
        name: challenge.name,
        metric: challenge.metric,
        prize: challenge.prize,
        startsAt: challenge.startsAt,
        endsAt: challenge.endsAt,
        status: challenge.status,
        leaderboard: leaderboard.slice(0, 10),
        myRank: mine?.rank ?? null,
        myScore: mine?.score ?? 0,
      };
    })
  );

  return {
    active: withLeaderboards,
    // Historical winners log (spec §7.8)
    past: frozen.map(challenge => ({
      id: challenge.id,
      name: challenge.name,
      metric: challenge.metric,
      prize: challenge.prize,
      endsAt: challenge.endsAt,
      winners: Array.isArray(challenge.winnersLog) ? (challenge.winnersLog as any[]).slice(0, 3) : [],
    })),
  };
};

/** Active travel promos with the caller's progress and state. */
export const getPromosForAgent = async (userId: string) => {
  const promos = await prisma.travelPromo.findMany({
    where: { deadline: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
    orderBy: { deadline: "asc" },
    include: { progresses: { where: { userId } } },
  });

  return Promise.all(
    promos.map(async promo => {
      const current = await computePromoMetric(promo, userId);
      let progress = promo.progresses[0] ?? null;

      // Automatic NOT_REACHED -> REACHED transition; CONFIRMED/REDEEMED are
      // admin-only transitions (spec §7.8).
      if (current >= Number(promo.threshold) && (!progress || progress.status === "NOT_REACHED")) {
        progress = await prisma.travelPromoProgress.upsert({
          where: { promoId_userId: { promoId: promo.id, userId } },
          create: { promoId: promo.id, userId, status: "REACHED" },
          update: { status: "REACHED" },
        });
      }

      return {
        id: promo.id,
        name: promo.name,
        metric: promo.metric,
        threshold: Number(promo.threshold),
        deadline: promo.deadline,
        current: Math.round(current * 100) / 100,
        progressRatio: Math.min(current / Math.max(Number(promo.threshold), 1), 1),
        status: progress?.status ?? "NOT_REACHED",
      };
    })
  );
};

const computePromoMetric = async (
  promo: { metric: string; createdAt: Date; deadline: Date },
  userId: string
): Promise<number> => {
  if (promo.metric === "active_directs") {
    return prisma.user.count({
      where: {
        referredByUserId: userId,
        subscriptions: { some: { status: { in: ["ACTIVE", "TRIALING"] } } },
      },
    });
  }
  if (promo.metric === "revenue") {
    const windowEnd = promo.deadline < new Date() ? promo.deadline : new Date();
    const sum = await prisma.commission.aggregate({
      where: {
        agentId: userId,
        level: 1,
        status: { not: "REVERSED" },
        createdAt: { gte: promo.createdAt, lte: windowEnd },
      },
      _sum: { baseAmount: true },
    });
    return Number(sum._sum.baseAmount ?? 0);
  }
  throw new Error(`Unknown promo metric: ${promo.metric}`);
};

// ------------------------------------------------------------------
// Admin CRUD (spec §7.9/§7.12)
// ------------------------------------------------------------------

export const adminListChallenges = async () => {
  const challenges = await prisma.challenge.findMany({ orderBy: { endsAt: "desc" } });
  return Promise.all(
    challenges.map(async challenge => ({
      ...challenge,
      leaderboard:
        challenge.status === "ACTIVE"
          ? (await computeLeaderboard(challenge)).slice(0, 10)
          : Array.isArray(challenge.winnersLog)
            ? (challenge.winnersLog as any[]).slice(0, 10)
            : [],
    }))
  );
};

export const adminUpsertChallenge = async (
  adminId: string,
  input: { id?: string; name: string; metric: string; prize: string; startsAt: Date; endsAt: Date }
) => {
  if (!CHALLENGE_METRICS.includes(input.metric as any)) {
    throw new Error(`Metric must be one of: ${CHALLENGE_METRICS.join(", ")}`);
  }
  if (input.endsAt <= input.startsAt) throw new Error("endsAt must be after startsAt");

  const data = {
    name: input.name,
    metric: input.metric,
    prize: input.prize,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  };
  const challenge = input.id
    ? await prisma.challenge.update({ where: { id: input.id }, data })
    : await prisma.challenge.create({ data });

  await createAuditEvent({
    action: input.id ? "CHALLENGE_UPDATED" : "CHALLENGE_CREATED",
    resource: "CHALLENGE",
    details: { by: adminId, challengeId: challenge.id, ...data },
    severity: "MEDIUM",
  });
  return challenge;
};

/** Manual close: freezes the leaderboard immediately (also used by the cron). */
export const freezeChallenge = async (challengeId: string, actor: string) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new Error("Challenge not found");
  if (challenge.status === "FROZEN") return challenge;

  const leaderboard = await computeLeaderboard(challenge);
  const frozen = await prisma.challenge.update({
    where: { id: challengeId },
    data: { status: "FROZEN", winnersLog: leaderboard as any },
  });

  await createAuditEvent({
    action: "CHALLENGE_FROZEN",
    resource: "CHALLENGE",
    details: { by: actor, challengeId, winners: leaderboard.slice(0, 3) },
    severity: "MEDIUM",
  });
  return frozen;
};

/** Cron entry point: freezes every expired ACTIVE challenge (spec task 4.7). */
export const freezeExpiredChallenges = async (): Promise<number> => {
  const expired = await prisma.challenge.findMany({
    where: { status: "ACTIVE", endsAt: { lt: new Date() } },
  });
  for (const challenge of expired) {
    await freezeChallenge(challenge.id, "system");
  }
  return expired.length;
};

export const adminListPromos = async () => {
  const promos = await prisma.travelPromo.findMany({
    orderBy: { deadline: "desc" },
    include: {
      progresses: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return promos.map(promo => ({
    id: promo.id,
    name: promo.name,
    metric: promo.metric,
    threshold: Number(promo.threshold),
    deadline: promo.deadline,
    createdAt: promo.createdAt,
    progresses: promo.progresses.map(progress => ({
      userId: progress.userId,
      name: `${progress.user.firstName} ${progress.user.lastName}`,
      email: progress.user.email,
      status: progress.status,
      updatedAt: progress.updatedAt,
    })),
  }));
};

export const adminUpsertPromo = async (
  adminId: string,
  input: { id?: string; name: string; metric: string; threshold: number; deadline: Date }
) => {
  if (!PROMO_METRICS.includes(input.metric as any)) {
    throw new Error(`Metric must be one of: ${PROMO_METRICS.join(", ")}`);
  }
  if (input.threshold <= 0) throw new Error("Threshold must be positive");

  const data = { name: input.name, metric: input.metric, threshold: input.threshold, deadline: input.deadline };
  const promo = input.id
    ? await prisma.travelPromo.update({ where: { id: input.id }, data })
    : await prisma.travelPromo.create({ data });

  await createAuditEvent({
    action: input.id ? "TRAVEL_PROMO_UPDATED" : "TRAVEL_PROMO_CREATED",
    resource: "TRAVEL_PROMO",
    details: { by: adminId, promoId: promo.id, ...data },
    severity: "MEDIUM",
  });
  return promo;
};

const PROMO_STATES = ["NOT_REACHED", "REACHED", "CONFIRMED", "REDEEMED"] as const;

/** Admin confirms/redeems a collaborator's promo state (spec §7.9). */
export const adminSetPromoProgress = async (
  adminId: string,
  promoId: string,
  userId: string,
  status: string
) => {
  if (!PROMO_STATES.includes(status as any)) {
    throw new Error(`Status must be one of: ${PROMO_STATES.join(", ")}`);
  }
  const promo = await prisma.travelPromo.findUnique({ where: { id: promoId } });
  if (!promo) throw new Error("Travel promo not found");

  const progress = await prisma.travelPromoProgress.upsert({
    where: { promoId_userId: { promoId, userId } },
    create: { promoId, userId, status },
    update: { status },
  });

  await createAuditEvent({
    action: "TRAVEL_PROMO_PROGRESS_SET",
    resource: "TRAVEL_PROMO",
    details: { by: adminId, promoId, userId, status },
    severity: "MEDIUM",
  });
  return progress;
};
