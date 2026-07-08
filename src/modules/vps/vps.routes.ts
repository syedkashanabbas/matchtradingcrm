import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createVps,
  getVpsList,
  getVps,
  updateVps,
  deleteVps,
  testVps,
  getVpsStatistics,
} from "./vps.controller";

const router = Router();

// All VPS routes require authentication
router.use(authenticate);

// Create VPS configuration
router.post("/", createVps);

// Get all VPS configurations
router.get("/", getVpsList);

// Get VPS statistics
router.get("/stats", getVpsStatistics);

// Get specific VPS configuration
router.get("/:id", getVps);

// Update VPS configuration
router.put("/:id", updateVps);

// Delete VPS configuration
router.delete("/:id", deleteVps);

// Test VPS connection
router.post("/:id/test", testVps);

export default router;
