import { prisma } from "../../config/prisma";

export const getClientProfile = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      company: true,
      country: true,
      payoutReference: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
};

export const updateClientProfile = async (
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    country?: string;
    payoutReference?: string;
  },
) => {
  // Whitelist updatable fields - never spread raw input into the update
  const allowed: Record<string, string> = {};
  for (const field of ["firstName", "lastName", "phone", "company", "country", "payoutReference"] as const) {
    const value = data[field];
    if (typeof value === "string" && value.length <= 200) {
      allowed[field] = value;
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: allowed,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      company: true,
      country: true,
      payoutReference: true,
      status: true,
    },
  });
};
