import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { getClientProfile } from "./client.service";
import { updateClientProfile } from "./client.service";

export const profile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const client = await getClientProfile(userId);

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// export const updateProfile = async (req: AuthRequest, res: Response) => {
//   try {
//     const userId = req.user.userId;

//     const updated = await updateClientProfile(userId, req.body);

//     res.json({
//       message: "Profile updated",
//       user: updated,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;

    const updated = await updateClientProfile(userId, req.body);

    res.json({
      message: "Profile updated",
      user: updated,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};