import { prisma } from "../../config/prisma";
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

    // TODO: Create audit log for email sent after migration
    console.log(`Audit log: Email sent to ${user.email} with subject: ${subject}`);

  } catch (error) {
    console.error("Failed to send email notification:", error);
  }
};

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
    // Create the alert in database
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
