import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getAgentCommissions,
  getDownlineClients,
  getActivePlan,
  upsertPlan,
  getCommissionReport,
  getAgentCommissionsForAdmin,
  createPayoutBatch,
  listPayoutBatches,
  exportPayoutBatchCsv,
  markPayoutBatchPaid,
} from "./commission.service";
import { getQualificationState } from "./qualification.service";

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ success: false, error: { code, message } });

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};

// ---------------- Agent ----------------

/** GET /api/network/commissions?from=&to=&status= */
export const agentCommissions = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getAgentCommissions(req.user.userId, {
      from: parseDate(req.query.from),
      to: parseDate(req.query.to),
      status: typeof req.query.status === "string" && req.query.status ? req.query.status : undefined,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "COMMISSIONS_FAILED", error.message);
  }
};

/** GET /api/network/downline-clients */
export const agentDownlineClients = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getDownlineClients(req.user.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "DOWNLINE_FAILED", error.message);
  }
};

// ---------------- Admin ----------------

/** GET /api/admin/commissions/plan */
export const adminGetPlan = async (req: AuthRequest, res: Response) => {
  try {
    const plan = await getActivePlan();
    res.json({ success: true, data: plan });
  } catch (error: any) {
    fail(res, 500, "PLAN_FETCH_FAILED", error.message);
  }
};

/** PUT /api/admin/commissions/plan { name, isActive, levels: [{level, rate, minActiveDirects}] } */
export const adminUpsertPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { name, isActive = true, levels } = req.body ?? {};
    if (!name || !Array.isArray(levels)) {
      return fail(res, 400, "VALIDATION_ERROR", "name and levels[] are required");
    }
    const plan = await upsertPlan(req.user.userId, {
      name: String(name),
      isActive: Boolean(isActive),
      levels: levels.map((l: any) => ({
        level: Number(l.level),
        rate: Number(l.rate),
        minActiveDirects: Number(l.minActiveDirects ?? 0),
      })),
    });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    fail(res, 400, "PLAN_UPDATE_FAILED", error.message);
  }
};

/** GET /api/network/qualification - active directs, thresholds, month snapshot */
export const agentQualification = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getQualificationState(req.user.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "QUALIFICATION_FAILED", error.message);
  }
};

/** GET /api/admin/commissions?from=&to= - report aggregated by agent */
export const adminCommissionReport = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getCommissionReport({
      from: parseDate(req.query.from),
      to: parseDate(req.query.to),
    });
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "REPORT_FAILED", error.message);
  }
};

/** GET /api/admin/commissions/agent/:agentId - drill-down */
export const adminAgentCommissions = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getAgentCommissionsForAdmin(req.params.agentId as string, {
      from: parseDate(req.query.from),
      to: parseDate(req.query.to),
    });
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "AGENT_COMMISSIONS_FAILED", error.message);
  }
};

/** POST /api/admin/commissions/payout-batch { periodStart, periodEnd } */
export const adminCreatePayoutBatch = async (req: AuthRequest, res: Response) => {
  try {
    const periodStart = parseDate(req.body?.periodStart);
    const periodEnd = parseDate(req.body?.periodEnd);
    if (!periodStart || !periodEnd) {
      return fail(res, 400, "VALIDATION_ERROR", "periodStart and periodEnd are required (ISO dates)");
    }
    const batch = await createPayoutBatch(req.user.userId, periodStart, periodEnd);
    res.status(201).json({ success: true, data: batch });
  } catch (error: any) {
    fail(res, 400, "BATCH_CREATE_FAILED", error.message);
  }
};

/** GET /api/admin/commissions/payout-batches */
export const adminListPayoutBatches = async (req: AuthRequest, res: Response) => {
  try {
    const data = await listPayoutBatches();
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "BATCH_LIST_FAILED", error.message);
  }
};

/** GET /api/admin/commissions/payout-batch/:id/export - CSV download */
export const adminExportPayoutBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { filename, csv } = await exportPayoutBatchCsv(req.params.id as string);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error: any) {
    fail(res, 400, "BATCH_EXPORT_FAILED", error.message);
  }
};

/** POST /api/admin/commissions/payout-batch/:id/mark-paid */
export const adminMarkPayoutBatchPaid = async (req: AuthRequest, res: Response) => {
  try {
    const batch = await markPayoutBatchPaid(req.params.id as string, req.user.userId);
    res.json({ success: true, data: batch });
  } catch (error: any) {
    fail(res, 400, "BATCH_MARK_PAID_FAILED", error.message);
  }
};
