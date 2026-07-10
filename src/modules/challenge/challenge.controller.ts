import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getChallengesForAgent,
  getPromosForAgent,
  adminListChallenges,
  adminUpsertChallenge,
  freezeChallenge,
  adminListPromos,
  adminUpsertPromo,
  adminSetPromoProgress,
} from "./challenge.service";

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ success: false, error: { code, message } });

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};

// ---------------- Agent ----------------

/** GET /api/network/challenges - active challenges + live leaderboard + my rank */
export const agentChallenges = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getChallengesForAgent(req.user.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "CHALLENGES_FAILED", error.message);
  }
};

/** GET /api/network/promos - active travel promos + my progress/state */
export const agentPromos = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getPromosForAgent(req.user.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "PROMOS_FAILED", error.message);
  }
};

// ---------------- Admin ----------------

/** GET /api/admin/challenges */
export const adminChallenges = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminListChallenges();
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "CHALLENGES_FAILED", error.message);
  }
};

/** POST /api/admin/challenges { id?, name, metric, prize, startsAt, endsAt } */
export const adminSaveChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const { name, metric, prize } = req.body ?? {};
    const id = req.params.id ?? req.body?.id;
    const startsAt = parseDate(req.body?.startsAt);
    const endsAt = parseDate(req.body?.endsAt);
    if (!name || !metric || !startsAt || !endsAt) {
      return fail(res, 400, "VALIDATION_ERROR", "name, metric, startsAt and endsAt are required");
    }
    const challenge = await adminUpsertChallenge(req.user.userId, {
      id: id ? String(id) : undefined,
      name: String(name),
      metric: String(metric),
      prize: String(prize ?? ""),
      startsAt,
      endsAt,
    });
    res.status(id ? 200 : 201).json({ success: true, data: challenge });
  } catch (error: any) {
    fail(res, 400, "CHALLENGE_SAVE_FAILED", error.message);
  }
};

/** POST /api/admin/challenges/:id/freeze - manual close with winners log */
export const adminFreezeChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const challenge = await freezeChallenge(req.params.id as string, req.user.userId);
    res.json({ success: true, data: challenge });
  } catch (error: any) {
    fail(res, 400, "CHALLENGE_FREEZE_FAILED", error.message);
  }
};

/** GET /api/admin/promos */
export const adminPromos = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminListPromos();
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "PROMOS_FAILED", error.message);
  }
};

/** POST /api/admin/promos { id?, name, metric, threshold, deadline } */
export const adminSavePromo = async (req: AuthRequest, res: Response) => {
  try {
    const { name, metric, threshold } = req.body ?? {};
    const id = req.params.id ?? req.body?.id;
    const deadline = parseDate(req.body?.deadline);
    if (!name || !metric || !deadline || threshold === undefined) {
      return fail(res, 400, "VALIDATION_ERROR", "name, metric, threshold and deadline are required");
    }
    const promo = await adminUpsertPromo(req.user.userId, {
      id: id ? String(id) : undefined,
      name: String(name),
      metric: String(metric),
      threshold: Number(threshold),
      deadline,
    });
    res.status(id ? 200 : 201).json({ success: true, data: promo });
  } catch (error: any) {
    fail(res, 400, "PROMO_SAVE_FAILED", error.message);
  }
};

/** PUT /api/admin/promos/:id/progress/:userId { status } */
export const adminPromoProgress = async (req: AuthRequest, res: Response) => {
  try {
    const status = String(req.body?.status ?? "");
    const progress = await adminSetPromoProgress(
      req.user.userId,
      req.params.id as string,
      req.params.userId as string,
      status
    );
    res.json({ success: true, data: progress });
  } catch (error: any) {
    fail(res, 400, "PROMO_PROGRESS_FAILED", error.message);
  }
};
