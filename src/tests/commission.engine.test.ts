import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------
const { prismaMock } = vi.hoisted(() => ({ prismaMock: {
  commission: {
    count: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  commissionPlan: {
    findFirst: vi.fn(),
  },
  qualificationSnapshot: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  notification: {
    create: vi.fn().mockResolvedValue({}),
  },
  auditEvent: {
    create: vi.fn().mockResolvedValue({}),
  },
}}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../config/email", () => ({
  sendCommissionEarnedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../services/audit.service", () => ({
  createAuditEvent: vi.fn().mockResolvedValue({}),
}));

import {
  processPaymentCommissions,
  reverseCommissionsForPayment,
} from "../modules/commission/commission.service";

// Upline chain: client -> agentL1 -> agentL2 -> agentL3 -> agentL4 -> null
const UPLINE: Record<string, string | null> = {
  client: "agentL1",
  agentL1: "agentL2",
  agentL2: "agentL3",
  agentL3: "agentL4",
  agentL4: null,
};

// Exonoma plan (spec v1.1 §7.3): 20/18/12 with 0/3/5 thresholds
const EXONOMA_LEVELS = [
  { level: 1, rate: 20, minActiveDirects: 0 },
  { level: 2, rate: 18, minActiveDirects: 3 },
  { level: 3, rate: 12, minActiveDirects: 5 },
];

const activePlan = (levels: Array<{ level: number; rate: number; minActiveDirects: number }>) => ({
  id: "plan-1",
  name: "Test plan",
  isActive: true,
  levels,
});

/** Frozen snapshot per agent: agentId -> { count, l2, l3 } */
let snapshots: Record<string, { count: number; l2: boolean; l3: boolean }>;

const allQualified = () => ({
  agentL1: { count: 9, l2: true, l3: true },
  agentL2: { count: 9, l2: true, l3: true },
  agentL3: { count: 9, l2: true, l3: true },
  agentL4: { count: 9, l2: true, l3: true },
});

beforeEach(() => {
  vi.clearAllMocks();
  snapshots = allQualified();
  prismaMock.user.findUnique.mockImplementation(({ where }: any) =>
    Promise.resolve(
      where.id in UPLINE
        ? { id: where.id, referredByUserId: UPLINE[where.id], email: "a@b.c", firstName: "A" }
        : null
    )
  );
  prismaMock.qualificationSnapshot.findUnique.mockImplementation(({ where }: any) => {
    const snapshot = snapshots[where.userId_period.userId];
    if (!snapshot) return Promise.resolve(null);
    return Promise.resolve({
      userId: where.userId_period.userId,
      period: where.userId_period.period,
      activeDirectCount: snapshot.count,
      qualifiesLevel2: snapshot.l2,
      qualifiesLevel3: snapshot.l3,
    });
  });
  prismaMock.qualificationSnapshot.create.mockImplementation(({ data }: any) => Promise.resolve(data));
  prismaMock.user.count.mockResolvedValue(0);
  prismaMock.commission.createMany.mockImplementation(({ data }: any) =>
    Promise.resolve({ count: data.length })
  );
});

