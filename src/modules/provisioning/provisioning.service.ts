import { prisma } from "../../config/prisma";
import { encryptData, decryptData } from "../../utils/encryption";
import { easierPropClient } from "../../integrations/easierprop/client";
import { EpConflictError } from "../../integrations/easierprop/types";
import { createAuditEvent } from "../../services/audit.service";
import { ProvisionStatus, OnboardingStepStatus } from "@prisma/client";
import { sendProvisioningCompletedEmail, sendProvisioningFailedEmail } from "../../config/email";
import { getPlanByCode } from "../subscription/plan-catalog";

// Exponential backoff schedule per spec §5.2: 1m, 5m, 15m, 1h, 6h
const BACKOFF_SECONDS = [60, 300, 900, 3600, 21600];
const MAX_ATTEMPTS = parseInt(process.env.EASIERPROP_MAX_RETRY || "5", 10);

const STEP_TO_RESUME_STATUS: Record<string, ProvisionStatus> = {
  create_key: ProvisionStatus.PENDING,
  create_prop_account: ProvisionStatus.KEY_CREATED,
  create_broker_account: ProvisionStatus.PROP_ACCOUNT_CREATED,
  finalize: ProvisionStatus.BROKER_ACCOUNT_CREATED,
};

// ------------------------------------------------------------------
// Trigger (spec §5.2): onboarding complete AND active subscription,
// in either order. Called from onboarding completion and payment webhooks.
// ------------------------------------------------------------------
export const maybeTriggerProvisioning = async (userId: string): Promise<boolean> => {
  const [steps, activeSubscriptions, existing] = await Promise.all([
    prisma.onboardingStep.findMany({
      where: { userId, stepId: { in: ["payment", "broker", "prop"] }, status: OnboardingStepStatus.COMPLETED },
    }),
    prisma.subscription.findMany({
      where: { userId, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } },
    }),
    prisma.easierPropProvision.findUnique({ where: { userId } }),
  ]);

  // The $40 collaborator membership (spec v1.1 §7.2) grants network access
  // only: it never provisions the real product on EasierProp.
  const subscription = activeSubscriptions.find(s => getPlanByCode(s.plan)?.membership !== true);

  const onboardingComplete = ["payment", "broker", "prop"].every(stepId =>
    steps.some(s => s.stepId === stepId)
  );

  if (!onboardingComplete || !subscription) return false;
  if (existing) return false; // never re-trigger automatically; admin uses reprovision

  await prisma.easierPropProvision.create({
    data: { userId, status: ProvisionStatus.PENDING, nextRetryAt: new Date() },
  });

  await auditProvisioning(userId, "PROVISIONING_TRIGGERED", { reason: "onboarding_complete_and_subscription_active" });
  return true;
};

// ------------------------------------------------------------------
// Worker entry points
// ------------------------------------------------------------------

