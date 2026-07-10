import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/requireAdmin.middleware";
import {
  adminDashboard,
  listUsers,
  changeUserStatus,
  getAllBrokers,
  getAllPropFirms,
  updateBrokerStatus,
  updatePropFirmStatus,
} from "./admin.controller";
import { revealCredentials } from "./admin-credentials.controller";
import { userDetail, listSubscriptions } from "./admin.controller";

const router = Router();

router.get("/dashboard", authenticate, requireAdmin, adminDashboard);
router.get("/users", authenticate, requireAdmin, listUsers);
router.get("/users/:id", authenticate, requireAdmin, userDetail);
router.get("/subscriptions", authenticate, requireAdmin, listSubscriptions);
router.patch("/users/:id/status", authenticate, requireAdmin, changeUserStatus);
router.get("/brokers", authenticate, requireAdmin, getAllBrokers);
router.get("/prop-firms", authenticate, requireAdmin, getAllPropFirms);
router.patch("/brokers/:id/status", authenticate, requireAdmin, updateBrokerStatus);
router.patch("/prop-firms/:id/status", authenticate, requireAdmin, updatePropFirmStatus);

// On-demand credential viewing, audit-logged (D1)
router.post(
  "/users/:userId/credentials/:accountType/:accountId/reveal",
  authenticate,
  requireAdmin,
  revealCredentials
);

export default router;