describe("commission engine - Exonoma 3-level computation (spec v1.1 §7.3)", () => {
  it("a fully qualified 3-level upline earns exactly 20% / 18% / 12%", async () => {
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commissionPlan.findFirst.mockResolvedValue(activePlan(EXONOMA_LEVELS));

    const created = await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_123",
      provider: "stripe",
      amount: 100,
      currency: "EUR",
    });

    expect(created).toBe(3);
    const rows = prismaMock.commission.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ agentId: "agentL1", level: 1, rate: 20, amount: 20, wasCompressed: false });
    expect(rows[1]).toMatchObject({ agentId: "agentL2", level: 2, rate: 18, amount: 18, wasCompressed: false });
    expect(rows[2]).toMatchObject({ agentId: "agentL3", level: 3, rate: 12, amount: 12, wasCompressed: false });
    expect(rows.every((r: any) => r.paymentRef === "inv_123" && r.status === "EARNED")).toBe(true);
  });

  it("L1 always earns even with zero active directs", async () => {
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commissionPlan.findFirst.mockResolvedValue(activePlan(EXONOMA_LEVELS));
    snapshots.agentL1 = { count: 0, l2: false, l3: false };

    await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_l1",
      provider: "stripe",
      amount: 100,
      currency: "EUR",
    });

    const rows = prismaMock.commission.createMany.mock.calls[0][0].data;
    expect(rows.find((r: any) => r.level === 1)).toMatchObject({ agentId: "agentL1", amount: 20 });
  });

  it("stops at the end of the upline even if the plan has more levels", async () => {
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commissionPlan.findFirst.mockResolvedValue(
      activePlan([
        ...EXONOMA_LEVELS,
        { level: 4, rate: 5, minActiveDirects: 0 },
        { level: 5, rate: 5, minActiveDirects: 0 },
        { level: 6, rate: 5, minActiveDirects: 0 },
      ])
    );

    const created = await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_456",
      provider: "stripe",
      amount: 100,
      currency: "EUR",
    });

    expect(created).toBe(4); // only 4 ancestors exist
    const rows = prismaMock.commission.createMany.mock.calls[0][0].data;
    expect(rows.map((r: any) => r.level)).toEqual([1, 2, 3, 4]);
  });

  it("does nothing when no plan is active", async () => {
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commissionPlan.findFirst.mockResolvedValue(null);

    const created = await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_789",
      provider: "coingate",
      amount: 100,
      currency: "EUR",
    });

    expect(created).toBe(0);
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });
});

describe("commission engine - dynamic compression (spec v1.1 §7.5)", () => {
  it("an unqualified L2 rolls up to the first L2-qualified sponsor with audit fields", async () => {
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commissionPlan.findFirst.mockResolvedValue(activePlan(EXONOMA_LEVELS));
    // Spec §7.5 example: L2 has only 1 active direct -> not qualified
    snapshots.agentL2 = { count: 1, l2: false, l3: false };

    await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_compress",
      provider: "stripe",
      amount: 100,
      currency: "EUR",
    });

    const rows = prismaMock.commission.createMany.mock.calls[0][0].data;
    const level2 = rows.find((r: any) => r.level === 2);
    // The 18% goes to agentL3 (first qualified above), audit-tracked
    expect(level2).toMatchObject({
      agentId: "agentL3",
      rate: 18,
      amount: 18,
      wasCompressed: true,
      originalBeneficiaryId: "agentL2",
    });
    // agentL3 also keeps their own L3 12% -> two rows for the same agent
    const level3 = rows.find((r: any) => r.level === 3);
    expect(level3).toMatchObject({ agentId: "agentL3", amount: 12, wasCompressed: false });
  });

  it("compression skips multiple unqualified nodes in a row", async () => {
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commissionPlan.findFirst.mockResolvedValue(activePlan(EXONOMA_LEVELS));
    snapshots.agentL2 = { count: 0, l2: false, l3: false };
    snapshots.agentL3 = { count: 1, l2: false, l3: false };
    // agentL4 is the first qualified for L2

    await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_skip2",
      provider: "stripe",
      amount: 100,
      currency: "EUR",
    });

    const rows = prismaMock.commission.createMany.mock.calls[0][0].data;
    const level2 = rows.find((r: any) => r.level === 2);
    expect(level2).toMatchObject({ agentId: "agentL4", wasCompressed: true, originalBeneficiaryId: "agentL2" });
  });

  it("drops the row when no qualified sponsor exists up to the root", async () => {
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commissionPlan.findFirst.mockResolvedValue(activePlan(EXONOMA_LEVELS));
    snapshots.agentL3 = { count: 0, l2: false, l3: false };
    snapshots.agentL4 = { count: 0, l2: false, l3: false };
    // Nobody above the payer qualifies for L3 (needs 5 directs)
    snapshots.agentL1 = { count: 3, l2: true, l3: false };
    snapshots.agentL2 = { count: 3, l2: true, l3: false };

    await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_lost",
      provider: "stripe",
      amount: 100,
      currency: "EUR",
    });

    const rows = prismaMock.commission.createMany.mock.calls[0][0].data;
    expect(rows.map((r: any) => r.level)).toEqual([1, 2]); // L3 dropped
  });

  it("uses the frozen month snapshot, not live state (spec §7.4)", async () => {
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commissionPlan.findFirst.mockResolvedValue(activePlan(EXONOMA_LEVELS));
    // Snapshot says qualified even though the live count would be 0
    snapshots.agentL2 = { count: 3, l2: true, l3: false };
    prismaMock.user.count.mockResolvedValue(0); // live count says otherwise

    await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_frozen",
      provider: "stripe",
      amount: 100,
      currency: "EUR",
    });

    const rows = prismaMock.commission.createMany.mock.calls[0][0].data;
    expect(rows.find((r: any) => r.level === 2)).toMatchObject({ agentId: "agentL2", wasCompressed: false });
    // The snapshot was read, never recomputed live for agentL2
    expect(prismaMock.qualificationSnapshot.create).not.toHaveBeenCalled();
  });

  it("freezes a snapshot on first use when the monthly cron has not run yet", async () => {
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commissionPlan.findFirst.mockResolvedValue(activePlan(EXONOMA_LEVELS));
    delete snapshots.agentL2; // no snapshot for this month yet
    prismaMock.user.count.mockResolvedValue(4); // live: 4 active directs -> L2 yes, L3 no

    await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_first_use",
      provider: "stripe",
      amount: 100,
      currency: "EUR",
    });

    expect(prismaMock.qualificationSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "agentL2",
          activeDirectCount: 4,
          qualifiesLevel2: true,
          qualifiesLevel3: false,
        }),
      })
    );
    const rows = prismaMock.commission.createMany.mock.calls[0][0].data;
    expect(rows.find((r: any) => r.level === 2)).toMatchObject({ agentId: "agentL2" });
  });
});

