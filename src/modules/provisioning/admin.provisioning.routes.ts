import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/requireAdmin.middleware";
import {
  adminListProvisions,
  adminProvisionDetail,
  adminRetryProvision,
  adminReprovision,
  adminServiceStart,
  adminServiceStop,
  adminServiceDelete,
  adminServiceStatus,
} from "./provisioning.controller";

const provisioningRouter = Router();
provisioningRouter.use(authenticate, requireAdmin);
provisioningRouter.get("/", adminListProvisions);
provisioningRouter.get("/:userId", adminProvisionDetail);
provisioningRouter.post("/:userId/retry", adminRetryProvision);
provisioningRouter.post("/:userId/reprovision", adminReprovision);

const serviceRouter = Router();
serviceRouter.use(authenticate, requireAdmin);
serviceRouter.post("/:userId/start", adminServiceStart);
serviceRouter.post("/:userId/stop", adminServiceStop);
serviceRouter.post("/:userId/delete", adminServiceDelete);
serviceRouter.get("/:userId/status", adminServiceStatus);

export { provisioningRouter, serviceRouter };
