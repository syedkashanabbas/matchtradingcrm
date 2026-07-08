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

  // Get VPS stats
  const totalVpsConfigs = await prisma.vpsConfig.count({
    where: {
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    }
  });
  const activeVpsConfigs = await prisma.vpsConfig.count({
    where: { 
      status: "active",
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
    totalVpsConfigs,
    activeVpsConfigs,
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
  return prisma.user.findMany({
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
 * Get all VPS configurations (admin only)
 */
export const getAllVpsConfigs = async () => {
  return prisma.vpsConfig.findMany({
    where: {
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    },
    include: {
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
 * Get all broker configurations (admin only)
 */
export const getAllBrokerConfigs = async () => {
  return prisma.brokerAccount.findMany({
    where: {
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    },
    include: {
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
  return prisma.propAccount.findMany({
    where: {
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    },
    include: {
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
 * Update VPS configuration status
 */
export const updateVpsConfigStatus = async (vpsId: string, status: string) => {
  return prisma.vpsConfig.update({
    where: { id: vpsId },
    data: { status: status as any },
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
