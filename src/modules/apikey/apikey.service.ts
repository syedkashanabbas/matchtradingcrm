import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../../config/prisma";

/**
 * 🔥 Create API Key (SECURE VERSION)
 */
export const createApiKey = async (userId: string, name: string) => {
  // ✅ generate raw key (this goes to client)
  const rawKey = crypto.randomBytes(32).toString("hex");

  // ✅ hash key (this goes to database)
  const hashedKey = await bcrypt.hash(rawKey, 10);

  const apiKey = await prisma.apiKey.create({
    data: {
      hashedKey,
      name,
      userId,
    },
  });

  // ✅ activate user automatically
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "ACTIVE",
    },
  });

  // 🔥 return RAW key only once
  return {
    id: apiKey.id,
    name: apiKey.name,
    key: rawKey,
    createdAt: apiKey.createdAt,
  };
};

/**
 * 🔥 Get User API Keys (safe list)
 */
export const getUserApiKeys = async (userId: string) => {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
};

/**
 * 🔥 Verify EA Access (UPDATED for hashed keys)
 */
export const verifyEaAccess = async (apiKey: string, deviceId: string) => {
  // get all keys (because they are hashed now)
  const keys = await prisma.apiKey.findMany({
    include: { user: true },
  });

  let matchedKey = null;

  // compare provided key with hashed keys
  for (const keyRecord of keys) {
    const isMatch = await bcrypt.compare(apiKey, keyRecord.hashedKey);
    if (isMatch) {
      matchedKey = keyRecord;
      break;
    }
  }

  // ❌ key not found
  if (!matchedKey) {
    return {
      allowed: false,
      reason: "INVALID_KEY",
    };
  }

  // ❌ user not active
  if (matchedKey.user.status !== "ACTIVE") {
    return {
      allowed: false,
      reason: "USER_NOT_ACTIVE",
    };
  }

  // ✅ success
  return {
    allowed: true,
    userId: matchedKey.user.id,
  };
};
