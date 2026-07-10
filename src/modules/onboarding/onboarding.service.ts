import { prisma } from "../../config/prisma";
import { encryptData } from "../../utils/encryption";
import { maskSecret } from "../../utils/encryption";
import { OnboardingStepStatus, ClientStatus, PropPhase } from "@prisma/client";
import type { OnboardingBrokerInput, OnboardingPropInput } from "./onboarding.validation";

export const ONBOARDING_STEPS = ["payment", "broker", "prop"] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export const createOnboardingBroker = async (userId: string, brokerData: OnboardingBrokerInput) => {
  const encryptedPassword = encryptData(brokerData.mt5Password);
  const encryptedPortalPassword = brokerData.brokerPortalPassword
    ? encryptData(brokerData.brokerPortalPassword)
    : null;

  const brokerConfig = await prisma.brokerAccount.create({
    data: {
      userId,
      brokerName: brokerData.brokerName,
      mt5AccountNumber: brokerData.mt5AccountNumber,
      mt5Password: encryptedPassword,
      mt5Server: brokerData.mt5Server,
      brokerPortalPassword: encryptedPortalPassword,
      status: "active",
    },
  });

  await completeStep(userId, "broker");

  return {
    id: brokerConfig.id,
    brokerName: brokerConfig.brokerName,
    mt5AccountNumber: brokerConfig.mt5AccountNumber,
    mt5Server: brokerConfig.mt5Server,
    status: brokerConfig.status,
    createdAt: brokerConfig.createdAt,
  };
};

export const createOnboardingProp = async (userId: string, propData: OnboardingPropInput) => {
  const encryptedMt5Password = encryptData(propData.mt5Password);

  // Re-submitting archives the previous prop account (rotation semantics, §5.4)
  await prisma.propAccount.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false, phase: PropPhase.ARCHIVED, archivedAt: new Date() },
  });

  const propConfig = await prisma.propAccount.create({
    data: {
      userId,
      firmName: propData.firmName,
      phase: propData.phase as PropPhase,
      mt5AccountNumber: propData.mt5AccountNumber,
      mt5Password: encryptedMt5Password,
      mt5Server: propData.mt5Server,
      ftmoCreditDetail: propData.ftmoCreditDetail ?? null,
      ftmoAccountDetail: propData.ftmoAccountDetail ?? null,
      ftmoUserName: propData.ftmoUserName ?? null,
      isActive: true,
      status: "active",
    },
  });

  await completeStep(userId, "prop");

  return {
    id: propConfig.id,
    firmName: propConfig.firmName,
    mt5AccountNumber: propConfig.mt5AccountNumber,
    mt5Server: propConfig.mt5Server,
    phase: propConfig.phase,
    status: propConfig.status,
    createdAt: propConfig.createdAt,
  };
};

/**
 * Marks an onboarding step COMPLETED and recomputes overall progress.
 * Called by the step endpoints and by the payment webhook (payment step).
 */
export const completeStep = async (userId: string, stepId: OnboardingStepId) => {
  await prisma.onboardingStep.upsert({
    where: { userId_stepId: { userId, stepId } },
    update: { status: OnboardingStepStatus.COMPLETED, completedAt: new Date() },
    create: { userId, stepId, status: OnboardingStepStatus.COMPLETED, completedAt: new Date() },
  });

  const allDone = await recomputeOnboardingProgress(userId);

  if (allDone) {
    // Provisioning trigger (spec §5.2): onboarding complete + active subscription.
    // Dynamic import avoids a module cycle with the provisioning service.
    const { maybeTriggerProvisioning } = await import("../provisioning/provisioning.service");
    await maybeTriggerProvisioning(userId);
  }
};

/**
 * Recomputes user.onboardingProgress and user.status from the step records.
 * Returns true when every required step is complete.
 */
export const recomputeOnboardingProgress = async (userId: string): Promise<boolean> => {
  const steps = await prisma.onboardingStep.findMany({
    where: { userId, stepId: { in: [...ONBOARDING_STEPS] } },
  });

  const completed = new Set(
    steps.filter(s => s.status === OnboardingStepStatus.COMPLETED).map(s => s.stepId)
  );

  const allDone = ONBOARDING_STEPS.every(stepId => completed.has(stepId));
  const progress = allDone
    ? "completed"
    : completed.size === 0
      ? "not_started"
      : `${[...ONBOARDING_STEPS].filter(s => completed.has(s)).join("+")}_done`;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });

  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingProgress: progress,
      // Do not downgrade users that are already ACTIVE/SUSPENDED.
      ...(allDone && user?.status === ClientStatus.ONBOARDING ? { status: ClientStatus.ACTIVE } : {}),
      ...(!allDone && completed.size > 0 && user?.status === ClientStatus.NEW
        ? { status: ClientStatus.ONBOARDING }
        : {}),
    },
  });

  return allDone;
};

/**
 * Full, resumable onboarding state for the wizard:
 * per-step status plus a masked summary of saved data for the review screen.
 */
export const getOnboardingStatus = async (userId: string) => {
  const [user, steps, subscription, broker, prop] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingProgress: true, status: true },
    }),
    prisma.onboardingStep.findMany({ where: { userId } }),
    prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.brokerAccount.findFirst({
      where: { userId, status: { not: "archived" } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.propAccount.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const stepStatus = (stepId: OnboardingStepId) =>
    steps.find(s => s.stepId === stepId)?.status ?? OnboardingStepStatus.PENDING;

  const stepsOut = {
    payment: {
      status: stepStatus("payment"),
      data: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
    },
    broker: {
      status: stepStatus("broker"),
      data: broker
        ? {
            id: broker.id,
            brokerName: broker.brokerName,
            mt5AccountNumber: broker.mt5AccountNumber,
            mt5Server: broker.mt5Server,
            mt5Password: maskSecret("password"),
          }
        : null,
    },
    prop: {
      status: stepStatus("prop"),
      data: prop
        ? {
            id: prop.id,
            firmName: prop.firmName,
            mt5AccountNumber: prop.mt5AccountNumber,
            mt5Server: prop.mt5Server,
            phase: prop.phase,
            mt5Password: maskSecret("password"),
          }
        : null,
    },
  };

  const nextStep =
    ONBOARDING_STEPS.find(stepId => stepsOut[stepId].status !== OnboardingStepStatus.COMPLETED) ?? null;

  return {
    progress: user?.onboardingProgress ?? "not_started",
    userStatus: user?.status ?? "NEW",
    completed: nextStep === null,
    nextStep,
    steps: stepsOut,
  };
};
