import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { profile, updateProfile } from "./client.controller";
import { getDashboard, getSubscription } from "./client-dashboard.controller";

const router = Router();

router.get("/profile", authenticate, profile);
router.put("/profile", authenticate, updateProfile);
router.get("/dashboard", authenticate, getDashboard);
router.get("/subscription", authenticate, getSubscription);

export default router;
