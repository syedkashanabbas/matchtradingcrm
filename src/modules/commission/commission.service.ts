import { prisma } from "../../config/prisma";
import { createAuditEvent } from "../../services/audit.service";
import { Prisma } from "@prisma/client";
import { sendCommissionEarnedEmail } from "../../config/email";
import { periodOf, getOrCreateSnapshot } from "./qualification.service";

/**
 * Commission engine (spec v1.1 §7.3-§7.6, "Exonoma" network).
 * On every confirmed payment (Stripe invoice.payment_succeeded / CoinGate paid
 * IPN, subscriptions and the $40 membership alike) it walks the payer's upline
 * via referredByUserId and creates at most one Commission per plan level.
 * Levels with a qualification threshold use the month's frozen snapshot; an
 * unqualified beneficiary is skipped and the row rolls up to the first
 * qualified sponsor above (dynamic compression, wasCompressed +
 * originalBeneficiaryId kept for audit). Idempotent per paymentRef.
 */

export interface PaymentCommissionInput {
  /** Client who paid */
  userId: string;
  /** Stripe invoice id / CoinGate order id - idempotency key */
  paymentRef: string;
  provider: "stripe" | "coingate";
  amount: number;
  currency: string;
}

// How far above the payer compression may search for a qualified sponsor
const MAX_UPLINE_WALK = 50;

export const processPaymentCommissions = async (input: PaymentCommissionInput): Promise<number> => {
  if (!input.paymentRef || input.amount <= 0) return 0;

  // Idempotency: a payment never generates duplicate commissions (spec §7.6)
  const existing = await prisma.commission.count({ where: { paymentRef: input.paymentRef } });
  if (existing > 0) return 0;

  const plan = await prisma.commissionPlan.findFirst({
    where: { isActive: true },
    include: { levels: { orderBy: { level: "asc" } } },
  });
  if (!plan || plan.levels.length === 0) return 0;

  // Full upline chain (cycle-guarded): chain[0] = L1 sponsor, chain[1] = L2, ...
  const chain: string[] = [];
  let currentUserId: string | null = input.userId;
  const visited = new Set<string>([input.userId]);
  for (let i = 0; i < MAX_UPLINE_WALK; i++) {
    const current: { referredByUserId: string | null } | null = await prisma.user.findUnique({
      where: { id: currentUserId! },
      select: { referredByUserId: true },
    });
    const ancestorId = current?.referredByUserId;
    if (!ancestorId || visited.has(ancestorId)) break;
    visited.add(ancestorId);
    chain.push(ancestorId);
    currentUserId = ancestorId;
  }
  if (chain.length === 0) return 0;

  const period = periodOf();
  const thresholds = {
    level2: plan.levels.find(l => l.level === 2)?.minActiveDirects ?? 3,
    level3: plan.levels.find(l => l.level === 3)?.minActiveDirects ?? 5,
  };

  // Month-frozen qualification check for a given level (spec §7.4)
  const snapshotCache = new Map<string, Awaited<ReturnType<typeof getOrCreateSnapshot>>>();
  const qualifiesFor = async (userId: string, level: number, minActiveDirects: number): Promise<boolean> => {
    if (minActiveDirects <= 0) return true;
    let snapshot = snapshotCache.get(userId);
    if (!snapshot) {
      snapshot = await getOrCreateSnapshot(userId, period, thresholds);
      snapshotCache.set(userId, snapshot);
    }
    if (level === 2) return snapshot.qualifiesLevel2;
    if (level === 3) return snapshot.qualifiesLevel3;
    return snapshot.activeDirectCount >= minActiveDirects;
  };

  const commissions: Prisma.CommissionCreateManyInput[] = [];
  for (const planLevel of plan.levels) {
    const naturalIndex = planLevel.level - 1;
    if (naturalIndex >= chain.length) continue; // upline shorter than this level

    const naturalBeneficiaryId = chain[naturalIndex];
    let beneficiaryId: string | null = null;
    let wasCompressed = false;

    if (await qualifiesFor(naturalBeneficiaryId, planLevel.level, planLevel.minActiveDirects)) {
      beneficiaryId = naturalBeneficiaryId;
    } else {
      // Dynamic compression (spec §7.5): skip exactly the unqualified nodes,
      // stop at the first sponsor above qualified for this level.
      for (let idx = naturalIndex + 1; idx < chain.length; idx++) {
        if (await qualifiesFor(chain[idx], planLevel.level, planLevel.minActiveDirects)) {
          beneficiaryId = chain[idx];
          wasCompressed = true;
          break;
        }
      }
    }
    if (!beneficiaryId) continue; // no qualified sponsor up to the tree root

    const amount = roundMoney((input.amount * Number(planLevel.rate)) / 100);
    commissions.push({
      agentId: beneficiaryId,
      sourceUserId: input.userId,
      paymentRef: input.paymentRef,
      provider: input.provider,
      level: planLevel.level,
      baseAmount: input.amount,
      rate: planLevel.rate,
      amount,
      currency: input.currency,
      status: "EARNED",
      wasCompressed,
      originalBeneficiaryId: wasCompressed ? naturalBeneficiaryId : null,
    });
  }

  if (commissions.length === 0) return 0;

  // skipDuplicates guards against a concurrent webhook retry racing the count check
  const result = await prisma.commission.createMany({ data: commissions, skipDuplicates: true });

  // Notify each agent (in-app + email, fire-and-forget)
  if (result.count > 0) {
    for (const commission of commissions) {
      prisma.user
        .findUnique({ where: { id: commission.agentId } })
        .then(agent => {
          if (!agent) return;
          return Promise.all([
            prisma.notification.create({
              data: {
                userId: agent.id,
                type: "COMMISSION",
                title: "Commission earned",
                message: `You earned ${Number(commission.amount).toFixed(2)} ${commission.currency} (level ${commission.level}).`,
                severity: "LOW",
              },
            }),
            sendCommissionEarnedEmail(agent.email, agent.firstName, Number(commission.amount), String(commission.currency)),
          ]);
        })
        .catch(() => {});
    }
  }

  await createAuditEvent({
    action: "COMMISSIONS_CREATED",
    resource: "COMMISSION",
    details: {
      paymentRef: input.paymentRef,
      sourceUserId: input.userId,
      count: result.count,
      amount: input.amount,
      currency: input.currency,
    },
    severity: "LOW",
  });

  return result.count;
};

