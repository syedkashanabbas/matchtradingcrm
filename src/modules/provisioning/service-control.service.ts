import { prisma } from "../../config/prisma";
import { decryptData } from "../../utils/encryption";
import { easierPropClient } from "../../integrations/easierprop/client";
import { EpConflictError, EpNotFoundError } from "../../integrations/easierprop/types";
import { createAuditEvent } from "../../services/audit.service";
import { ProvisionStatus } from "@prisma/client";
import { notifyUser, notifyAdmins } from "./provisioning.service";

const BACKOFF_SECONDS = [60, 300, 900, 3600, 21600];
const MAX_ATTEMPTS = parseInt(process.env.EASIERPROP_MAX_RETRY || "5", 10);

export type ServiceCommandType =
  | "START"
  | "STOP"
  | "DELETE"
  | "SYNC_PROP_ROTATION"
  | "SYNC_BROKER_REPLACE"
  | "SYNC_BROKER_ADD"
  | "SET_HEDGE_BROKER";

/**
 * Enqueues a service-control / sync operation. Operations always go through
 * the worker queue with retry - never direct calls from HTTP requests (§5.5).
 * Consecutive duplicates are collapsed.
 */
export const enqueueServiceCommand = async (
  userId: string,
  type: ServiceCommandType,
  payload: Record<string, unknown> = {},
  createdBy: string = "system"
) => {
  // Collapse only true duplicates: same type AND same payload. Distinct
  // payload-driven operations (SYNC_*, SET_HEDGE_BROKER) must never be dropped.
  const pending = await prisma.serviceCommand.findMany({
    where: { userId, type, status: "PENDING" },
  });
  const samePayload = (a: unknown) => JSON.stringify(a ?? {}) === JSON.stringify(payload ?? {});
  const pendingDuplicate = pending.find(command => samePayload(command.payload));
  if (pendingDuplicate) return pendingDuplicate;

  const command = await prisma.serviceCommand.create({
    data: { userId, type, payload: payload as any, createdBy, nextRetryAt: new Date() },
  });

  await createAuditEvent({
    action: `SERVICE_COMMAND_ENQUEUED`,
    resource: "SERVICE",
    details: { userId, type, payload, createdBy },
    severity: type === "DELETE" ? "HIGH" : "MEDIUM",
  });

  return command;
};

const STUCK_RUNNING_MINUTES = 10;

