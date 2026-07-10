import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------
let orderRecord: any;

const { prismaMock } = vi.hoisted(() => ({ prismaMock: {
  cryptoOrder: {
    findUnique: vi.fn(async ({ where }: any) =>
      orderRecord && where.localOrderId === orderRecord.localOrderId ? { ...orderRecord } : null
    ),
    update: vi.fn(async ({ data }: any) => {
      orderRecord = { ...orderRecord, ...data };
      return { ...orderRecord };
    }),
    // Conditional claim used by the IPN handler: only updates when the
    // order is not already paid/confirmed (returns count accordingly)
    updateMany: vi.fn(async ({ where, data }: any) => {
      if (!orderRecord || orderRecord.id !== where.id) return { count: 0 };
      const notIn: string[] = where.status?.notIn ?? [];
      if (notIn.includes(orderRecord.status)) return { count: 0 };
      orderRecord = { ...orderRecord, ...data };
      return { count: 1 };
    }),
  },
  subscription: {
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    create: vi.fn(async ({ data }: any) => ({ id: "sub-1", ...data })),
    update: vi.fn(async ({ data }: any) => ({ id: "sub-1", ...data })),
  },
  user: {
    update: vi.fn(async () => ({})),
    findUnique: vi.fn(async () => ({ id: "user-1", status: "ONBOARDING" })),
    findMany: vi.fn(async () => []),
  },
  onboardingStep: {
    upsert: vi.fn(async () => ({})),
    findMany: vi.fn(async () => []),
  },
  easierPropProvision: {
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
  },
  hedgeSetup: {
    findFirst: vi.fn(async () => null),
  },
  serviceCommand: {
    findMany: vi.fn(async () => []),
    updateMany: vi.fn(async () => ({ count: 0 })),
    create: vi.fn(async ({ data }: any) => ({ id: "cmd-1", ...data })),
  },
  auditEvent: {
    create: vi.fn(async () => ({})),
  },
  commission: {
    count: vi.fn(async () => 0),
    findMany: vi.fn(async () => []),
  },
  commissionPlan: {
    findFirst: vi.fn(async () => null),
  },
}}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../services/audit.service", () => ({
  createAuditEvent: vi.fn().mockResolvedValue({}),
}));
vi.mock("../config/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  sendCommissionEarnedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../config/stripe", () => ({ stripe: {} }));
vi.mock("../config/env-validation", () => ({
  env: { CLIENT_URL: "http://localhost:3000", PORT: "5000" },
  validateEnv: () => {},
}));

import { handleCoinGateIpn } from "../webhooks/coingate.webhook";

const makeRes = () => {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
  orderRecord = {
    id: "order-1",
    userId: "user-1",
    planCode: "PRO",
    localOrderId: "eidos-subscription-abc",
    coingateOrderId: "cg-1",
    ipnToken: "secret-token-123",
    amount: 199,
    currency: "EUR",
    status: "pending",
    purpose: "subscription",
    ipnHistory: [],
  };
});

describe("CoinGate IPN - security", () => {
  it("rejects a forged IPN (wrong token) with 401 and does not activate anything", async () => {
    const res = makeRes();
    await handleCoinGateIpn(
      {
        body: { order_id: "eidos-subscription-abc", token: "WRONG", status: "paid" },
        ip: "1.2.3.4",
      } as any,
      res
    );

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
    expect(prismaMock.subscription.create).not.toHaveBeenCalled();
    expect(prismaMock.cryptoOrder.update).not.toHaveBeenCalled();
    expect(prismaMock.cryptoOrder.updateMany).not.toHaveBeenCalled();
  });

  it("rejects incomplete payloads with 400", async () => {
    const res = makeRes();
    await handleCoinGateIpn({ body: { order_id: "x" } } as any, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 for unknown orders", async () => {
    const res = makeRes();
    await handleCoinGateIpn(
      { body: { order_id: "nope", token: "t", status: "paid" } } as any,
      res
    );
    expect(res.statusCode).toBe(404);
  });
});

describe("CoinGate IPN - activation", () => {
  it("activates the subscription on a valid 'paid' IPN", async () => {
    const res = makeRes();
    await handleCoinGateIpn(
      {
        body: { order_id: "eidos-subscription-abc", token: "secret-token-123", status: "paid", id: "cg-1" },
      } as any,
      res
    );

    expect(res.statusCode).toBe(200);
    expect(orderRecord.status).toBe("paid");
    expect(prismaMock.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          provider: "coingate",
          plan: "PRO",
          status: "ACTIVE",
        }),
      })
    );
    // Onboarding payment step completed
    expect(prismaMock.onboardingStep.upsert).toHaveBeenCalled();
  });

  it("does not re-activate on a duplicate 'paid' IPN", async () => {
    orderRecord.status = "paid"; // already processed

    const res = makeRes();
    await handleCoinGateIpn(
      {
        body: { order_id: "eidos-subscription-abc", token: "secret-token-123", status: "paid" },
      } as any,
      res
    );

    expect(res.statusCode).toBe(200);
    expect(prismaMock.subscription.create).not.toHaveBeenCalled();
  });

  it("records non-final statuses without activating", async () => {
    const res = makeRes();
    await handleCoinGateIpn(
      {
        body: { order_id: "eidos-subscription-abc", token: "secret-token-123", status: "confirming" },
      } as any,
      res
    );

    expect(res.statusCode).toBe(200);
    expect(orderRecord.status).toBe("confirming");
    expect(prismaMock.subscription.create).not.toHaveBeenCalled();
  });
});