describe("commission engine - idempotency (spec v1.1 §7.6)", () => {
  it("does not duplicate commissions when the same webhook arrives twice", async () => {
    prismaMock.commission.count.mockResolvedValue(3); // payment already processed
    prismaMock.commissionPlan.findFirst.mockResolvedValue(activePlan(EXONOMA_LEVELS));

    const created = await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_123",
      provider: "stripe",
      amount: 100,
      currency: "EUR",
    });

    expect(created).toBe(0);
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it("ignores zero or negative amounts", async () => {
    const created = await processPaymentCommissions({
      userId: "client",
      paymentRef: "inv_zero",
      provider: "stripe",
      amount: 0,
      currency: "EUR",
    });
    expect(created).toBe(0);
  });
});

describe("commission engine - reversal", () => {
  it("marks linked commissions REVERSED on refund", async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      { id: "c1", status: "EARNED" },
      { id: "c2", status: "EARNED" },
    ]);
    prismaMock.commission.update.mockResolvedValue({});

    const reversed = await reverseCommissionsForPayment("inv_123");

    expect(reversed).toBe(2);
    expect(prismaMock.commission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: { status: "REVERSED", reversedAfterPayout: false },
      })
    );
  });

  it("flags already-PAID commissions for negative carry-over", async () => {
    prismaMock.commission.findMany.mockResolvedValue([{ id: "c1", status: "PAID" }]);
    prismaMock.commission.update.mockResolvedValue({});

    await reverseCommissionsForPayment("inv_paid");

    expect(prismaMock.commission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "REVERSED", reversedAfterPayout: true },
      })
    );
  });

  it("is idempotent: already reversed commissions are skipped", async () => {
    prismaMock.commission.findMany.mockResolvedValue([{ id: "c1", status: "REVERSED" }]);

    const reversed = await reverseCommissionsForPayment("inv_123");

    expect(reversed).toBe(0);
    expect(prismaMock.commission.update).not.toHaveBeenCalled();
  });
});