/**
 * Refund/chargeback (spec §7.2): linked commissions become REVERSED.
 * Commissions already PAID are flagged so the amount is carried over as a
 * negative balance into the next payout period.
 */
export const reverseCommissionsForPayment = async (paymentRef: string): Promise<number> => {
  const linked = await prisma.commission.findMany({ where: { paymentRef } });
  if (linked.length === 0) return 0;

  let reversed = 0;
  for (const commission of linked) {
    if (commission.status === "REVERSED") continue;
    await prisma.commission.update({
      where: { id: commission.id },
      data: {
        status: "REVERSED",
        reversedAfterPayout: commission.status === "PAID",
      },
    });
    reversed++;
  }

  if (reversed > 0) {
    await createAuditEvent({
      action: "COMMISSIONS_REVERSED",
      resource: "COMMISSION",
      details: { paymentRef, count: reversed },
      severity: "MEDIUM",
    });
  }

  return reversed;
};

// ------------------------------------------------------------------
// Agent-facing reads (spec §7.2 endpoints)
// ------------------------------------------------------------------

export const getAgentCommissions = async (
  agentId: string,
  filters: { from?: Date; to?: Date; status?: string } = {}
) => {
  const where: Prisma.CommissionWhereInput = {
    agentId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
  };

  const [commissions, balances] = await Promise.all([
    prisma.commission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        sourceUser: { select: { firstName: true, lastName: true } },
      },
    }),
    getAgentBalances(agentId),
  ]);

  return {
    balances,
    commissions: commissions.map(c => ({
      id: c.id,
      sourceClient: `${c.sourceUser.firstName} ${c.sourceUser.lastName.charAt(0)}.`,
      level: c.level,
      baseAmount: Number(c.baseAmount),
      rate: Number(c.rate),
      amount: Number(c.amount),
      currency: c.currency,
      status: c.status,
      provider: c.provider,
      wasCompressed: c.wasCompressed,
      createdAt: c.createdAt,
    })),
  };
};