/** Worker tick: processes due commands (oldest first, one at a time per user). */
export const processDueServiceCommands = async (): Promise<void> => {
  // Crash recovery: a command left RUNNING (process died mid-execution) is
  // requeued after a lease timeout. Executors are idempotent, so re-running
  // a half-executed command is safe.
  const stuckBefore = new Date(Date.now() - STUCK_RUNNING_MINUTES * 60 * 1000);
  const requeued = await prisma.serviceCommand.updateMany({
    where: { status: "RUNNING", updatedAt: { lt: stuckBefore } },
    data: { status: "PENDING", nextRetryAt: new Date(), lastError: "requeued after stuck RUNNING (worker crash?)" },
  });
  if (requeued.count > 0) {
    console.warn(`⚠️  Requeued ${requeued.count} service command(s) stuck in RUNNING`);
  }

  const due = await prisma.serviceCommand.findMany({
    where: {
      status: "PENDING",
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const seenUsers = new Set<string>();
  for (const command of due) {
    if (seenUsers.has(command.userId)) continue; // keep per-user ordering
    seenUsers.add(command.userId);
    try {
      await processServiceCommand(command.id);
    } catch (error) {
      console.error(`Service command worker error (${command.type} for ${command.userId}):`, error);
    }
  }
};

export const processServiceCommand = async (commandId: string): Promise<void> => {
  const command = await prisma.serviceCommand.findUnique({ where: { id: commandId } });
  if (!command || command.status !== "PENDING") return;

  await prisma.serviceCommand.update({ where: { id: commandId }, data: { status: "RUNNING" } });

  try {
    switch (command.type as ServiceCommandType) {
      case "START":
        await executeStart(command.userId);
        break;
      case "STOP":
        await executeStop(command.userId);
        break;
      case "DELETE":
        await executeDelete(command.userId);
        break;
      case "SYNC_PROP_ROTATION":
        await executePropRotation(command.userId, command.payload as any);
        break;
      case "SYNC_BROKER_REPLACE":
        await executeBrokerReplace(command.userId, command.payload as any);
        break;
      case "SYNC_BROKER_ADD":
        await executeBrokerAdd(command.userId, command.payload as any);
        break;
      case "SET_HEDGE_BROKER":
        await executeSetHedgeBroker(command.userId, command.payload as any);
        break;
      default:
        throw new Error(`Unknown service command type: ${command.type}`);
    }

    await prisma.serviceCommand.update({
      where: { id: commandId },
      data: { status: "COMPLETED", lastError: null },
    });
  } catch (error: any) {
    await handleCommandFailure(command, error);
  }
};

const handleCommandFailure = async (command: any, error: any) => {
  const attemptCount = command.attemptCount + 1;
  const message = error?.message ?? String(error);
  const isConflict = error instanceof EpConflictError;
  const exhausted = attemptCount >= MAX_ATTEMPTS;

  if (isConflict || exhausted) {
    await prisma.serviceCommand.update({
      where: { id: command.id },
      data: { status: "FAILED", attemptCount, lastError: message, nextRetryAt: null },
    });
    await notifyAdmins(
      `Service operation FAILED: ${command.type}`,
      isConflict
        ? `${command.type} for user ${command.userId} hit the EasierProp max_accounts cap (409). Raise the cap on EasierProp (raise-max-sub-accounts), then re-run the operation.`
        : `${command.type} for user ${command.userId} failed after ${attemptCount} attempts: ${message}`,
      "HIGH",
      { userId: command.userId, commandId: command.id, type: command.type }
    );
    await createAuditEvent({
      action: "SERVICE_COMMAND_FAILED",
      resource: "SERVICE",
      details: { userId: command.userId, type: command.type, error: message, attemptCount },
      severity: "HIGH",
    });
    return;
  }

  const delaySeconds = BACKOFF_SECONDS[Math.min(attemptCount - 1, BACKOFF_SECONDS.length - 1)];
  await prisma.serviceCommand.update({
    where: { id: command.id },
    data: {
      status: "PENDING",
      attemptCount,
      lastError: message,
      nextRetryAt: new Date(Date.now() + delaySeconds * 1000),
    },
  });
};

// ------------------------------------------------------------------
// Command executors (spec §5.5)
// ------------------------------------------------------------------

const getProvisionedContext = async (userId: string) => {
  const provision = await prisma.easierPropProvision.findUnique({ where: { userId } });
  if (!provision?.epApiKeyEncrypted) {
    throw new Error("User has no EasierProp API key (not provisioned)");
  }
  const hedge = await prisma.hedgeSetup.findFirst({
    where: { userId, status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
  });
  return { provision, hedge, apiKey: decryptData(provision.epApiKeyEncrypted) };
};

/** Start / Reactivate: enable + auto_connect both accounts, connect sessions, hedge -> active. */
const executeStart = async (userId: string) => {
  const { provision, hedge, apiKey } = await getProvisionedContext(userId);
  if (!hedge) throw new Error("No hedge setup to start");

  for (const epId of [hedge.epPropAccountId, hedge.epBrokerAccountId]) {
    await easierPropClient.updateAccount(apiKey, epId, { is_enabled: true, auto_connect: true });
    await easierPropClient.connectSession(apiKey, epId);
  }

  await prisma.hedgeSetup.update({ where: { id: hedge.id }, data: { status: "active" } });

  await createAuditEvent({
    action: "SERVICE_STARTED",
    resource: "SERVICE",
    details: { userId, hedgeSetupId: hedge.id },
    severity: "MEDIUM",
  });
  await notifyUser(userId, "SERVICE_STATE", "Service activated", "Your trading service is now active.", "MEDIUM");
};

/** Stop (suspension): disconnect sessions, disable accounts, hedge -> paused. */
const executeStop = async (userId: string) => {
  // Entitlement re-check at execution time: a STOP queued before a renewal
  // payment landed must not suspend a now-paying user (stale-command guard).
  const [user, activeSubscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { status: true } }),
    prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } },
    }),
  ]);
  if (activeSubscription && user?.status === "ACTIVE") {
    await createAuditEvent({
      action: "SERVICE_STOP_SKIPPED",
      resource: "SERVICE",
      details: { userId, reason: "subscription active again at execution time" },
      severity: "MEDIUM",
    });
    return;
  }

  const { hedge, apiKey } = await getProvisionedContext(userId);
  if (!hedge) throw new Error("No hedge setup to stop");

  for (const epId of [hedge.epPropAccountId, hedge.epBrokerAccountId]) {
    try {
      await easierPropClient.disconnectSession(apiKey, epId);
    } catch (error: any) {
      if (!(error instanceof EpNotFoundError)) throw error;
    }
    await easierPropClient.updateAccount(apiKey, epId, { is_enabled: false, auto_connect: false });
  }

  await prisma.hedgeSetup.update({ where: { id: hedge.id }, data: { status: "paused" } });

  await createAuditEvent({
    action: "SERVICE_STOPPED",
    resource: "SERVICE",
    details: { userId, hedgeSetupId: hedge.id },
    severity: "MEDIUM",
  });
  await notifyUser(userId, "SERVICE_STATE", "Service suspended", "Your trading service has been suspended.", "HIGH");
};

