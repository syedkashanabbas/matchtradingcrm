import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getClientProvisioningStatus,
  listProvisions,
  getProvisionDetail,
  retryProvision,
  reprovision,
} from "./provisioning.service";
import {
  enqueueServiceCommand,
  getServiceStatus,
} from "./service-control.service";

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ success: false, error: { code, message } });

// ---------------- Client ----------------

/** GET /api/provisioning/status */
export const clientProvisioningStatus = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getClientProvisioningStatus(req.user.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "PROVISIONING_STATUS_FAILED", error.message);
  }
};

// ---------------- Admin ----------------

/** GET /api/admin/provisioning?status= */
export const adminListProvisions = async (req: AuthRequest, res: Response) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const data = await listProvisions(status);
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "PROVISIONING_LIST_FAILED", error.message);
  }
};

/** GET /api/admin/provisioning/:userId */
export const adminProvisionDetail = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getProvisionDetail(req.params.userId as string);
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "PROVISIONING_DETAIL_FAILED", error.message);
  }
};

/** POST /api/admin/provisioning/:userId/retry */
export const adminRetryProvision = async (req: AuthRequest, res: Response) => {
  try {
    const data = await retryProvision(req.params.userId as string, req.user.userId);
    res.json({ success: true, message: "Retry scheduled", data });
  } catch (error: any) {
    fail(res, 400, "PROVISIONING_RETRY_FAILED", error.message);
  }
};

/** POST /api/admin/provisioning/:userId/reprovision */
export const adminReprovision = async (req: AuthRequest, res: Response) => {
  try {
    const data = await reprovision(req.params.userId as string, req.user.userId);
    res.json({ success: true, message: "Reprovision scheduled", data });
  } catch (error: any) {
    fail(res, 400, "REPROVISION_FAILED", error.message);
  }
};

/** POST /api/admin/service/:userId/start */
export const adminServiceStart = async (req: AuthRequest, res: Response) => {
  try {
    const command = await enqueueServiceCommand(req.params.userId as string, "START", {}, req.user.userId);
    res.json({ success: true, message: "Start operation queued", data: command });
  } catch (error: any) {
    fail(res, 400, "SERVICE_START_FAILED", error.message);
  }
};

/** POST /api/admin/service/:userId/stop */
export const adminServiceStop = async (req: AuthRequest, res: Response) => {
  try {
    const command = await enqueueServiceCommand(req.params.userId as string, "STOP", {}, req.user.userId);
    res.json({ success: true, message: "Stop operation queued", data: command });
  } catch (error: any) {
    fail(res, 400, "SERVICE_STOP_FAILED", error.message);
  }
};

/** POST /api/admin/service/:userId/delete - destructive; requires confirm flag (double confirmation in UI). */
export const adminServiceDelete = async (req: AuthRequest, res: Response) => {
  try {
    if (req.body?.confirm !== true) {
      return fail(res, 400, "CONFIRMATION_REQUIRED", "Pass { confirm: true } to delete the service on EasierProp");
    }
    const command = await enqueueServiceCommand(req.params.userId as string, "DELETE", {}, req.user.userId);
    res.json({ success: true, message: "Delete operation queued", data: command });
  } catch (error: any) {
    fail(res, 400, "SERVICE_DELETE_FAILED", error.message);
  }
};

/** GET /api/admin/service/:userId/status */
export const adminServiceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getServiceStatus(req.params.userId as string);
    res.json({ success: true, data });
  } catch (error: any) {
    fail(res, 500, "SERVICE_STATUS_FAILED", error.message);
  }
};
