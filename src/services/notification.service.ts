import { prisma } from "../config/prisma";
import { AlertType, AlertSeverity } from "@prisma/client";

export interface AlertInput {
  userId: string;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  channels?: string[];
  metadata?: any;
}

export const createAlert = async (
  userId: string,
  type: AlertType,
  title: string,
  message: string,
  severity: AlertSeverity,
  channels: string[] = ["in_app"],
  metadata?: any
) => {
  try {
    const alert = await prisma.alert.create({
      data: {
        userId,
        type,
        title,
        message,
        severity,
        channels,
        metadata,
      },
    });

    // Send notifications based on channels
    if (channels.includes("email")) {
      await sendEmailNotification(userId, title, message);
    }

    return alert;
  } catch (error) {
    console.error("Failed to create alert:", error);
    throw error;
  }
};

export const getUserAlerts = async (
  userId: string,
  filters: {
    unread?: boolean;
    type?: AlertType;
    severity?: AlertSeverity;
    page?: number;
    limit?: number;
  }
) => {
  try {
    const whereClause: any = { userId };

    if (filters.unread !== undefined) {
      whereClause.isRead = !filters.unread;
    }

    if (filters.type) {
      whereClause.type = filters.type;
    }

    if (filters.severity) {
      whereClause.severity = filters.severity;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.alert.count({ where: whereClause }),
    ]);

    return {
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Failed to get user alerts:", error);
    throw error;
  }
};

export const getAlertById = async (id: string, userId: string) => {
  try {
    const alert = await prisma.alert.findFirst({
      where: { id, userId },
    });

    return alert;
  } catch (error) {
    console.error("Failed to get alert:", error);
    throw error;
  }
};

export const markAlertAsRead = async (id: string, userId: string) => {
  try {
    const alert = await prisma.alert.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    if (alert.count === 0) {
      throw new Error("Alert not found or you don't have permission to update it");
    }

    return { message: "Alert marked as read" };
  } catch (error) {
    console.error("Failed to mark alert as read:", error);
    throw error;
  }
};

export const markAllAlertsAsRead = async (userId: string) => {
  try {
    const result = await prisma.alert.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { 
      message: "All alerts marked as read",
      count: result.count 
    };
  } catch (error) {
    console.error("Failed to mark all alerts as read:", error);
    throw error;
  }
};

export const deleteAlert = async (id: string, userId: string) => {
  try {
    const result = await prisma.alert.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new Error("Alert not found or you don't have permission to delete it");
    }

    return { message: "Alert deleted successfully" };
  } catch (error) {
    console.error("Failed to delete alert:", error);
    throw error;
  }
};

export const getAlertStats = async (userId: string) => {
  try {
    const [
      totalAlerts,
      unreadAlerts,
      criticalAlerts,
      highAlerts,
      mediumAlerts,
      lowAlerts,
    ] = await Promise.all([
      prisma.alert.count({ where: { userId } }),
      prisma.alert.count({ where: { userId, isRead: false } }),
      prisma.alert.count({ where: { userId, severity: AlertSeverity.CRITICAL } }),
      prisma.alert.count({ where: { userId, severity: AlertSeverity.HIGH } }),
      prisma.alert.count({ where: { userId, severity: AlertSeverity.MEDIUM } }),
      prisma.alert.count({ where: { userId, severity: AlertSeverity.LOW } }),
    ]);

    return {
      total: totalAlerts,
      unread: unreadAlerts,
      severityBreakdown: {
        critical: criticalAlerts,
        high: highAlerts,
        medium: mediumAlerts,
        low: lowAlerts,
      },
    };
  } catch (error) {
    console.error("Failed to get alert stats:", error);
    throw error;
  }
};

export const cleanupOldAlerts = async (daysToKeep: number = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedCount = await prisma.alert.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        isRead: true, // Only delete read alerts
      },
    });

    return deletedCount.count;
  } catch (error) {
    console.error("Failed to cleanup old alerts:", error);
    throw error;
  }
};

// Email notification service (placeholder implementation)
const sendEmailNotification = async (userId: string, subject: string, message: string) => {
  try {
    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      console.error("User not found for email notification");
      return;
    }

    // This is a placeholder - implement actual email sending
    // You would use a service like SendGrid, Nodemailer, etc.
    console.log(`Email notification sent to ${user.email}:`, {
      subject,
      message,
      timestamp: new Date(),
    });

    // Create audit log for email sent
    await prisma.auditEvent.create({
      data: {
        userId,
        action: "EMAIL_SENT",
        resource: "NOTIFICATION",
        details: { subject, recipient: user.email },
        severity: "LOW",
      },
    });

  } catch (error) {
    console.error("Failed to send email notification:", error);
  }
};

// Predefined alert creators
export const createPaymentFailureAlert = async (userId: string, amount: number, dueDate: Date) => {
  return createAlert(
    userId,
    "PAYMENT_FAILURE",
    "Payment Failed",
    `Your payment of $${amount} has failed. Please update your payment method. Due date: ${dueDate.toLocaleDateString()}.`,
    "HIGH",
    ["in_app", "email"],
    { amount, dueDate }
  );
};

export const createSubscriptionExpiredAlert = async (userId: string) => {
  return createAlert(
    userId,
    "SUBSCRIPTION_EXPIRED",
    "Subscription Expired",
    "Your subscription has expired. Please renew to continue using our services.",
    "CRITICAL",
    ["in_app", "email"]
  );
};

export const createConfigUpdateAlert = async (userId: string, configVersion: string) => {
  return createAlert(
    userId,
    "CONFIG_UPDATE",
    "EA Configuration Updated",
    `Your EA configuration has been updated to version ${configVersion}. Please restart your EA to apply the changes.`,
    "MEDIUM",
    ["in_app", "email"],
    { configVersion }
  );
};

export const createDeviceLimitExceededAlert = async (userId: string, currentDevices: number, maxDevices: number) => {
  return createAlert(
    userId,
    "DEVICE_LIMIT_EXCEEDED",
    "Device Limit Exceeded",
    `You have reached the maximum number of devices (${maxDevices}). Please remove unused devices to add new ones.`,
    "HIGH",
    ["in_app", "email"],
    { currentDevices, maxDevices }
  );
};

export const createAccountChangeAlert = async (userId: string, changeType: string, details: any) => {
  return createAlert(
    userId,
    "ACCOUNT_CHANGE",
    `Account ${changeType}`,
    `Your account has been ${changeType.toLowerCase()}. ${details}`,
    "MEDIUM",
    ["in_app", "email"],
    { changeType, details }
  );
};

export const createAdminActionAlert = async (userId: string, action: string, reason: string) => {
  return createAlert(
    userId,
    "ADMIN_ACTION",
    `Admin Action: ${action}`,
    `An administrator has ${action.toLowerCase()} your account. Reason: ${reason}`,
    "HIGH",
    ["in_app", "email"],
    { action, reason }
  );
};

export const createEACheckFailedAlert = async (userId: string, error: string) => {
  return createAlert(
    userId,
    "EA_CHECK_FAILED",
    "EA Validation Failed",
    `Your EA validation failed. Error: ${error}. Please check your configuration and try again.`,
    "MEDIUM",
    ["in_app"],
    { error }
  );
};