/**
 * Delete (permanent): remove both EasierProp accounts. CRM data (encrypted
 * credentials, history) is kept - only the EasierProp side is deleted.
 * Note: EasierProp has no documented key-revocation endpoint; the key remains
 * inert with no associated accounts.
 */
const executeDelete = async (userId: string) => {
  const { provision, hedge, apiKey } = await getProvisionedContext(userId);

  // Delete EVERY account registered under this client's key (extra brokers
  // added via SYNC_BROKER_ADD included), not just the hedge pair.
  let epIds: string[];
  try {
    const all = await easierPropClient.listAccounts(apiKey);
    epIds = all.map(account => String(account.id));
  } catch {
    epIds = (hedge
      ? [hedge.epPropAccountId, hedge.epBrokerAccountId]
      : [provision.epPropAccountId, provision.epBrokerAccountId].filter(Boolean)) as string[];
  }

  for (const epId of epIds) {
    try {
      await easierPropClient.deleteAccount(apiKey, epId);
    } catch (error: any) {
      if (!(error instanceof EpNotFoundError)) throw error; // already gone is fine
    }
  }

  // The CRM-side records keep history but no longer point at live EP accounts
  await prisma.brokerAccount.updateMany({ where: { userId, epAccountId: { not: null } }, data: { epAccountId: null } });
  await prisma.propAccount.updateMany({ where: { userId, epAccountId: { not: null } }, data: { epAccountId: null } });

  if (hedge) {
    await prisma.hedgeSetup.update({ where: { id: hedge.id }, data: { status: "archived" } });
  }
  await prisma.easierPropProvision.update({
    where: { userId },
    data: { status: ProvisionStatus.DECOMMISSIONED },
  });

  await createAuditEvent({
    action: "SERVICE_DELETED",
    resource: "SERVICE",
    details: { userId, epIds },
    severity: "HIGH",
  });
  await notifyUser(
    userId,
    "SERVICE_STATE",
    "Service deleted",
    "Your trading service has been removed. Your data remains stored securely in the CRM.",
    "HIGH"
  );
};

