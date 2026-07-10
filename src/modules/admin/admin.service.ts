import { prisma } from "../../config/prisma";

/**
 * Dashboard statistics
 */
export const getAdminDashboard = async () => {
  const totalUsers = await prisma.user.count({
    where: {
      role: {
        not: 'ADMIN'
      }
    }
  });

  const activeUsers = await prisma.user.count({
    where: { 
      status: "ACTIVE",
      role: {
        not: 'ADMIN'
      }
    },
  });

  const newUsers = await prisma.user.count({
    where: { 
      status: "NEW",
      role: {
        not: 'ADMIN'
      }
    },
  });

  const suspendedUsers = await prisma.user.count({
    where: { 
      status: "SUSPENDED",
      role: {
        not: 'ADMIN'
      }
    },
  });

  // Get subscription stats
  const totalSubscriptions = await prisma.subscription.count({
    where: {
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    }
  });
  const activeSubscriptions = await prisma.subscription.count({
    where: { 
      status: "ACTIVE",
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    },
  });

  // Get broker stats
  const totalBrokerAccounts = await prisma.brokerAccount.count({
    where: {
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    }
  });
  const activeBrokerAccounts = await prisma.brokerAccount.count({
    where: { 
      status: "active",
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    },
  });

  // Get prop firm stats
  const totalPropAccounts = await prisma.propAccount.count({
    where: {
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    }
  });
  const activePropAccounts = await prisma.propAccount.count({
    where: { 
      isActive: true,
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    },
  });

  return {
    totalUsers,
    activeUsers,
    newUsers,
    suspendedUsers,
    totalSubscriptions,
    activeSubscriptions,
    totalBrokerAccounts,
    activeBrokerAccounts,
    totalPropAccounts,
    activePropAccounts,
  };
};

/**
 * Get all users
 */
export const getAllUsers = async () => {
  const [users, provisions] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: {
          not: 'ADMIN'
        }
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        onboardingProgress: true,
      },
    }),
    prisma.easierPropProvision.findMany({
      select: { userId: true, status: true },
    }),
  ]);

  const provisionByUser = new Map(provisions.map(p => [p.userId, p.status]));

  return users.map(user => ({
    ...user,
    provisioningStatus: provisionByUser.get(user.id) ?? "NOT_STARTED",
  }));
};

/**
 * Full user detail for the admin client page: profile, subscription,
 * accounts (credentials masked - reveal is a separate audited endpoint),
 * provisioning and hedge state.
 */
export const getUserDetail = async (userId: string) => {
  const [user, subscription, brokerAccounts, propAccounts, provision, hedge] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        role: true,
        status: true,
        onboardingProgress: true,
        referralCode: true,
        referredByUserId: true,
        createdAt: true,
      },
    }),
    prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.brokerAccount.findMany({
      where: { userId },
      select: {
        id: true,
        brokerName: true,
        mt5AccountNumber: true,
        mt5Server: true,
        status: true,
        archivedAt: true,
        epAccountId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.propAccount.findMany({
      where: { userId },
      select: {
        id: true,
        firmName: true,
        mt5AccountNumber: true,
        mt5Server: true,
        phase: true,
        status: true,
        isActive: true,
        archivedAt: true,
        epAccountId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.easierPropProvision.findUnique({ where: { userId } }),
    prisma.hedgeSetup.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  return { user, subscription, brokerAccounts, propAccounts, provision, hedge };
};

/**
 * All subscriptions with user info (admin subscriptions page)
 */
export const getAllSubscriptions = async () => {
  return prisma.subscription.findMany({
    where: { user: { role: { not: "ADMIN" } } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      provider: true,
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      gracePeriodEnd: true,
      createdAt: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
};

/**
 * Update user status
 */
export const updateUserStatus = async (userId: string, status: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { status: status as any },
  });
};

/**
 * Get all broker configurations (admin only)
 */
export const getAllBrokerConfigs = async () => {
  // Credential fields are intentionally excluded: admin viewing is on-demand
  // via the audited reveal endpoint only (see admin credentials controller).
  return prisma.brokerAccount.findMany({
    where: {
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    },
    select: {
      id: true,
      userId: true,
      brokerName: true,
      mt5AccountNumber: true,
      mt5Server: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Get all Prop Firm configurations (admin only)
 */
export const getAllPropConfigs = async () => {
  // Credential fields are intentionally excluded: admin viewing is on-demand
  // via the audited reveal endpoint only (see admin credentials controller).
  return prisma.propAccount.findMany({
    where: {
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    },
    select: {
      id: true,
      userId: true,
      firmName: true,
      mt5AccountNumber: true,
      mt5Server: true,
      phase: true,
      status: true,
      isActive: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Update Broker configuration status
 */
export const updateBrokerConfigStatus = async (brokerId: string, status: string) => {
  return prisma.brokerAccount.update({
    where: { id: brokerId },
    data: { status: status as any },
  });
};

/**
 * Update Prop Firm configuration status
 */
export const updatePropConfigStatus = async (propId: string, status: string) => {
  return prisma.propAccount.update({
    where: { id: propId },
    data: { status },
  });
};
