import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createBroker,
  getBrokerList,
  getBroker,
  updateBroker,
  deleteBroker,
  validateBroker,
  getBrokerStatistics,
  getSupportedBrokersList,
  replaceBroker,
  chooseHedgeBroker,
} from "./broker.controller";

const router = Router();

// Get supported brokers (public) - no authentication required
router.get("/supported", getSupportedBrokersList);

// Apply authentication middleware to remaining routes
router.use(authenticate);

// Create broker account
router.post("/", createBroker);

// Get all broker accounts
router.get("/", getBrokerList);

// Get broker statistics
router.get("/stats", getBrokerStatistics);

// Designate the hedge broker (queued via the provisioning worker)
router.post("/hedge-broker", chooseHedgeBroker);

// Get specific broker account
router.get("/:id", getBroker);

// Update broker account
router.put("/:id", updateBroker);

// Delete broker account
router.delete("/:id", deleteBroker);

// Validate broker account
router.post("/:id/validate", validateBroker);

// Replace broker credentials (archives the old account, syncs EasierProp)
router.post("/:id/replace", replaceBroker);

export default router;
