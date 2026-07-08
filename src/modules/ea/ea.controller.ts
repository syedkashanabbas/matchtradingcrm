import { Request, Response } from "express";
import { validateEARequest, registerEADevice, unregisterEADevice, getEAConfig } from "./ea.service";
import { validateDeviceRegistration } from "../../middleware/validation.middleware";

export const verifyEaController = async (req: Request, res: Response) => {
  try {
    const validationRequest = req.body;

    // Validate required fields
    if (!validationRequest.apiKey || !validationRequest.fingerprint || !validationRequest.deviceInfo) {
      return res.status(400).json({
        valid: false,
        error: "MISSING_FIELDS",
      });
    }

    const result = await validateEARequest(validationRequest);
    return res.json(result);
  } catch (error) {
    console.error("EA verify error:", error);
    return res.status(500).json({
      valid: false,
      error: "SERVER_ERROR",
    });
  }
};

export const registerEADeviceController = async (req: Request, res: Response) => {
  try {
    const { apiKey, deviceInfo } = req.body;

    if (!apiKey || !deviceInfo) {
      return res.status(400).json({
        message: "API key and device information are required",
      });
    }

    const device = await registerEADevice(apiKey, deviceInfo);
    return res.status(201).json(device);
  } catch (error: any) {
    console.error("Register EA device error:", error);
    return res.status(400).json({
      message: error.message,
    });
  }
};

export const unregisterEADeviceController = async (req: Request, res: Response) => {
  try {
    const { apiKey, fingerprint } = req.body;

    if (!apiKey || !fingerprint) {
      return res.status(400).json({
        message: "API key and fingerprint are required",
      });
    }

    const result = await unregisterEADevice(apiKey, fingerprint);
    return res.json(result);
  } catch (error: any) {
    console.error("Unregister EA device error:", error);
    return res.status(400).json({
      message: error.message,
    });
  }
};

export const getEAConfigController = async (req: Request, res: Response) => {
  try {
    const { version } = req.query;
    const config = await getEAConfig(version as string);
    return res.json(config);
  } catch (error: any) {
    console.error("Get EA config error:", error);
    return res.status(404).json({
      message: error.message,
    });
  }
};