/**
 * Prop rotation (spec §5.4): register the new prop account on EasierProp,
 * remove the old one, update the active hedge setup and the provision record.
 */
const executePropRotation = async (userId: string, payload: { newPropAccountId: string }) => {
  const { provision, hedge, apiKey } = await getProvisionedContext(userId);

  const newProp = await prisma.propAccount.findFirst({
    where: { id: payload.newPropAccountId, userId },
  });
  if (!newProp) throw new Error("New prop account not found");

  const newEpId = await ensureEpAccount(apiKey, {
    label: `prop-${newProp.firmName}-${newProp.mt5AccountNumber}`,
    mt5_login: newProp.mt5AccountNumber,
    password: decryptData(newProp.mt5Password),
    server_name: newProp.mt5Server,
  });
  await prisma.propAccount.update({ where: { id: newProp.id }, data: { epAccountId: newEpId } });

  // Remove the previous EasierProp account (best-effort: it may already be gone)
  const oldEpId = provision.epPropAccountId;
  if (oldEpId && oldEpId !== newEpId) {
    try {
      await easierPropClient.deleteAccount(apiKey, oldEpId);
    } catch (error: any) {
      if (!(error instanceof EpNotFoundError)) throw error;
    }
  }

  await prisma.easierPropProvision.update({
    where: { userId },
    data: { epPropAccountId: newEpId },
  });
  if (hedge) {
    await prisma.hedgeSetup.update({
      where: { id: hedge.id },
      data: { propAccountId: newProp.id, epPropAccountId: newEpId },
    });
  }

  await createAuditEvent({
    action: "PROP_ROTATED",
    resource: "SERVICE",
    details: { userId, newPropAccountId: newProp.id, newEpId, oldEpId },
    severity: "MEDIUM",
  });
  await notifyUser(
    userId,
    "SERVICE_STATE",
    "Prop account updated",
    `Your new ${newProp.firmName} account has been registered and your hedge setup updated.`,
    "MEDIUM"
  );
};

/** Broker replacement (spec §5.4): register new, remove old, update hedge setup. */
const executeBrokerReplace = async (
  userId: string,
  payload: { newBrokerAccountId: string; oldBrokerAccountId?: string }
) => {
  const { provision, hedge, apiKey } = await getProvisionedContext(userId);

  const newBroker = await prisma.brokerAccount.findFirst({
    where: { id: payload.newBrokerAccountId, userId },
  });
  if (!newBroker) throw new Error("New broker account not found");

  const newEpId = await ensureEpAccount(apiKey, {
    label: `broker-${newBroker.brokerName}-${newBroker.mt5AccountNumber}`,
    mt5_login: newBroker.mt5AccountNumber,
    password: decryptData(newBroker.mt5Password),
    server_name: newBroker.mt5Server,
  });
  await prisma.brokerAccount.update({ where: { id: newBroker.id }, data: { epAccountId: newEpId } });

  // Remove the replaced broker's EasierProp account
  const oldBroker = payload.oldBrokerAccountId
    ? await prisma.brokerAccount.findFirst({ where: { id: payload.oldBrokerAccountId, userId } })
    : null;
  const oldEpId = oldBroker?.epAccountId ?? (hedge?.epBrokerAccountId !== newEpId ? hedge?.epBrokerAccountId : null);
  if (oldEpId && oldEpId !== newEpId) {
    try {
      await easierPropClient.deleteAccount(apiKey, oldEpId);
    } catch (error: any) {
      if (!(error instanceof EpNotFoundError)) throw error;
    }
  }

  await prisma.easierPropProvision.update({ where: { userId }, data: { epBrokerAccountId: newEpId } });
  if (hedge) {
    await prisma.hedgeSetup.update({
      where: { id: hedge.id },
      data: { brokerAccountId: newBroker.id, epBrokerAccountId: newEpId },
    });
  }

  await createAuditEvent({
    action: "BROKER_REPLACED",
    resource: "SERVICE",
    details: { userId, newBrokerAccountId: newBroker.id, newEpId, oldEpId },
    severity: "MEDIUM",
  });
  await notifyUser(
    userId,
    "SERVICE_STATE",
    "Broker account updated",
    `Your new ${newBroker.brokerName} account has been registered and your hedge setup updated.`,
    "MEDIUM"
  );
};

