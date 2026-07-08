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
      role: true,
      status: true,
      createdAt: true,
    },
  });
};
export const updateClientProfile = async (
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string; company?: string },
) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      status: "ONBOARDING",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      company: true,
      status: true,
    },
  });
};