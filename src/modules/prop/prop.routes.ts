import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createProp,
  getPropList,
  getActiveProp,
  getProp,
  updateProp,
  archiveProp,
  validateProp,
  updatePropAccountPhase,
  getPropStatistics,
  getSupportedPropFirmsList,
} from "./prop.controller";

const router = Router();

// Get supported prop firms (public) - no authentication required
router.get("/supported", getSupportedPropFirmsList);

// Apply authentication middleware to remaining routes
router.use(authenticate);

// Create prop account
router.post("/", createProp);

// Get all prop accounts
router.get("/", getPropList);

// Get active prop account
router.get("/active", getActiveProp);

// Get prop statistics
router.get("/stats", getPropStatistics);

// Get specific prop account
router.get("/:id", getProp);

// Update prop account
router.put("/:id", updateProp);

// Archive prop account
router.post("/:id/archive", archiveProp);

// Validate prop account
router.post("/:id/validate", validateProp);

// Update prop account phase
router.put("/:id/phase", updatePropAccountPhase);

export default router;
