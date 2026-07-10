import { prisma } from "../config/prisma";
import { OnboardingStepStatus, ClientStatus } from "@prisma/client";

export interface OnboardingStep {
  id: string;
  stepId: string;
  name: string;
  description: string;
  status: OnboardingStepStatus;
  completedAt?: Date;
  isRequired: boolean;
  dependencies: string[];
}

export const getOnboardingSteps = async (userId: string): Promise<OnboardingStep[]> => {
  try {
    const userSteps = await prisma.onboardingStep.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    const stepDefinitions = [
      {
        stepId: "payment",
        name: "Payment Setup",
        description: "Choose and activate your subscription plan",
        isRequired: true,
        dependencies: [],
      },
      {
        stepId: "broker",
        name: "Broker Account",
        description: "Configure your MT5 broker account",
        isRequired: true,
        dependencies: ["payment"],
      },
      {
        stepId: "prop",
        name: "Prop Firm Account",
        description: "Set up your prop firm trading account",
        isRequired: true,
        dependencies: ["payment"],
      },
    ];

    const steps: OnboardingStep[] = stepDefinitions.map(stepDef => {
      const userStep = userSteps.find(us => us.stepId === stepDef.stepId);
      
      return {
        id: userStep?.id || "",
        stepId: stepDef.stepId,
        name: stepDef.name,
        description: stepDef.description,
        status: userStep?.status || OnboardingStepStatus.PENDING,
        completedAt: userStep?.completedAt || undefined,
        isRequired: stepDef.isRequired,
        dependencies: stepDef.dependencies,
      };
    });

    return steps;
  } catch (error) {
    console.error("Failed to get onboarding steps:", error);
    throw error;
  }
};

export const updateOnboardingStep = async (
  userId: string,
  stepId: string,
  status: OnboardingStepStatus,
  metadata?: any
): Promise<OnboardingStep> => {
  try {
    const step = await prisma.onboardingStep.upsert({
      where: {
        userId_stepId: {
          userId,
          stepId,
        },
      },
      update: {
        status,
        completedAt: status === OnboardingStepStatus.COMPLETED ? new Date() : null,
      },
      create: {
        userId,
        stepId,
        status,
        completedAt: status === OnboardingStepStatus.COMPLETED ? new Date() : null,
      },
    });

    // Check if step dependencies are met
    if (status === OnboardingStepStatus.COMPLETED) {
      await checkStepDependencies(userId, stepId);
    }

    // Update user status based on onboarding progress
    await updateUserStatusBasedOnOnboarding(userId);

    // Create audit log
    await prisma.auditEvent.create({
      data: {
        userId,
        action: "ONBOARDING_STEP_UPDATED",
        resource: "ONBOARDING",
        details: { stepId, status, metadata },
        severity: "LOW",
      },
    });

    return {
      id: step.id,
      stepId: step.stepId,
      name: "", // Will be filled by caller
      description: "",
      status: step.status,
      completedAt: step.completedAt || undefined,
      isRequired: true,
      dependencies: [],
    };
  } catch (error) {
    console.error("Failed to update onboarding step:", error);
    throw error;
  }
};

export const getOnboardingProgress = async (userId: string) => {
  try {
    const steps = await getOnboardingSteps(userId);
    
    const totalSteps = steps.filter(s => s.isRequired).length;
    const completedSteps = steps.filter(s => s.isRequired && s.status === OnboardingStepStatus.COMPLETED).length;
    const inProgressSteps = steps.filter(s => s.isRequired && s.status === OnboardingStepStatus.IN_PROGRESS).length;
    const failedSteps = steps.filter(s => s.isRequired && s.status === OnboardingStepStatus.FAILED).length;

    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Get next step
    const nextStep = steps.find(s => 
      s.isRequired && 
      s.status === OnboardingStepStatus.PENDING &&
      areDependenciesMet(steps, s.stepId)
    );

    return {
      totalSteps,
      completedSteps,
      inProgressSteps,
      failedSteps,
      progressPercentage,
      isCompleted: completedSteps === totalSteps,
      nextStep: nextStep ? {
        stepId: nextStep.stepId,
        name: nextStep.name,
        description: nextStep.description,
      } : null,
      steps,
    };
  } catch (error) {
    console.error("Failed to get onboarding progress:", error);
    throw error;
  }
};

