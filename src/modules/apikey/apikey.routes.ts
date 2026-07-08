import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { addApiKey, listApiKeys } from "./apikey.controller";

const router = Router();

router.post("/", authenticate, addApiKey);
router.get("/", authenticate, listApiKeys);

export default router;
