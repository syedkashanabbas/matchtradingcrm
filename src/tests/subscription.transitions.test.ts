import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------
const { prismaMock } = vi.hoisted(() => ({ prismaMock: {
  subscription: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(async ({ where, data }: any) => ({ id: where.id ?? "sub-1", userId: "user-1", ...data })),
    create: vi.fn(async ({ data }: any) => ({ id: "sub-1", ...data })),
  },
  user: {
    update: vi.fn(async () => ({})),
    findUnique: vi.fn(async () => ({ id: "user-1", status: "ACTIVE" })),
    findMany: vi.fn(async () => [{ id: "admin-1" }]),
  },
  alert: {
    create: vi.fn(async () => ({})),
    createMany: vi.fn(async () => ({ count: 1 })),
  },
  hedgeSetup: {
    findFirst: vi.fn(),
  },
  serviceCommand: {
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    updateMany: vi.fn(async () => ({ count: 0 })),
    create: vi.fn(async ({ data }: any) => ({ id: "cmd-1", ...data })),
  },
  onboardingStep: {
    upsert: vi.fn(async () => ({})),
    findMany: vi.fn(async () => []),
  },
  easierPropProvision: {
    findUnique: vi.fn(async () => null),
  },
  auditEvent: {
    create: vi.fn(async () => ({})),
  },
  cryptoOrder: {
    findMany: vi.fn(async () => []),
  },
}}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../config/stripe", () => ({ stripe: {} }));
vi.mock("../config/env-validation", () => ({
  env: { CLIENT_URL: "http://localhost:3000", PORT: "5000" },
  validateEnv: () => {},
}));
vi.mock("../config/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../services/audit.service", () => ({
  createAuditEvent: vi.fn().mockResolvedValue({}),
}));

import {
  applyPaymentFailure,
  handleSubscriptionPaymentFailed,
} from "../modules/subscription/subscription.service";
import { processSubscriptionLifecycle } from "../cron/subscription.cron";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("payment failure -> grace period (user state transitions)", () => {
  it("moves the subscription to PAST_DUE with a 7-day grace period and suspends the user", async () => {
    prismaMock.hedgeSetup.findFirst.mockResolvedValue({ id: "hedge-1", status: "active" });

    await applyPaymentFailure("sub-1");

    // Subscription -> PAST_DUE with gracePeriodEnd ~7 days out
    const subUpdate = prismaMock.subscription.update.mock.calls[0][0];
    expect(subUpdate.data.status).toBe("PAST_DUE");
    const graceMs = subUpdate.data.gracePeriodEnd.getTime() - Date.now();
    expect(graceMs).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
    expect(graceMs).toBeLessThan(7.1 * 24 * 3600 * 1000);

    // User -> SUSPENDED
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SUSPENDED" }) })
    );

    // Alert to the user
    expect(prismaMock.alert.create).toHaveBeenCalled();

    // Automatic service STOP queued (spec §5.5)
    expect(prismaMock.serviceCommand.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "STOP" }) })
    );
  });

  it("does not queue a STOP when there is no active hedge setup", async () => {
    prismaMock.hedgeSetup.findFirst.mockResolvedValue(null);

    await applyPaymentFailure("sub-1");

    expect(prismaMock.serviceCommand.create).not.toHaveBeenCalled();
  });

  it("ignores payment failures for unknown Stripe subscriptions", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);

    const result = await handleSubscriptionPaymentFailed("sub_unknown");

    expect(result).toBeNull();
    expect(prismaMock.subscription.update).not.toHaveBeenCalled();
  });
});

describe("subscription lifecycle cron", () => {
  it("moves expired ACTIVE subscriptions into the grace period", async () => {
    prismaMock.subscription.findMany
      .mockResolvedValueOnce([{ id: "sub-expired", userId: "user-1" }]) // expired ACTIVE
      .mockResolvedValueOnce([]); // none past grace
    prismaMock.hedgeSetup.findFirst.mockResolvedValue(null);

    await processSubscriptionLifecycle();

    const subUpdate = prismaMock.subscription.update.mock.calls[0][0];
    expect(subUpdate.where.id).toBe("sub-expired");
    expect(subUpdate.data.status).toBe("PAST_DUE");
  });

  it("suspends users whose grace period ran out", async () => {
    prismaMock.subscription.findMany
      .mockResolvedValueOnce([]) // no freshly expired
      .mockResolvedValueOnce([{ id: "sub-grace", userId: "user-2" }]); // grace ran out
    prismaMock.hedgeSetup.findFirst.mockResolvedValue({ id: "hedge-2", status: "active" });

    await processSubscriptionLifecycle();

    expect(prismaMock.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sub-grace" }, data: { status: "UNPAID" } })
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-2" }, data: { status: "INACTIVE" } })
    );
    expect(prismaMock.serviceCommand.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "STOP", userId: "user-2" }) })
    );
  });
});
