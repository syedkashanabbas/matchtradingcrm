import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/requireAdmin.middleware";
import {
  agentCommissions,
  agentDownlineClients,
  agentQualification,
  adminGetPlan,
  adminUpsertPlan,
  adminCommissionReport,
  adminAgentCommissions,
  adminCreatePayoutBatch,
  adminListPayoutBatches,
  adminExportPayoutBatch,
  adminMarkPayoutBatchPaid,
} from "./commission.controller";

/**
 * Agent endpoints - mounted under /api/network (spec §7.2).
 * authenticate is applied per-route (never router.use): this router shares
 * the /api/network mount with public endpoints like /inviter/:refCode.
 */
export const agentCommissionRouter = Router();
agentCommissionRouter.get("/commissions", authenticate, agentCommissions);
agentCommissionRouter.get("/downline-clients", authenticate, agentDownlineClients);
agentCommissionRouter.get("/qualification", authenticate, agentQualification);

/** Admin endpoints - mounted under /api/admin/commissions (spec §7.2). */
export const adminCommissionRouter = Router();
adminCommissionRouter.use(authenticate, requireAdmin);
adminCommissionRouter.get("/plan", adminGetPlan);
adminCommissionRouter.put("/plan", adminUpsertPlan);
adminCommissionRouter.get("/payout-batches", adminListPayoutBatches);
adminCommissionRouter.post("/payout-batch", adminCreatePayoutBatch);
adminCommissionRouter.get("/payout-batch/:id/export", adminExportPayoutBatch);
adminCommissionRouter.post("/payout-batch/:id/mark-paid", adminMarkPayoutBatchPaid);
adminCommissionRouter.get("/agent/:agentId", adminAgentCommissions);
adminCommissionRouter.get("/", adminCommissionReport);
