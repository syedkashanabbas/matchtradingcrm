import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createBrokerAccount,
  getBrokerAccounts,
  getBrokerAccount,
  updateBrokerAccount,
  deleteBrokerAccount,
  validateBrokerAccount,
  getBrokerStats,
  getSupportedBrokers,
} from "./broker.service";

export const createBroker = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const brokerData = req.body;

    const broker = await createBrokerAccount(userId, brokerData);
    res.status(201).json(broker);
  } catch (error: any) {
    console.error("Create broker error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getBrokerList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const includeArchived = req.query.includeArchived === 'true';

    const brokers = await getBrokerAccounts(userId);
    res.json(brokers);
  } catch (error: any) {
    console.error("Get broker list error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getBroker = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const broker = await getBrokerAccount(id as string, userId);
    res.json(broker);
  } catch (error: any) {
    console.error("Get broker error:", error);
    res.status(404).json({ message: error.message });
  }
};

export const updateBroker = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updateData = req.body;

    const broker = await updateBrokerAccount(id as string, userId, updateData);
    res.json(broker);
  } catch (error: any) {
    console.error("Update broker error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteBroker = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await deleteBrokerAccount(id as string, userId);
    res.json(result);
  } catch (error: any) {
    console.error("Delete broker error:", error);
    res.status(404).json({ message: error.message });
  }
};

export const validateBroker = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await validateBrokerAccount(id as string, userId);
    res.json(result);
  } catch (error: any) {
    console.error("Validate broker error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getBrokerStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const stats = await getBrokerStats(userId);
    res.json(stats);
  } catch (error: any) {
    console.error("Get broker stats error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getSupportedBrokersList = async (req: Request, res: Response) => {
  try {
    const brokers = getSupportedBrokers();
    res.json(brokers);
  } catch (error: any) {
    console.error("Get supported brokers error:", error);
    res.status(500).json({ message: error.message });
  }
};
