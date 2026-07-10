import { prisma } from "../config/prisma";
import { AuditSeverity } from "@prisma/client";
import { Request } from "express";

export interface AuditEventInput {
  userId?: string;
  action: string;
  resource: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditSeverity;
}

export const createAuditEvent = async (auditData: AuditEventInput) => {
  try {
    const auditEvent = await prisma.auditEvent.create({
      data: {
        userId: auditData.userId,
        action: auditData.action,
        resource: auditData.resource,
        details: auditData.details,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
        severity: auditData.severity || AuditSeverity.MEDIUM,
      },
    });

    return auditEvent;
  } catch (error) {
    console.error("Failed to create audit event:", error);
    throw error;
  }
};

export const getAuditEvents = async (filters: {
  userId?: string;
  action?: string;
  resource?: string;
  severity?: AuditSeverity;
  dateRange?: {
    start: Date;
    end: Date;
  };
  page?: number;
  limit?: number;
}) => {
  try {
    const whereClause: any = {};

    if (filters.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters.action) {
      whereClause.action = filters.action;
    }

    if (filters.resource) {
      whereClause.resource = filters.resource;
    }

    if (filters.severity) {
      whereClause.severity = filters.severity;
    }

    if (filters.dateRange) {
      whereClause.timestamp = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where: whereClause,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.auditEvent.count({ where: whereClause }),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Failed to get audit events:", error);
    throw error;
  }
};

export const getAuditEventById = async (id: string) => {
  try {
    const event = await prisma.auditEvent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return event;
  } catch (error) {
    console.error("Failed to get audit event:", error);
    throw error;
  }
};

export const getAuditStats = async (filters?: {
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}) => {
  try {
    const whereClause: any = {};

    if (filters?.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters?.dateRange) {
      whereClause.timestamp = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    const [
      totalEvents,
      criticalEvents,
      highEvents,
      mediumEvents,
      lowEvents,
      eventsByAction,
      eventsByResource,
    ] = await Promise.all([
      prisma.auditEvent.count({ where: whereClause }),
      prisma.auditEvent.count({
        where: { ...whereClause, severity: AuditSeverity.CRITICAL },
      }),
      prisma.auditEvent.count({
        where: { ...whereClause, severity: AuditSeverity.HIGH },
      }),
      prisma.auditEvent.count({
        where: { ...whereClause, severity: AuditSeverity.MEDIUM },
      }),
      prisma.auditEvent.count({
        where: { ...whereClause, severity: AuditSeverity.LOW },
      }),
      prisma.auditEvent.groupBy({
        by: ["action"],
        where: whereClause,
        _count: { action: true },
        orderBy: { _count: { action: "desc" } },
        take: 10,
      }),
      prisma.auditEvent.groupBy({
        by: ["resource"],
        where: whereClause,
        _count: { resource: true },
        orderBy: { _count: { resource: "desc" } },
        take: 10,
      }),
    ]);

    return {
      totalEvents,
      severityBreakdown: {
        critical: criticalEvents,
        high: highEvents,
        medium: mediumEvents,
        low: lowEvents,
      },
      topActions: eventsByAction.map(item => ({
        action: item.action,
        count: item._count.action,
      })),
      topResources: eventsByResource.map(item => ({
        resource: item.resource,
        count: item._count.resource,
      })),
    };
  } catch (error) {
    console.error("Failed to get audit stats:", error);
    throw error;
  }
};

export const cleanupOldAuditEvents = async (daysToKeep: number = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedCount = await prisma.auditEvent.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
        severity: AuditSeverity.LOW, // Only delete low severity events
      },
    });

    return deletedCount.count;
  } catch (error) {
    console.error("Failed to cleanup audit events:", error);
    throw error;
  }
};

// Middleware helper to create audit events from requests
export const createAuditFromRequest = (
  req: Request,
  action: string,
  resource: string,
  details?: any,
  severity: AuditSeverity = AuditSeverity.MEDIUM
) => {
  const userId = (req as any).user?.userId;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent");

  return createAuditEvent({
    userId,
    action,
    resource,
    details,
    ipAddress,
    userAgent,
    severity,
  });
};

// Predefined audit event creators
export const auditUserLogin = (userId: string, ipAddress: string, userAgent: string) => {
  return createAuditEvent({
    userId,
    action: "USER_LOGIN",
    resource: "AUTH",
    details: { loginTime: new Date() },
    ipAddress,
    userAgent,
    severity: AuditSeverity.LOW,
  });
};

export const auditUserLogout = (userId: string, ipAddress: string, userAgent: string) => {
  return createAuditEvent({
    userId,
    action: "USER_LOGOUT",
    resource: "AUTH",
    details: { logoutTime: new Date() },
    ipAddress,
    userAgent,
    severity: AuditSeverity.LOW,
  });
};

export const auditUserRegistration = (userId: string, ipAddress: string, userAgent: string) => {
  return createAuditEvent({
    userId,
    action: "USER_REGISTRATION",
    resource: "AUTH",
    details: { registrationTime: new Date() },
    ipAddress,
    userAgent,
    severity: AuditSeverity.MEDIUM,
  });
};

export const auditUserStatusChanged = (
  userId: string,
  oldStatus: string,
  newStatus: string,
  changedBy: string,
  ipAddress: string
) => {
  return createAuditEvent({
    userId,
    action: "USER_STATUS_CHANGED",
    resource: "USER",
    details: { oldStatus, newStatus, changedBy },
    ipAddress,
    severity: AuditSeverity.HIGH,
  });
};

export const auditSubscriptionCreated = (userId: string, subscriptionId: string, plan: string) => {
  return createAuditEvent({
    userId,
    action: "SUBSCRIPTION_CREATED",
    resource: "SUBSCRIPTION",
    details: { subscriptionId, plan },
    severity: AuditSeverity.MEDIUM,
  });
};

export const auditPaymentFailed = (userId: string, subscriptionId: string, amount: number) => {
  return createAuditEvent({
    userId,
    action: "PAYMENT_FAILED",
    resource: "SUBSCRIPTION",
    details: { subscriptionId, amount },
    severity: AuditSeverity.HIGH,
  });
};

export const auditCredentialViewed = (
  adminUserId: string,
  targetUserId: string,
  accountType: "broker" | "prop",
  accountId: string,
  ipAddress?: string
) => {
  return createAuditEvent({
    userId: adminUserId,
    action: "CREDENTIAL_VIEWED",
    resource: "CREDENTIALS",
    details: { targetUserId, accountType, accountId },
    ipAddress,
    severity: AuditSeverity.HIGH,
  });
};
