import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  createConfig,
  getConfigs,
  getActiveConfig,
  getConfig,
  updateConfig,
  deleteConfig,
  activateConfig,
  getConfigVersionHistory,
  verifyConfig,
  getDefaultConfig,
} from "./config.controller";

const router = Router();

// Get default config (public)
router.get("/default", getDefaultConfig);

// Get all configs (public)
router.get("/", getConfigs);

// Get active config (public - used by EA)
router.get("/active", getActiveConfig);

// Get specific config (public)
router.get("/:id", getConfig);

// Get config version history (public)
router.get("/:id/history", getConfigVersionHistory);

// Verify config signature (public)
router.get("/:id/verify", verifyConfig);

// All following routes require authentication and admin role
router.use(authenticate);
router.use(authorize("ADMIN"));

// Create config
router.post("/", createConfig);

// Update config
router.put("/:id", updateConfig);

// Delete config
router.delete("/:id", deleteConfig);

// Activate config
router.post("/:id/activate", activateConfig);

export default router;
