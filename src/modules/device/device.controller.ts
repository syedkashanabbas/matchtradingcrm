import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  registerDevice,
  getDevicesForApiKey,
  removeDevice,
  validateDeviceAccess,
  getDeviceStats,
  cleanupInactiveDevices,
} from "./device.service";

export const registerApiKeyDevice = async (req: AuthRequest, res: Response) => {
  try {
    const { apiKeyId } = req.params;
    const deviceInfo = req.body;

    if (!deviceInfo.accountLogin || !deviceInfo.brokerServer || !deviceInfo.computerName || !deviceInfo.eaVersion) {
      return res.status(400).json({ message: "Missing required device information" });
    }

    const device = await registerDevice(apiKeyId as string, deviceInfo);
    res.status(201).json(device);
  } catch (error: any) {
    console.error("Register device error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getApiKeyDevices = async (req: AuthRequest, res: Response) => {
  try {
    const { apiKeyId } = req.params;
    const devices = await getDevicesForApiKey(apiKeyId as string);
    res.json(devices);
  } catch (error: any) {
    console.error("Get devices error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const removeApiKeyDevice = async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.params;
    const result = await removeDevice(deviceId as string);
    res.json(result);
  } catch (error: any) {
    console.error("Remove device error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const validateDevice = async (req: Request, res: Response) => {
  try {
    const { apiKeyId, fingerprint } = req.body;

    if (!apiKeyId || !fingerprint) {
      return res.status(400).json({ message: "API key ID and fingerprint are required" });
    }

    const isValid = await validateDeviceAccess(apiKeyId, fingerprint);
    res.json({ valid: isValid });
  } catch (error: any) {
    console.error("Validate device error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getDeviceStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { apiKeyId } = req.params;
    const stats = await getDeviceStats(apiKeyId as string);
    res.json(stats);
  } catch (error: any) {
    console.error("Get device stats error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const cleanupDevices = async (req: AuthRequest, res: Response) => {
  try {
    const { daysInactive } = req.body;
    const cleanedCount = await cleanupInactiveDevices(daysInactive || 30);
    res.json({ cleanedCount });
  } catch (error: any) {
    console.error("Cleanup devices error:", error);
    res.status(500).json({ message: error.message });
  }
};
