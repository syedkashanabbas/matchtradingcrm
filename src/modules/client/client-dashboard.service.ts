import { prisma } from "../../config/prisma";

export const getClientDashboard = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      notifications: {
        where: { isRead: false },
        take: 5,
        orderBy: { createdAt: 'desc' }
      },
      brokerAccounts: {
        take: 1,
        orderBy: { createdAt: 'desc' }
      },
      propAccounts: {
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: 'desc' }
      },
      subscriptions: {
        take: 1,
        orderBy: { createdAt: 'desc' }
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get subscription info
  const subscription = user.subscriptions[0];
  const subscriptionStatus = subscription?.status === 'ACTIVE' ? 'active' : 'inactive';
  const plan = subscription?.plan ?? 'None';

  // Get real broker info
  const brokerAccount = user.brokerAccounts[0];
  const brokerName = brokerAccount ? brokerAccount.brokerName : 'Not Connected';

  // Get real prop firm info
  const propFirmAccount = user.propAccounts[0];
  const propFirmName = propFirmAccount ? propFirmAccount.firmName : 'Not Connected';

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
    },
    stats: {
      accountStatus: user.status,
      broker: brokerName,
      propFirm: propFirmName,
      subscriptionPlan: plan,
      subscriptionStatus,
      lastSync: new Date().toLocaleString(),
      unreadNotifications: user.notifications.length,
    },
    recentActivity: user.notifications.map(notif => ({
      id: notif.id,
      action: notif.title,
      timestamp: notif.createdAt,
    })),
  };
};

export const getSubscriptionInfo = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      role: true,
      subscriptionEnd: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const plan = user.role === 'ADMIN' ? 'Enterprise' : 'Pro';
  const isActive = user.status === 'ACTIVE';
  const subscriptionEnd = user.subscriptionEnd;

  return {
    plan,
    status: isActive ? 'active' : 'inactive',
    subscriptionEnd,
    nextBillingDate: subscriptionEnd ? new Date(subscriptionEnd).toISOString() : null,
    features: plan === 'Enterprise' ? [
      'Unlimited API calls',
      'Priority support',
      'Advanced analytics',
      'Custom integrations'
    ] : [
      '1000 API calls/month',
      'Email support',
      'Basic analytics',
      'Standard integrations'
    ],
  };
};