export const getAgentBalances = async (agentId: string) => {
  const [earned, paid, reversedAfterPayout, monthly] = await Promise.all([
    prisma.commission.aggregate({
      where: { agentId, status: "EARNED" },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { agentId, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      // only carry-over not yet settled against a payout batch
      where: { agentId, status: "REVERSED", reversedAfterPayout: true, carryOverBatchId: null },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<Array<{ month: string; total: number }>>`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
             COALESCE(SUM(CASE WHEN status != 'REVERSED' THEN amount ELSE 0 END), 0)::float AS total
      FROM "Commission"
      WHERE "agentId" = ${agentId}
      GROUP BY 1
      ORDER BY 1
    `,
  ]);

  const accrued = Number(earned._sum.amount ?? 0);
  const totalPaid = Number(paid._sum.amount ?? 0);
  const carryOver = Number(reversedAfterPayout._sum.amount ?? 0);

  return {
    // accrued unpaid balance, net of refunds that arrived after payout
    accruedUnpaid: roundMoney(accrued - carryOver),
    totalPaid,
    allTime: roundMoney(accrued + totalPaid),
    negativeCarryOver: carryOver,
    monthly,
  };
};

/** Downline clients with level and lifecycle status (spec §7.2/§7.3). */
export const getDownlineClients = async (agentId: string) => {
  const rows = await prisma.$queryRaw<
    Array<{ id: string; firstName: string; lastName: string; status: string; level: number; createdAt: Date }>
  >`
    WITH RECURSIVE downline AS (
      SELECT id, "firstName", "lastName", status::text AS status, "createdAt", 1 AS level
      FROM "User"
      WHERE "referredByUserId" = ${agentId}
      UNION ALL
      SELECT u.id, u."firstName", u."lastName", u.status::text, u."createdAt", d.level + 1
      FROM "User" u
      INNER JOIN downline d ON u."referredByUserId" = d.id
      WHERE d.level < 20
    )
    SELECT * FROM downline ORDER BY level, "createdAt" DESC
  `;

  // Lifecycle status mapping: onboarding / active / expired / suspended
  return rows.map(row => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName.charAt(0)}.`,
    level: Number(row.level),
    status:
      row.status === "ACTIVE"
        ? "active"
        : row.status === "SUSPENDED"
          ? "suspended"
          : row.status === "INACTIVE"
            ? "expired"
            : "onboarding",
    joinedAt: row.createdAt,
  }));
};

// ------------------------------------------------------------------
// Admin: plan configuration (spec §7.2)
// ------------------------------------------------------------------

export const getActivePlan = async () => {
  return prisma.commissionPlan.findFirst({
    where: { isActive: true },
    include: { levels: { orderBy: { level: "asc" } } },
  });
};

/**
 * Creates/updates the compensation plan: N levels with a rate per level,
 * neither fixed in code. Activating deactivates any other plan.
 */
export const upsertPlan = async (
  adminId: string,
  input: {
    name: string;
    isActive: boolean;
    levels: Array<{ level: number; rate: number; minActiveDirects?: number }>;
  }
) => {
  if (!input.levels?.length) throw new Error("At least one level is required");
  const levelNumbers = input.levels.map(l => l.level);
  if (new Set(levelNumbers).size !== levelNumbers.length) throw new Error("Duplicate levels");
  for (const level of input.levels) {
    if (level.level < 1 || level.level > 20) throw new Error("Levels must be between 1 and 20");
    if (level.rate < 0 || level.rate > 100) throw new Error("Rates must be between 0 and 100");
    const threshold = level.minActiveDirects ?? 0;
    if (threshold < 0 || threshold > 1000 || !Number.isInteger(threshold)) {
      throw new Error("Qualification thresholds must be integers between 0 and 1000");
    }
  }

  const plan = await prisma.$transaction(async tx => {
    if (input.isActive) {
      await tx.commissionPlan.updateMany({ data: { isActive: false }, where: { isActive: true } });
    }
    const created = await tx.commissionPlan.create({
      data: {
        name: input.name,
        isActive: input.isActive,
        levels: {
          create: input.levels.map(l => ({
            level: l.level,
            rate: l.rate,
            minActiveDirects: l.minActiveDirects ?? 0,
          })),
        },
      },
      include: { levels: { orderBy: { level: "asc" } } },
    });
    return created;
  });

  await createAuditEvent({
    action: "COMMISSION_PLAN_UPDATED",
    resource: "COMMISSION",
    details: { by: adminId, planId: plan.id, name: plan.name, isActive: plan.isActive, levels: input.levels },
    severity: "HIGH",
  });

  return plan;
};

// ------------------------------------------------------------------
// Admin: report + payout batches (spec §7.2/§7.4)
// ------------------------------------------------------------------

/** Per-period report aggregated by agent with drill-down data. */
export const getCommissionReport = async (filters: { from?: Date; to?: Date } = {}) => {
  const where: Prisma.CommissionWhereInput = {
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
  };

  const [grouped, compressed] = await Promise.all([
    prisma.commission.groupBy({
      by: ["agentId", "status"],
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
    // Compression evidence (spec v1.1 §7.12): rows received via compression
    prisma.commission.groupBy({
      by: ["agentId"],
      where: { ...where, wasCompressed: true },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);
  const compressedByAgent = new Map(
    compressed.map(c => [c.agentId, { amount: Number(c._sum.amount ?? 0), count: c._count.id }])
  );

  const agentIds = [...new Set(grouped.map(g => g.agentId))];
  const agents = await prisma.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, firstName: true, lastName: true, email: true, payoutReference: true },
  });
  const agentById = new Map(agents.map(a => [a.id, a]));

  const report = new Map<
    string,
    {
      agentId: string;
      agent: string;
      email: string;
      earned: number;
      paid: number;
      reversed: number;
      count: number;
      compressedCount: number;
      compressedAmount: number;
    }
  >();
  for (const row of grouped) {
    const agent = agentById.get(row.agentId);
    const entry = report.get(row.agentId) ?? {
      agentId: row.agentId,
      agent: agent ? `${agent.firstName} ${agent.lastName}` : row.agentId,
      email: agent?.email ?? "",
      earned: 0,
      paid: 0,
      reversed: 0,
      count: 0,
      compressedCount: compressedByAgent.get(row.agentId)?.count ?? 0,
      compressedAmount: compressedByAgent.get(row.agentId)?.amount ?? 0,
    };
    const amount = Number(row._sum.amount ?? 0);
    if (row.status === "EARNED") entry.earned += amount;
    if (row.status === "PAID") entry.paid += amount;
    if (row.status === "REVERSED") entry.reversed += amount;
    entry.count += row._count.id;
    report.set(row.agentId, entry);
  }

  return [...report.values()].sort((a, b) => b.earned + b.paid - (a.earned + a.paid));
};

export const getAgentCommissionsForAdmin = async (agentId: string, filters: { from?: Date; to?: Date } = {}) => {
  const rows = await prisma.commission.findMany({
    where: {
      agentId,
      ...(filters.from || filters.to
        ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { sourceUser: { select: { firstName: true, lastName: true, email: true } } },
  });

  // Compression evidence (spec v1.1 §7.12): original -> effective beneficiary
  const originalIds = [...new Set(rows.map(r => r.originalBeneficiaryId).filter((id): id is string => !!id))];
  const originals = originalIds.length
    ? await prisma.user.findMany({
        where: { id: { in: originalIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const originalById = new Map(originals.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

  return rows.map(row => ({
    ...row,
    originalBeneficiaryName: row.originalBeneficiaryId
      ? (originalById.get(row.originalBeneficiaryId) ?? row.originalBeneficiaryId)
      : null,
  }));
};

/**
 * Creates a period batch: all EARNED commissions in [periodStart, periodEnd]
 * are attached (re-checked inside the transaction so concurrent batch
 * creation can never double-attach a commission). Unsettled negative
 * carry-over (refunds that arrived after a payout) is deducted per agent and
 * settled against this batch.
 */
export const createPayoutBatch = async (adminId: string, periodStart: Date, periodEnd: Date) => {
  const result = await prisma.$transaction(async tx => {
    const eligible = await tx.commission.findMany({
      where: {
        status: "EARNED",
        payoutBatchId: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { createdAt: "asc" },
    });
    if (eligible.length === 0) throw new Error("No unpaid commissions in this period");

    const created = await tx.payoutBatch.create({
      data: { periodStart, periodEnd, totalAmount: 0, createdBy: adminId },
    });

    // Attach with a status/batch re-check: rows claimed by a concurrent batch
    // in the meantime are skipped, never double-attached.
    const attach = await tx.commission.updateMany({
      where: { id: { in: eligible.map(c => c.id) }, status: "EARNED", payoutBatchId: null },
      data: { payoutBatchId: created.id },
    });
    if (attach.count === 0) throw new Error("No unpaid commissions in this period");

    const attached = await tx.commission.findMany({ where: { payoutBatchId: created.id } });
    const earnedByAgent = new Map<string, number>();
    for (const commission of attached) {
      earnedByAgent.set(
        commission.agentId,
        roundMoney((earnedByAgent.get(commission.agentId) ?? 0) + Number(commission.amount))
      );
    }

    // Negative carry-over (spec §7.2): deduct refunds that arrived after a
    // previous payout, settling whole reversed commissions while the agent's
    // earnings in this batch cover them. Remainder stays for the next batch.
    const carryOvers = await tx.commission.findMany({
      where: {
        agentId: { in: [...earnedByAgent.keys()] },
        status: "REVERSED",
        reversedAfterPayout: true,
        carryOverBatchId: null,
      },
      orderBy: { createdAt: "asc" },
    });

    let carryOverTotal = 0;
    const settledIds: string[] = [];
    const remainingByAgent = new Map(earnedByAgent);
    for (const carryOver of carryOvers) {
      const remaining = remainingByAgent.get(carryOver.agentId) ?? 0;
      const amount = Number(carryOver.amount);
      if (amount <= remaining) {
        settledIds.push(carryOver.id);
        remainingByAgent.set(carryOver.agentId, roundMoney(remaining - amount));
        carryOverTotal = roundMoney(carryOverTotal + amount);
      }
    }
    if (settledIds.length > 0) {
      await tx.commission.updateMany({
        where: { id: { in: settledIds } },
        data: { carryOverBatchId: created.id },
      });
    }

    const earnedTotal = [...earnedByAgent.values()].reduce((sum, v) => roundMoney(sum + v), 0);
    const totalAmount = roundMoney(earnedTotal - carryOverTotal);

    const finalBatch = await tx.payoutBatch.update({
      where: { id: created.id },
      data: { totalAmount },
    });

    return { batch: finalBatch, commissionCount: attach.count, carryOverTotal, settled: settledIds.length };
  });

  await createAuditEvent({
    action: "PAYOUT_BATCH_CREATED",
    resource: "COMMISSION",
    details: {
      by: adminId,
      batchId: result.batch.id,
      totalAmount: Number(result.batch.totalAmount),
      commissions: result.commissionCount,
      carryOverDeducted: result.carryOverTotal,
    },
    severity: "HIGH",
  });

  return { ...result.batch, commissionCount: result.commissionCount, carryOverDeducted: result.carryOverTotal };
};

export const listPayoutBatches = async () => {
  const batches = await prisma.payoutBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { commissions: true } } },
  });
  return batches.map(batch => ({
    id: batch.id,
    periodStart: batch.periodStart,
    periodEnd: batch.periodEnd,
    totalAmount: Number(batch.totalAmount),
    status: batch.status,
    paidAt: batch.paidAt,
    createdAt: batch.createdAt,
    commissionCount: batch._count.commissions,
  }));
};

/** CSV export: agent, IBAN/reference, total per currency, net of settled carry-over (spec §7.2). */
export const exportPayoutBatchCsv = async (batchId: string) => {
  const batch = await prisma.payoutBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Payout batch not found");

  const agentSelect = { select: { id: true, firstName: true, lastName: true, email: true, payoutReference: true } };
  const [attached, carryOvers] = await Promise.all([
    prisma.commission.findMany({ where: { payoutBatchId: batchId }, include: { agent: agentSelect } }),
    prisma.commission.findMany({ where: { carryOverBatchId: batchId }, include: { agent: agentSelect } }),
  ]);

  // One row per (agent, currency) - amounts in different currencies are never summed together
  const rows = new Map<string, { name: string; email: string; reference: string; total: number; currency: string }>();
  const add = (commission: (typeof attached)[number], sign: 1 | -1) => {
    const key = `${commission.agentId}:${commission.currency}`;
    const entry = rows.get(key) ?? {
      name: `${commission.agent.firstName} ${commission.agent.lastName}`,
      email: commission.agent.email,
      reference: commission.agent.payoutReference ?? "",
      total: 0,
      currency: commission.currency,
    };
    entry.total = roundMoney(entry.total + sign * Number(commission.amount));
    rows.set(key, entry);
  };

  for (const commission of attached) {
    // Reversed before payment: excluded from what the admin should pay
    if (commission.status === "REVERSED") continue;
    add(commission, 1);
  }
  for (const carryOver of carryOvers) {
    add(carryOver, -1); // settled negative carry-over from previous periods
  }

  // CSV injection-safe: quote-escape and neutralize leading formula characters
  const escape = (value: string) => {
    let text = String(value).replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text}"`;
  };

  const lines = ['"Agent","Email","IBAN/Reference","Currency","Total"'];
  for (const entry of rows.values()) {
    lines.push(
      [escape(entry.name), escape(entry.email), escape(entry.reference), escape(entry.currency), entry.total.toFixed(2)].join(",")
    );
  }

  if (batch.status === "OPEN") {
    await prisma.payoutBatch.update({ where: { id: batchId }, data: { status: "EXPORTED" } });
  }

  return { filename: `payout-batch-${batchId}.csv`, csv: lines.join("\n") };
};

/**
 * Marks the batch paid -> attached commissions move to PAID (spec §7.2).
 * Commissions reversed between export and mark-paid are detached and the
 * total recomputed; a warning tells the admin to re-export in that case.
 */
export const markPayoutBatchPaid = async (batchId: string, adminId: string) => {
  const batch = await prisma.payoutBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Payout batch not found");
  if (batch.status === "PAID") throw new Error("Batch already marked paid");

  const { updated, detachedCount, totalChanged } = await prisma.$transaction(async tx => {
    // Refunds that landed after the batch was created but before payment:
    // these were never paid out, so they leave the batch (no carry-over).
    const detached = await tx.commission.updateMany({
      where: { payoutBatchId: batchId, status: "REVERSED", reversedAfterPayout: false },
      data: { payoutBatchId: null },
    });

    await tx.commission.updateMany({
      where: { payoutBatchId: batchId, status: "EARNED" },
      data: { status: "PAID" },
    });

    // Recompute the total from what was actually paid, net of settled carry-over
    const [paid, settledCarryOvers] = await Promise.all([
      tx.commission.findMany({ where: { payoutBatchId: batchId, status: "PAID" } }),
      tx.commission.findMany({ where: { carryOverBatchId: batchId } }),
    ]);
    const paidTotal = paid.reduce((sum, c) => roundMoney(sum + Number(c.amount)), 0);
    const carryOverTotal = settledCarryOvers.reduce((sum, c) => roundMoney(sum + Number(c.amount)), 0);
    const totalAmount = roundMoney(paidTotal - carryOverTotal);
    const changed = Math.abs(totalAmount - Number(batch.totalAmount)) > 0.005;

    const result = await tx.payoutBatch.update({
      where: { id: batchId },
      data: { status: "PAID", paidAt: new Date(), totalAmount },
    });

    return { updated: result, detachedCount: detached.count, totalChanged: changed };
  });

  await createAuditEvent({
    action: "PAYOUT_BATCH_PAID",
    resource: "COMMISSION",
    details: { by: adminId, batchId, detachedReversals: detachedCount, totalAmount: Number(updated.totalAmount) },
    severity: "HIGH",
  });

  return {
    ...updated,
    warning:
      detachedCount > 0 || totalChanged
        ? `${detachedCount} commission(s) were reversed after export - the batch total was recomputed to ${Number(updated.totalAmount).toFixed(2)}. Re-export the CSV before paying.`
        : undefined,
  };
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;
