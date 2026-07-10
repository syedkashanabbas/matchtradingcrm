import { Request, Response } from "express";
import {
  getAdminDashboard,
  getAllUsers,
  getUserDetail,
  updateUserStatus,
  getAllBrokerConfigs,
  getAllPropConfigs,
  getAllSubscriptions,
  updateBrokerConfigStatus,
  updatePropConfigStatus,
} from "./admin.service";

/**
 * All subscriptions (admin)
 */
export const listSubscriptions = async (req: Request, res: Response) => {
  try {
    const data = await getAllSubscriptions();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: "SUBSCRIPTIONS_FAILED", message: error.message } });
  }
};

/**
 * Get one user's full detail (admin client page)
 */
export const userDetail = async (req: Request, res: Response) => {
  try {
    const data = await getUserDetail(req.params.id as string);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: error.message } });
  }
};

/**
 * Dashboard
 */
export const adminDashboard = async (req: Request, res: Response) => {
  try {
    const data = await getAdminDashboard();

    res.json({
      message: "Admin dashboard fetched",
      data,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * List users
 */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();

    res.json({
      message: "Users fetched",
      users,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Change user status
 */
export const changeUserStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const status = req.body.status as string;

    if (!id || !status) {
      return res.status(400).json({
        message: "User id and status are required",
      });
    }

    const user = await updateUserStatus(id, status);

    res.json({
      message: "User status updated",
      user,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all broker configurations (admin only)
 */
export const getAllBrokers = async (req: Request, res: Response) => {
  try {
    const brokerConfigs = await getAllBrokerConfigs();
    
    res.json({
      message: "Broker configurations fetched",
      data: brokerConfigs,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all Prop Firm configurations (admin only)
 */
export const getAllPropFirms = async (req: Request, res: Response) => {
  try {
    const propConfigs = await getAllPropConfigs();
    
    res.json({
      message: "Prop Firm configurations fetched",
      data: propConfigs,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update Broker status (admin only)
 */
export const updateBrokerStatus = async (req: Request, res: Response) => {
  try {
    const { userId, status } = req.body;
    const brokerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    await updateBrokerConfigStatus(brokerId, status);
    
    res.json({
      message: "Broker status updated successfully",
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update Prop Firm status (admin only)
 */
export const updatePropFirmStatus = async (req: Request, res: Response) => {
  try {
    const { userId, status } = req.body;
    const propId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    await updatePropConfigStatus(propId, status);
    
    res.json({
      message: "Prop Firm status updated successfully",
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
