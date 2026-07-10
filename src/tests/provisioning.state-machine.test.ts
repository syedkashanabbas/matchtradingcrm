import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------
// In-memory provision record + prisma mock
// ---------------------------------------------------------------
let provisionRecord: any;

const { prismaMock } = vi.hoisted(() => ({ prismaMock: {
  easierPropProvision: {
    findUnique: vi.fn(async () => (provisionRecord ? { ...provisionRecord } : null)),
    findMany: vi.fn(async () => []),
    update: vi.fn(async ({ data }: any) => {
      provisionRecord = { ...provisionRecord, ...data };
      return { ...provisionRecord };
    }),
    // Optimistic failure write-back: only applies when status+attemptCount
    // still match (mirrors the guard in handleStepFailure)
    updateMany: vi.fn(async ({ where, data }: any) => {
      if (!provisionRecord || provisionRecord.id !== where.id) return { count: 0 };
      if (where.status !== undefined && provisionRecord.status !== where.status) return { count: 0 };
      if (where.attemptCount !== undefined && provisionRecord.attemptCount !== where.attemptCount) return { count: 0 };
      provisionRecord = { ...provisionRecord, ...data };
      return { count: 1 };
    }),
    create: vi.fn(async ({ data }: any) => {
      provisionRecord = {
        id: "prov-1",
        attemptCount: 0,
        epApiKeyEncrypted: null,
        epKeyId: null,
        epPropAccountId: null,
        epBrokerAccountId: null,
        failedStep: null,
        lastError: null,
        nextRetryAt: null,
        updatedAt: new Date(),
        ...data,
      };
      return { ...provisionRecord };
    }),
  },
  user: {
    findUnique: vi.fn(async () => ({ id: "user-1", email: "trader@example.com", firstName: "T" })),
    findMany: vi.fn(async () => [{ id: "admin-1" }]),
  },
  propAccount: {
    findFirst: vi.fn(),
    update: vi.fn(async () => ({})),
  },
  brokerAccount: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(async () => ({})),
  },
  hedgeSetup: {
    findFirst: vi.fn(async () => null),
    updateMany: vi.fn(async () => ({ count: 0 })),
    create: vi.fn(async () => ({ id: "hedge-1" })),
    update: vi.fn(async () => ({})),
  },
  onboardingStep: {
    findMany: vi.fn(async () => []),
  },
  subscription: {
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
  },
  notification: {
    create: vi.fn(async () => ({})),
  },
  alert: {
    createMany: vi.fn(async () => ({ count: 1 })),
  },
  auditEvent: {
    create: vi.fn(async () => ({})),
    findMany: vi.fn(async () => []),
  },
}}));