export const startOnboardingStep = async (userId: string, stepId: string) => {
  return updateOnboardingStep(userId, stepId, OnboardingStepStatus.IN_PROGRESS);
};

export const completeOnboardingStep = async (userId: string, stepId: string, metadata?: any) => {
  return updateOnboardingStep(userId, stepId, OnboardingStepStatus.COMPLETED, metadata);
};

export const failOnboardingStep = async (userId: string, stepId: string, error: string) => {
  return updateOnboardingStep(userId, stepId, OnboardingStepStatus.FAILED, { error });
};

export const resetOnboardingStep = async (userId: string, stepId: string) => {
  return updateOnboardingStep(userId, stepId, OnboardingStepStatus.PENDING);
};

export const resetAllOnboardingSteps = async (userId: string) => {
  try {
    await prisma.onboardingStep.updateMany({
      where: { userId },
      data: {
        status: OnboardingStepStatus.PENDING,
        completedAt: null,
      },
    });

    // Reset user status
    await prisma.user.update({
      where: { id: userId },
      data: { status: ClientStatus.NEW },
    });

    // Create audit log
    await prisma.auditEvent.create({
      data: {
        userId,
        action: "ONBOARDING_RESET",
        resource: "ONBOARDING",
        details: { resetTime: new Date() },
        severity: "MEDIUM",
      },
    });

    return { message: "All onboarding steps have been reset" };
  } catch (error) {
    console.error("Failed to reset onboarding steps:", error);
    throw error;
  }
};

// Helper functions
const areDependenciesMet = (steps: OnboardingStep[], stepId: string): boolean => {
  const step = steps.find(s => s.stepId === stepId);
  if (!step) return false;

  for (const dependency of step.dependencies) {
    const depStep = steps.find(s => s.stepId === dependency);
    if (!depStep || depStep.status !== OnboardingStepStatus.COMPLETED) {
      return false;
    }
  }

  return true;
};

const checkStepDependencies = async (userId: string, stepId: string) => {
  const steps = await getOnboardingSteps(userId);
  const completedStep = steps.find(s => s.stepId === stepId);
  
  if (!completedStep) return;

  // Check if any steps are now ready to be started
  for (const step of steps) {
    if (
      step.status === OnboardingStepStatus.PENDING &&
      areDependenciesMet(steps, step.stepId)
    ) {
      // This step is now ready, but we don't automatically start it
      // The user needs to explicitly start it
      console.log(`Step ${step.stepId} is now ready to be started`);
    }
  }
};

const updateUserStatusBasedOnOnboarding = async (userId: string) => {
  const progress = await getOnboardingProgress(userId);
  
  if (progress.isCompleted) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: ClientStatus.ACTIVE },
    });

    // Create audit log
    await prisma.auditEvent.create({
      data: {
        userId,
        action: "ONBOARDING_COMPLETED",
        resource: "ONBOARDING",
        details: { completedAt: new Date() },
        severity: "MEDIUM",
      },
    });
  } else if (progress.completedSteps > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: ClientStatus.ONBOARDING },
    });
  }
};

// Step validation functions
export const validatePaymentStep = async (userId: string): Promise<boolean> => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return subscription !== null && subscription.status === "ACTIVE";
  } catch (error) {
    console.error("Failed to validate payment step:", error);
    return false;
  }
};

export const validateBrokerStep = async (userId: string): Promise<boolean> => {
  try {
    const brokerAccount = await prisma.brokerAccount.findFirst({
      where: { userId },
    });

    return brokerAccount !== null && brokerAccount.status === "active";
  } catch (error) {
    console.error("Failed to validate broker step:", error);
    return false;
  }
};

export const validatePropStep = async (userId: string): Promise<boolean> => {
  try {
    const propAccount = await prisma.propAccount.findFirst({
      where: { userId, isActive: true },
    });

    return propAccount !== null;
  } catch (error) {
    console.error("Failed to validate prop step:", error);
    return false;
  }
};

export const validateSetupStep = async (userId: string): Promise<boolean> => {
  try {
    const [paymentValid, brokerValid, propValid] = await Promise.all([
      validatePaymentStep(userId),
      validateBrokerStep(userId),
      validatePropStep(userId),
    ]);

    return paymentValid && brokerValid && propValid;
  } catch (error) {
    console.error("Failed to validate setup step:", error);
    return false;
  }
};
