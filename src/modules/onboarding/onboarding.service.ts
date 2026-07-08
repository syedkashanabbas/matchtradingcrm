import { prisma } from "../../config/prisma";
import { encryptData } from "../../utils/encryption";
import { validateIpAddress } from "../../utils/validation";

export const createOnboardingVps = async (userId: string, vpsData: any) => {
  // Validate IP address
  if (!validateIpAddress(vpsData.ipAddress)) {
    throw new Error("Invalid IP address format");
  }

  // Encrypt sensitive data
  const encryptedSshPassword = encryptData(vpsData.sshPassword);
  const encryptedPanelPassword = vpsData.panelPassword ? encryptData(vpsData.panelPassword) : null;

  // Create VPS configuration
  const vpsConfig = await prisma.vpsConfig.create({
    data: {
      userId,
      provider: vpsData.provider,
      ipAddress: vpsData.ipAddress,
      sshUsername: vpsData.sshUsername,
      sshPassword: encryptedSshPassword,
      panelUrl: vpsData.panelUrl || null,
      panelUsername: vpsData.panelUsername || null,
      panelPassword: encryptedPanelPassword,
      status: 'active'
    },
  });

  return vpsConfig;
};

export const createOnboardingBroker = async (userId: string, brokerData: any) => {
  // Encrypt sensitive data
  const encryptedPassword = encryptData(brokerData.mt5Password);

  // Create broker configuration
  const brokerConfig = await prisma.brokerAccount.create({
    data: {
      userId,
      brokerName: brokerData.brokerName,
      mt5AccountNumber: brokerData.mt5AccountNumber,
      mt5Password: encryptedPassword,
      mt5Server: brokerData.mt5Server,
      status: 'active'
    },
  });

  return brokerConfig;
};

export const createOnboardingProp = async (userId: string, propData: any) => {
  // Encrypt sensitive data
  const encryptedMt5Password = encryptData(propData.mt5_password);
  const encryptedPropPassword = propData.prop_firm_password ? encryptData(propData.prop_firm_password) : null;

  // Create prop account configuration
  const propConfig = await prisma.propAccount.create({
    data: {
      userId,
      firmName: propData.prop_firm_name,
      phase: propData.phase.toUpperCase(),
      mt5AccountNumber: propData.mt5_account_number,
      mt5Password: encryptedMt5Password,
      mt5Server: propData.mt5_server,
      isActive: true
    },
  });

  return propConfig;
};

export const getOnboardingProgress = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingProgress: true }
  });

  return user?.onboardingProgress || 'not_started';
};

export const createOnboardingPlatform = async (userId: string, platformData: any) => {
  // Create platform configuration using subscription model
  const platformConfig = await prisma.subscription.create({
    data: {
      userId,
      ...platformData,
      status: 'active'
    },
  });

  return platformConfig;
};

export const createOnboardingSubscription = async (userId: string, subscriptionData: any) => {
  // Create subscription configuration
  const subscriptionConfig = await prisma.subscription.create({
    data: {
      userId,
      ...subscriptionData,
      status: 'active'
    },
  });

  return subscriptionConfig;
};

export const updateOnboardingProgress = async (userId: string, progress: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { onboardingProgress: progress }
  });
};