/** Picks up provisions in non-terminal states that are due and processes one step batch each. */
export const processDueProvisions = async (): Promise<void> => {
  const due = await prisma.easierPropProvision.findMany({
    where: {
      status: {
        in: [
          ProvisionStatus.PENDING,
          ProvisionStatus.KEY_CREATED,
          ProvisionStatus.PROP_ACCOUNT_CREATED,
          ProvisionStatus.BROKER_ACCOUNT_CREATED,
        ],
      },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    take: 10,
  });

  for (const provision of due) {
    try {
      await processProvision(provision.id);
    } catch (error) {
      console.error(`Provisioning worker error for ${provision.userId}:`, error);
    }
  }
};

/**
 * Runs the idempotent state machine for one provision until COMPLETED
 * or the first error (which schedules a retry with backoff).
 */
export const processProvision = async (provisionId: string): Promise<void> => {
  let provision = await prisma.easierPropProvision.findUnique({ where: { id: provisionId } });
  if (!provision) return;

  const terminal: ProvisionStatus[] = [
    ProvisionStatus.COMPLETED,
    ProvisionStatus.FAILED,
    ProvisionStatus.DECOMMISSIONED,
  ];
  if (terminal.includes(provision.status)) return;

  let currentStep = "";
  try {
    if (provision.status === ProvisionStatus.PENDING) {
      currentStep = "create_key";
      provision = await stepCreateKey(provision);
    }
    if (provision.status === ProvisionStatus.KEY_CREATED) {
      currentStep = "create_prop_account";
      provision = await stepCreatePropAccount(provision);
    }
    if (provision.status === ProvisionStatus.PROP_ACCOUNT_CREATED) {
      currentStep = "create_broker_account";
      provision = await stepCreateBrokerAccount(provision);
    }
    if (provision.status === ProvisionStatus.BROKER_ACCOUNT_CREATED) {
      currentStep = "finalize";
      provision = await stepFinalize(provision);
    }
  } catch (error: any) {
    await handleStepFailure(provision, currentStep, error);
  }
};

// ------------------------------------------------------------------
// State machine steps (each is idempotent)
// ------------------------------------------------------------------

const stepCreateKey = async (provision: NonNullable<Awaited<ReturnType<typeof prisma.easierPropProvision.findUnique>>>) => {
  // Idempotency: never recreate a key that is already stored (spec §5.2)
  if (provision.epApiKeyEncrypted && provision.epKeyId) {
    return transition(provision.id, ProvisionStatus.KEY_CREATED, { step: "create_key", note: "key already stored" });
  }

  const user = await prisma.user.findUnique({ where: { id: provision.userId } });
  if (!user) throw new Error("User not found for provisioning");

  const created = await easierPropClient.createClientKey(`crm-${user.email}`);

  // The full key is retrievable only once: persist it encrypted IMMEDIATELY.
  return transition(provision.id, ProvisionStatus.KEY_CREATED, { step: "create_key" }, {
    epApiKeyEncrypted: encryptData(created.key),
    epKeyId: created.id,
  });
};

const stepCreatePropAccount = async (provision: any) => {
  const apiKey = decryptData(provision.epApiKeyEncrypted);
  const propAccount = await prisma.propAccount.findFirst({
    where: { userId: provision.userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!propAccount) throw new Error("No active prop account found for provisioning");

  const epId = await ensureEpAccount(apiKey, {
    label: `prop-${propAccount.firmName}-${propAccount.mt5AccountNumber}`,
    mt5_login: propAccount.mt5AccountNumber,
    password: decryptData(propAccount.mt5Password),
    server_name: propAccount.mt5Server,
  });

  await prisma.propAccount.update({ where: { id: propAccount.id }, data: { epAccountId: epId } });

  return transition(provision.id, ProvisionStatus.PROP_ACCOUNT_CREATED, { step: "create_prop_account", epAccountId: epId }, {
    epPropAccountId: epId,
  });
};

const stepCreateBrokerAccount = async (provision: any) => {
  const apiKey = decryptData(provision.epApiKeyEncrypted);
  const brokerAccount = await getHedgeBrokerAccount(provision.userId);
  if (!brokerAccount) throw new Error("No active broker account found for provisioning");

  const epId = await ensureEpAccount(apiKey, {
    label: `broker-${brokerAccount.brokerName}-${brokerAccount.mt5AccountNumber}`,
    mt5_login: brokerAccount.mt5AccountNumber,
    password: decryptData(brokerAccount.mt5Password),
    server_name: brokerAccount.mt5Server,
  });

  await prisma.brokerAccount.update({ where: { id: brokerAccount.id }, data: { epAccountId: epId } });

  return transition(provision.id, ProvisionStatus.BROKER_ACCOUNT_CREATED, { step: "create_broker_account", epAccountId: epId }, {
    epBrokerAccountId: epId,
  });
};

const stepFinalize = async (provision: any) => {
  const [propAccount, brokerAccount] = await Promise.all([
    prisma.propAccount.findFirst({ where: { userId: provision.userId, epAccountId: provision.epPropAccountId } }),
    prisma.brokerAccount.findFirst({ where: { userId: provision.userId, epAccountId: provision.epBrokerAccountId } }),
  ]);

  if (!propAccount || !brokerAccount) {
    throw new Error("Provisioned accounts missing in CRM during finalize");
  }

  // One active hedge setup per user; archive any stale ones first.
  await prisma.hedgeSetup.updateMany({
    where: { userId: provision.userId, status: { not: "archived" } },
    data: { status: "archived" },
  });
  await prisma.hedgeSetup.create({
    data: {
      userId: provision.userId,
      propAccountId: propAccount.id,
      brokerAccountId: brokerAccount.id,
      epPropAccountId: provision.epPropAccountId,
      epBrokerAccountId: provision.epBrokerAccountId,
      status: "active",
    },
  });

  const updated = await transition(provision.id, ProvisionStatus.COMPLETED, { step: "finalize" });

  await notifyUser(
    provision.userId,
    "PROVISIONING",
    "Your trading service is active",
    "Your MT5 accounts have been provisioned and your hedge setup is now active.",
    "MEDIUM"
  );
  await notifyAdmins(
    "Provisioning completed",
    `Provisioning completed for user ${provision.userId}.`,
    "LOW",
    { userId: provision.userId }
  );

  const user = await prisma.user.findUnique({ where: { id: provision.userId } });
  if (user) {
    sendProvisioningCompletedEmail(user.email, user.firstName).catch(() => {});
  }

  return updated;
};

/**
 * Idempotent account creation: checks GET /api/accounts for an account with
 * the same mt5_login before POSTing a new one.
 */
const ensureEpAccount = async (
  apiKey: string,
  account: { label: string; mt5_login: string; password: string; server_name: string }
): Promise<string> => {
  const existing = await easierPropClient.listAccounts(apiKey);
  // Match on login AND server: the same MT5 login can exist at two brokers,
  // and prop/broker accounts must never alias each other.
  const match = existing.find(
    a =>
      String(a.mt5_login) === String(account.mt5_login) &&
      String(a.server_name ?? a.broker_host ?? "") === String(account.server_name)
  );
  if (match) return String(match.id);

  const created = await easierPropClient.createAccount(apiKey, account);
  return String(created.id);
};

/** The hedge broker: the one referenced by the active HedgeSetup, else newest active broker. */
const getHedgeBrokerAccount = async (userId: string) => {
  const hedge = await prisma.hedgeSetup.findFirst({ where: { userId, status: { not: "archived" } } });
  if (hedge) {
    const account = await prisma.brokerAccount.findUnique({ where: { id: hedge.brokerAccountId } });
    if (account && account.archivedAt === null) return account;
  }
  return prisma.brokerAccount.findFirst({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });
};

// ------------------------------------------------------------------
// Failure handling
// ------------------------------------------------------------------

const handleStepFailure = async (provision: any, step: string, error: any) => {
  const attemptCount = provision.attemptCount + 1;
  const message = error?.message ?? String(error);

  // 409 (max_accounts cap): explicit terminal failure needing manual resolution (spec §5.2)
  const isConflict = error instanceof EpConflictError;
  const exhausted = attemptCount >= MAX_ATTEMPTS;

  if (isConflict || exhausted) {
    const failedWrite = await prisma.easierPropProvision.updateMany({
      where: { id: provision.id, status: provision.status, attemptCount: provision.attemptCount },
      data: {
        status: ProvisionStatus.FAILED,
        failedStep: step,
        lastError: message,
        attemptCount,
        nextRetryAt: null,
      },
    });
    if (failedWrite.count === 0) return; // admin reset raced us - respect it
    await auditProvisioning(provision.userId, "PROVISIONING_FAILED", { step, error: message, attemptCount });
    await notifyAdmins(
      "Provisioning FAILED",
      isConflict
        ? `Provisioning for user ${provision.userId} hit the EasierProp max_accounts cap (409) at step ${step}. Raise the cap on EasierProp, then retry from the admin panel.`
        : `Provisioning for user ${provision.userId} failed at step ${step} after ${attemptCount} attempts: ${message}`,
      "HIGH",
      { userId: provision.userId, step, error: message }
    );
    const failedUser = await prisma.user.findUnique({ where: { id: provision.userId } });
    if (failedUser) {
      sendProvisioningFailedEmail(failedUser.email, failedUser.firstName).catch(() => {});
    }
    return;
  }

  const delaySeconds = BACKOFF_SECONDS[Math.min(attemptCount - 1, BACKOFF_SECONDS.length - 1)];
  // Optimistic guard: skip the write-back if an admin retry/reprovision
  // changed the row while this step was running (never clobber their reset).
  const failureWrite = await prisma.easierPropProvision.updateMany({
    where: { id: provision.id, status: provision.status, attemptCount: provision.attemptCount },
    data: {
      failedStep: step,
      lastError: message,
      attemptCount,
      nextRetryAt: new Date(Date.now() + delaySeconds * 1000),
    },
  });
  if (failureWrite.count === 0) return;
  await auditProvisioning(provision.userId, "PROVISIONING_RETRY_SCHEDULED", {
    step,
    error: message,
    attemptCount,
    retryInSeconds: delaySeconds,
  });
};

// ------------------------------------------------------------------
// Admin actions
// ------------------------------------------------------------------

/** Retry resumes from the failed step (spec §5.2). */
export const retryProvision = async (userId: string, adminId: string) => {
  const provision = await prisma.easierPropProvision.findUnique({ where: { userId } });
  if (!provision) throw new Error("No provisioning record for this user");

  const resumeStatus =
    provision.status === ProvisionStatus.FAILED
      ? STEP_TO_RESUME_STATUS[provision.failedStep ?? "create_key"] ?? ProvisionStatus.PENDING
      : provision.status;

  const updated = await prisma.easierPropProvision.update({
    where: { userId },
    data: {
      status: resumeStatus,
      attemptCount: 0,
      nextRetryAt: new Date(),
      lastError: null,
      failedStep: null,
    },
  });

  await auditProvisioning(userId, "PROVISIONING_RETRY_REQUESTED", { by: adminId, resumeStatus });
  return updated;
};

/** Reprovision: full new run after cleanup (spec §5.2). The stored key is kept - never recreated. */
export const reprovision = async (userId: string, adminId: string) => {
  const provision = await prisma.easierPropProvision.findUnique({ where: { userId } });
  if (!provision) throw new Error("No provisioning record for this user");

  // Best-effort cleanup of existing EasierProp accounts
  if (provision.epApiKeyEncrypted) {
    const apiKey = decryptData(provision.epApiKeyEncrypted);
    for (const epId of [provision.epPropAccountId, provision.epBrokerAccountId]) {
      if (!epId) continue;
      try {
        await easierPropClient.deleteAccount(apiKey, epId);
      } catch (error: any) {
        console.warn(`Reprovision cleanup: could not delete EP account ${epId}: ${error.message}`);
      }
    }
  }

  await prisma.hedgeSetup.updateMany({
    where: { userId, status: { not: "archived" } },
    data: { status: "archived" },
  });

  const updated = await prisma.easierPropProvision.update({
    where: { userId },
    data: {
      // Keep the key: EasierProp has no documented revocation and the key is not retrievable again.
      status: provision.epApiKeyEncrypted ? ProvisionStatus.KEY_CREATED : ProvisionStatus.PENDING,
      epPropAccountId: null,
      epBrokerAccountId: null,
      attemptCount: 0,
      nextRetryAt: new Date(),
      lastError: null,
      failedStep: null,
    },
  });

  await auditProvisioning(userId, "PROVISIONING_REPROVISION_REQUESTED", { by: adminId });
  return updated;
};

// ------------------------------------------------------------------
// Status reads
// ------------------------------------------------------------------

const CLIENT_STEP_ORDER: ProvisionStatus[] = [
  ProvisionStatus.PENDING,
  ProvisionStatus.KEY_CREATED,
  ProvisionStatus.PROP_ACCOUNT_CREATED,
  ProvisionStatus.BROKER_ACCOUNT_CREATED,
  ProvisionStatus.COMPLETED,
];

/** Client-facing simplified status (spec §5.6 / §5.7). */
export const getClientProvisioningStatus = async (userId: string) => {
  const [provision, hedge] = await Promise.all([
    prisma.easierPropProvision.findUnique({ where: { userId } }),
    prisma.hedgeSetup.findFirst({ where: { userId, status: { not: "archived" } } }),
  ]);

  if (!provision) {
    return { status: "NOT_STARTED", completedSteps: [], hedgeStatus: null, updatedAt: null };
  }

  const stepIndex = CLIENT_STEP_ORDER.indexOf(provision.status);
  const completedSteps = stepIndex >= 0 ? CLIENT_STEP_ORDER.slice(0, stepIndex + 1).map(String) : [];

  // Clients only see simplified states: setup in progress / active / error
  const simplified =
    provision.status === ProvisionStatus.COMPLETED
      ? "ACTIVE"
      : provision.status === ProvisionStatus.FAILED
        ? "ERROR"
        : provision.status === ProvisionStatus.DECOMMISSIONED
          ? "DECOMMISSIONED"
          : "IN_PROGRESS";

  return {
    status: simplified,
    detail: provision.status,
    completedSteps,
    failedStep: provision.status === ProvisionStatus.FAILED ? provision.failedStep : undefined,
    hedgeStatus: hedge?.status ?? null,
    updatedAt: provision.updatedAt,
  };
};

/** Admin list with status filter (spec §5.6). */
export const listProvisions = async (status?: string) => {
  return prisma.easierPropProvision.findMany({
    where: status ? { status: status as ProvisionStatus } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
};

/** Admin detail: provision + step timeline from audit events (spec §5.6). */
export const getProvisionDetail = async (userId: string) => {
  const [provision, hedge, timeline] = await Promise.all([
    prisma.easierPropProvision.findUnique({ where: { userId } }),
    prisma.hedgeSetup.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.auditEvent.findMany({
      where: {
        resource: "PROVISIONING",
        details: { path: ["userId"], equals: userId },
      },
      orderBy: { timestamp: "asc" },
      take: 100,
    }),
  ]);

  return { provision, hedge, timeline };
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const transition = async (
  provisionId: string,
  status: ProvisionStatus,
  auditDetails: Record<string, unknown>,
  extraData: Record<string, unknown> = {}
) => {
  const updated = await prisma.easierPropProvision.update({
    where: { id: provisionId },
    data: { status, lastError: null, failedStep: null, attemptCount: 0, nextRetryAt: null, ...extraData },
  });
  await auditProvisioning(updated.userId, `PROVISIONING_${status}`, auditDetails);
  return updated;
};

export const auditProvisioning = (userId: string, action: string, details: Record<string, unknown>) =>
  createAuditEvent({
    action,
    resource: "PROVISIONING",
    details: { userId, ...details },
    severity: action.includes("FAILED") ? "HIGH" : "LOW",
  });

export const notifyUser = async (
  userId: string,
  type: "PROVISIONING" | "SERVICE_STATE",
  title: string,
  message: string,
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
) => {
  await prisma.notification.create({
    data: { userId, type, title, message, severity },
  });
};

export const notifyAdmins = async (
  title: string,
  message: string,
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  metadata?: Record<string, unknown>
) => {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await prisma.alert.createMany({
    data: admins.map(admin => ({
      userId: admin.id,
      type: "PROVISIONING" as const,
      title,
      message,
      severity,
      metadata: metadata as any,
    })),
  });
};
