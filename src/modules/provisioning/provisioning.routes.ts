import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { clientProvisioningStatus } from "./provisioning.controller";

const router = Router();

router.get("/status", authenticate, clientProvisioningStatus);

export default router;
