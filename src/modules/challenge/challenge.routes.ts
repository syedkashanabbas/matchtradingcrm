import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/requireAdmin.middleware";
import {
  agentChallenges,
  agentPromos,
  adminChallenges,
  adminSaveChallenge,
  adminFreezeChallenge,
  adminPromos,
  adminSavePromo,
  adminPromoProgress,
} from "./challenge.controller";

/**
 * Agent endpoints - mounted under /api/network (spec v1.1 §7.9).
 * authenticate applied per-route: the /api/network mount is shared with
 * public endpoints like /inviter/:refCode.
 */
export const agentChallengeRouter = Router();
agentChallengeRouter.get("/challenges", authenticate, agentChallenges);
agentChallengeRouter.get("/promos", authenticate, agentPromos);

/** Admin endpoints - /api/admin/challenges and /api/admin/promos. */
export const adminChallengeRouter = Router();
adminChallengeRouter.use(authenticate, requireAdmin);
adminChallengeRouter.get("/", adminChallenges);
adminChallengeRouter.post("/", adminSaveChallenge);
adminChallengeRouter.put("/:id", adminSaveChallenge);
adminChallengeRouter.post("/:id/freeze", adminFreezeChallenge);

export const adminPromoRouter = Router();
adminPromoRouter.use(authenticate, requireAdmin);
adminPromoRouter.get("/", adminPromos);
adminPromoRouter.post("/", adminSavePromo);
adminPromoRouter.put("/:id", adminSavePromo);
adminPromoRouter.put("/:id/progress/:userId", adminPromoProgress);
