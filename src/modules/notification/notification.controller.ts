import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { prisma } from "../../config/prisma";

/** GET /api/notifications - the authenticated user's notifications, newest first. */
export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        message: true,
        isRead: true,
        type: true,
        severity: true,
        createdAt: true,
      },
    });

    res.json({
      message: "Notifications fetched",
      notifications,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: "NOTIFICATIONS_FAILED", message: error.message } });
  }
};

/** PUT /api/notifications/:id/read - ownership-checked mark-as-read. */
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id as string, userId: req.user.userId },
      data: { isRead: true },
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Notification not found" } });
    }

    res.json({ message: "Notification marked as read" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: "NOTIFICATION_UPDATE_FAILED", message: error.message } });
  }
};
