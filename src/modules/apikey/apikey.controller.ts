import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { createApiKey, getUserApiKeys } from "./apikey.service";

export const addApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    const apiKey = await createApiKey(userId, name);

    res.status(201).json({
      message: "API key created",
      apiKey,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const listApiKeys = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;

    const keys = await getUserApiKeys(userId);

    res.json(keys);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
