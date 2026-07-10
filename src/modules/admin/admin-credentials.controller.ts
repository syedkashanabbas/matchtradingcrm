import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { prisma } from "../../config/prisma";
import { decryptData } from "../../utils/encryption";
import { auditCredentialViewed } from "../../services/audit.service";

/**
 * On-demand credential reveal for admins (D1).
 * Every call is audit-logged with the admin id, target user and account.
 */
export const revealCredentials = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user.userId;
    const { userId, accountType, accountId } = req.params as {
      userId: string;
      accountType: string;
      accountId: string;
    };

    if (accountType !== "broker" && accountType !== "prop") {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ACCOUNT_TYPE", message: "accountType must be 'broker' or 'prop'" },
      });
    }

    let payload: Record<string, string | null>;

    if (accountType === "broker") {
      const account = await prisma.brokerAccount.findFirst({ where: { id: accountId, userId } });
      if (!account) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Broker account not found" },
        });
      }
      payload = {
        mt5AccountNumber: account.mt5AccountNumber,
        mt5Password: account.mt5Password ? decryptData(account.mt5Password) : null,
        mt5Server: account.mt5Server,
        brokerPortalPassword: account.brokerPortalPassword
          ? decryptData(account.brokerPortalPassword)
          : null,
      };
    } else {
      const account = await prisma.propAccount.findFirst({ where: { id: accountId, userId } });
      if (!account) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Prop account not found" },
        });
      }
      payload = {
        mt5AccountNumber: account.mt5AccountNumber,
        mt5Password: account.mt5Password ? decryptData(account.mt5Password) : null,
        mt5Server: account.mt5Server,
      };
    }

    await auditCredentialViewed(adminId, userId, accountType, accountId, req.ip);

    res.json({ success: true, data: payload });
  } catch (error: any) {
    console.error("Credential reveal error:", error);
    res.status(500).json({
      success: false,
      error: { code: "REVEAL_FAILED", message: error.message },
    });
  }
};
