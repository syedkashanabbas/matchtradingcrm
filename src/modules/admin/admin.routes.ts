import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/requireAdmin.middleware";
import {
  adminDashboard,
  listUsers,
  changeUserStatus,
  getAllVps,
  getAllBrokers,
  getAllPropFirms,
  updateVpsStatus,
  updateBrokerStatus,
  updatePropFirmStatus,
} from "./admin.controller";

const router = Router();

router.get("/dashboard", authenticate, requireAdmin, adminDashboard);
router.get("/users", authenticate, requireAdmin, listUsers);
router.patch("/users/:id/status", authenticate, requireAdmin, changeUserStatus);
router.get("/vps", authenticate, requireAdmin, getAllVps);
router.get("/brokers", authenticate, requireAdmin, getAllBrokers);
router.get("/prop-firms", authenticate, requireAdmin, getAllPropFirms);
router.patch("/vps/:id/status", authenticate, requireAdmin, updateVpsStatus);
router.patch("/brokers/:id/status", authenticate, requireAdmin, updateBrokerStatus);
router.patch("/prop-firms/:id/status", authenticate, requireAdmin, updatePropFirmStatus);

export default router;
