import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  registerApiKeyDevice,
  getApiKeyDevices,
  removeApiKeyDevice,
  validateDevice,
  getDeviceStatistics,
  cleanupDevices,
} from "./device.controller";

const router = Router();

// Register device for API key
router.post("/apikeys/:apiKeyId/devices", registerApiKeyDevice);

// Get devices for API key
router.get("/apikeys/:apiKeyId/devices", getApiKeyDevices);

// Get device statistics for API key
router.get("/apikeys/:apiKeyId/devices/stats", getDeviceStatistics);

// Remove device
router.delete("/devices/:deviceId", removeApiKeyDevice);

// Validate device access (used by EA)
router.post("/devices/validate", validateDevice);

// Cleanup inactive devices (admin only)
router.post("/devices/cleanup", authenticate, authorize("ADMIN"), cleanupDevices);

export default router;