/** Broker addition (spec §5.4): register alongside existing; 409 -> admin alert (cap). */
const executeBrokerAdd = async (userId: string, payload: { brokerAccountId: string }) => {
  const { apiKey } = await getProvisionedContext(userId);

  const broker = await prisma.brokerAccount.findFirst({
    where: { id: payload.brokerAccountId, userId },
  });
  if (!broker) throw new Error("Broker account not found");

  const epId = await ensureEpAccount(apiKey, {
    label: `broker-${broker.brokerName}-${broker.mt5AccountNumber}`,
    mt5_login: broker.mt5AccountNumber,
    password: decryptData(broker.mt5Password),
    server_name: broker.mt5Server,
  });
  await prisma.brokerAccount.update({ where: { id: broker.id }, data: { epAccountId: epId } });

  await createAuditEvent({
    action: "BROKER_ADDED",
    resource: "SERVICE",
    details: { userId, brokerAccountId: broker.id, epId },
    severity: "MEDIUM",
  });
};

/** Hedge-broker selector (spec §5.4): point the hedge setup at the designated broker. */
const executeSetHedgeBroker = async (userId: string, payload: { brokerAccountId: string }) => {
  const { hedge } = await getProvisionedContext(userId);
  if (!hedge) throw new Error("No hedge setup");

  const broker = await prisma.brokerAccount.findFirst({
    where: { id: payload.brokerAccountId, userId, archivedAt: null },
  });
  if (!broker) throw new Error("Broker account not found or archived");
  if (!broker.epAccountId) {
    throw new Error("Broker is not registered on EasierProp yet - add it first");
  }

  await prisma.hedgeSetup.update({
    where: { id: hedge.id },
    data: { brokerAccountId: broker.id, epBrokerAccountId: broker.epAccountId },
  });
  await prisma.easierPropProvision.update({
    where: { userId },
    data: { epBrokerAccountId: broker.epAccountId },
  });

  await createAuditEvent({
    action: "HEDGE_BROKER_CHANGED",
    resource: "SERVICE",
    details: { userId, brokerAccountId: broker.id, epAccountId: broker.epAccountId },
    severity: "MEDIUM",
  });
};

// Shared with provisioning.service - local copy to avoid import cycles.
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

/** Live service + session state for the admin detail view (spec §5.5/§5.6). */
export const getServiceStatus = async (userId: string) => {
  const provision = await prisma.easierPropProvision.findUnique({ where: { userId } });
  const hedge = await prisma.hedgeSetup.findFirst({
    where: { userId, status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
  });
  const recentCommands = await prisma.serviceCommand.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  let sessions: Array<{ accountId: string; kind: string; connected: boolean | null; error?: string }> = [];
  if (provision?.epApiKeyEncrypted && hedge) {
    const apiKey = decryptData(provision.epApiKeyEncrypted);
    for (const [kind, epId] of [["prop", hedge.epPropAccountId], ["broker", hedge.epBrokerAccountId]] as const) {
      try {
        const status = await easierPropClient.connectionStatus(apiKey, epId);
        sessions.push({ accountId: epId, kind, connected: Boolean(status.connected) });
      } catch (error: any) {
        sessions.push({ accountId: epId, kind, connected: null, error: error.message });
      }
    }
  }

  return {
    provisionStatus: provision?.status ?? "NOT_STARTED",
    hedgeStatus: hedge?.status ?? null,
    sessions,
    recentCommands,
  };
};
