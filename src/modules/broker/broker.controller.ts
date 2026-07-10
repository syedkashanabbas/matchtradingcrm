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
  replaceBrokerAccount,
  setHedgeBroker,
} from "./broker.service";

/** POST /api/broker/:id/replace - broker credential replacement (§5.4) */
export const replaceBroker = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { brokerName, mt5AccountNumber, mt5Password, mt5Server, brokerPortalPassword } = req.body;

    if (!brokerName || !mt5AccountNumber || !mt5Password || !mt5Server) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "brokerName, mt5AccountNumber, mt5Password and mt5Server are required" },
      });
    }

    const broker = await replaceBrokerAccount(userId, id as string, {
      brokerName,
      mt5AccountNumber,
      mt5Password,
      mt5Server,
      brokerPortalPassword,
    });
    res.status(201).json({ success: true, data: broker });
  } catch (error: any) {
    console.error("Replace broker error:", error);
    res.status(400).json({ success: false, error: { code: "BROKER_REPLACE_FAILED", message: error.message } });
  }
};

/** POST /api/broker/hedge-broker - designate the hedge broker (§5.4) */
export const chooseHedgeBroker = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { brokerAccountId } = req.body;

    if (!brokerAccountId) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "brokerAccountId is required" },
      });
    }

    const command = await setHedgeBroker(userId, brokerAccountId, userId);
    res.json({ success: true, message: "Hedge broker change queued", data: command });
  } catch (error: any) {
    console.error("Set hedge broker error:", error);
    res.status(400).json({ success: false, error: { code: "HEDGE_BROKER_FAILED", message: error.message } });
  }
};

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
