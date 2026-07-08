import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { getMyNotifications, markNotificationAsRead } from "./notification.controller";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get user notifications
router.get("/", getMyNotifications);

// Mark notification as read
router.put("/:id/read", markNotificationAsRead);

export default router;
