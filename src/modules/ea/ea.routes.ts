import { Router } from "express";
import { 
  verifyEaController, 
  registerEADeviceController, 
  unregisterEADeviceController, 
  getEAConfigController 
} from "./ea.controller";

const router = Router();

// EA validation endpoint (used by EA)
router.post("/check", verifyEaController);

// Device management endpoints
router.post("/register-device", registerEADeviceController);
router.post("/unregister-device", unregisterEADeviceController);

// Configuration endpoint (used by EA)
router.get("/config", getEAConfigController);

export default router;