const { epClientMock } = vi.hoisted(() => ({ epClientMock: {
  createClientKey: vi.fn(),
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  deleteAccount: vi.fn(),
}}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../integrations/easierprop/client", () => ({ easierPropClient: epClientMock }));
vi.mock("../config/email", () => ({
  sendProvisioningCompletedEmail: vi.fn().mockResolvedValue(undefined),
  sendProvisioningFailedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../services/audit.service", () => ({
  createAuditEvent: vi.fn().mockResolvedValue({}),
}));
// Real encryption round-trip is used (dev fallback key)

import { processProvision, retryProvision, maybeTriggerProvisioning } from "../modules/provisioning/provisioning.service";
import { EpConflictError } from "../integrations/easierprop/types";

const PROP_ACCOUNT = {
  id: "prop-1",
  firmName: "FTMO",
  mt5AccountNumber: "111",
  mt5Password: null as string | null, // filled in beforeEach with real ciphertext
  mt5Server: "FTMO-Server",
  isActive: true,
};
const BROKER_ACCOUNT = {
  id: "broker-1",
  brokerName: "ICM",
  mt5AccountNumber: "222",
  mt5Password: null as string | null,
  mt5Server: "ICM-Live",
  archivedAt: null,
};

beforeEach(async () => {
  vi.clearAllMocks();
  const { encryptData } = await import("../utils/encryption");
  PROP_ACCOUNT.mt5Password = encryptData("prop-pass");
  BROKER_ACCOUNT.mt5Password = encryptData("broker-pass");

  provisionRecord = {
    id: "prov-1",
    userId: "user-1",
    status: "PENDING",
    epApiKeyEncrypted: null,
    epKeyId: null,
    epPropAccountId: null,
    epBrokerAccountId: null,
    failedStep: null,
    lastError: null,
    attemptCount: 0,
    nextRetryAt: null,
    updatedAt: new Date(),
  };

  prismaMock.propAccount.findFirst.mockImplementation(async ({ where }: any) => {
    if (where?.isActive) return { ...PROP_ACCOUNT };
    if (where?.epAccountId) return { ...PROP_ACCOUNT, epAccountId: where.epAccountId };
    return { ...PROP_ACCOUNT };
  });
  prismaMock.brokerAccount.findFirst.mockImplementation(async ({ where }: any) => {
    if (where?.epAccountId) return { ...BROKER_ACCOUNT, epAccountId: where.epAccountId };
    return { ...BROKER_ACCOUNT };
  });

  epClientMock.createClientKey.mockResolvedValue({ id: "key-1", key: "sk_test_abc" });
  epClientMock.listAccounts.mockResolvedValue([]);
  epClientMock.createAccount.mockImplementation(async (_key: string, account: any) => ({
    id: account.mt5_login === "111" ? "ep-prop-1" : "ep-broker-1",
    ...account,
  }));
});

describe("provisioning state machine - happy path", () => {
  it("runs PENDING -> KEY_CREATED -> PROP -> BROKER -> COMPLETED in one pass", async () => {
    await processProvision("prov-1");

    expect(provisionRecord.status).toBe("COMPLETED");
    expect(provisionRecord.epKeyId).toBe("key-1");
    expect(provisionRecord.epApiKeyEncrypted).toBeTruthy();
    expect(provisionRecord.epApiKeyEncrypted).not.toContain("sk_test_abc"); // stored encrypted
    expect(provisionRecord.epPropAccountId).toBe("ep-prop-1");
    expect(provisionRecord.epBrokerAccountId).toBe("ep-broker-1");
    expect(prismaMock.hedgeSetup.create).toHaveBeenCalledOnce();
    expect(epClientMock.createClientKey).toHaveBeenCalledOnce();
    expect(epClientMock.createAccount).toHaveBeenCalledTimes(2);
  });

  it("is idempotent: reuses existing EasierProp accounts instead of recreating", async () => {
    epClientMock.listAccounts.mockResolvedValue([
      { id: "ep-existing-prop", mt5_login: "111", server_name: "FTMO-Server" },
      { id: "ep-existing-broker", mt5_login: "222", server_name: "ICM-Live" },
    ]);

    await processProvision("prov-1");

    expect(provisionRecord.status).toBe("COMPLETED");
    expect(provisionRecord.epPropAccountId).toBe("ep-existing-prop");
    expect(provisionRecord.epBrokerAccountId).toBe("ep-existing-broker");
    expect(epClientMock.createAccount).not.toHaveBeenCalled();
  });

  it("never recreates an already stored API key", async () => {
    const { encryptData } = await import("../utils/encryption");
    provisionRecord.epApiKeyEncrypted = encryptData("sk_existing");
    provisionRecord.epKeyId = "key-existing";

    await processProvision("prov-1");

    expect(epClientMock.createClientKey).not.toHaveBeenCalled();
    expect(provisionRecord.status).toBe("COMPLETED");
  });
});

describe("provisioning state machine - failures and retry", () => {
  it("schedules a retry with backoff on transient errors", async () => {
    epClientMock.createClientKey.mockRejectedValue(new Error("network down"));

    await processProvision("prov-1");

    expect(provisionRecord.status).toBe("PENDING"); // stays at pre-step state
    expect(provisionRecord.attemptCount).toBe(1);
    expect(provisionRecord.failedStep).toBe("create_key");
    expect(provisionRecord.lastError).toContain("network down");
    expect(provisionRecord.nextRetryAt).toBeInstanceOf(Date);
    // first backoff = 60s
    const delta = provisionRecord.nextRetryAt.getTime() - Date.now();
    expect(delta).toBeGreaterThan(50_000);
    expect(delta).toBeLessThan(70_000);
  });

  it("goes FAILED after max attempts and alerts admins", async () => {
    provisionRecord.attemptCount = 4; // next failure is the 5th
    epClientMock.createClientKey.mockRejectedValue(new Error("still broken"));

    await processProvision("prov-1");

    expect(provisionRecord.status).toBe("FAILED");
    expect(prismaMock.alert.createMany).toHaveBeenCalled();
  });

  it("goes FAILED immediately on a 409 max_accounts conflict", async () => {
    provisionRecord.status = "KEY_CREATED";
    const { encryptData } = await import("../utils/encryption");
    provisionRecord.epApiKeyEncrypted = encryptData("sk_test_abc");
    provisionRecord.epKeyId = "key-1";
    epClientMock.createAccount.mockRejectedValue(new EpConflictError("/api/accounts"));

    await processProvision("prov-1");

    expect(provisionRecord.status).toBe("FAILED");
    expect(provisionRecord.failedStep).toBe("create_prop_account");
    expect(provisionRecord.attemptCount).toBe(1); // no retries burned on a hard conflict
  });

  it("admin retry resumes from the failed step", async () => {
    provisionRecord.status = "FAILED";
    provisionRecord.failedStep = "create_broker_account";
    provisionRecord.attemptCount = 5;

    await retryProvision("user-1", "admin-1");

    expect(provisionRecord.status).toBe("PROP_ACCOUNT_CREATED"); // resume point
    expect(provisionRecord.attemptCount).toBe(0);
    expect(provisionRecord.lastError).toBeNull();
  });
});

describe("provisioning trigger", () => {
  it("creates a PENDING record only when onboarding is complete AND subscription active", async () => {
    provisionRecord = null;
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { stepId: "payment" },
      { stepId: "broker" },
      { stepId: "prop" },
    ] as any);
    prismaMock.subscription.findMany.mockResolvedValue([{ id: "sub-1", plan: "PRO" }] as any);

    const triggered = await maybeTriggerProvisioning("user-1");

    expect(triggered).toBe(true);
    expect(provisionRecord.status).toBe("PENDING");
  });

  it("does not trigger while a step is missing", async () => {
    provisionRecord = null;
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { stepId: "payment" },
      { stepId: "broker" },
    ] as any);
    prismaMock.subscription.findMany.mockResolvedValue([{ id: "sub-1", plan: "PRO" }] as any);

    expect(await maybeTriggerProvisioning("user-1")).toBe(false);
    expect(provisionRecord).toBeNull();
  });

  it("does not trigger without an active subscription", async () => {
    provisionRecord = null;
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { stepId: "payment" },
      { stepId: "broker" },
      { stepId: "prop" },
    ] as any);
    prismaMock.subscription.findMany.mockResolvedValue([] as any);

    expect(await maybeTriggerProvisioning("user-1")).toBe(false);
  });

  it("never re-triggers when a provision record already exists", async () => {
    prismaMock.onboardingStep.findMany.mockResolvedValue([
      { stepId: "payment" },
      { stepId: "broker" },
      { stepId: "prop" },
    ] as any);
    prismaMock.subscription.findMany.mockResolvedValue([{ id: "sub-1", plan: "PRO" }] as any);
    // provisionRecord exists from beforeEach

    expect(await maybeTriggerProvisioning("user-1")).toBe(false);
  });
});
