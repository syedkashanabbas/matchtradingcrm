import { z } from "zod";

export const onboardingBrokerSchema = z.object({
  brokerName: z.string().min(1).max(100),
  mt5AccountNumber: z.string().min(1).max(50),
  mt5Password: z.string().min(1).max(200),
  mt5Server: z.string().min(1).max(100),
  brokerPortalPassword: z.string().min(1).max(200).optional(),
});

export const onboardingPropSchema = z.object({
  firmName: z.string().min(1).max(100),
  mt5AccountNumber: z.string().min(1).max(50),
  mt5Password: z.string().min(1).max(200),
  mt5Server: z.string().min(1).max(100),
  phase: z.enum(["CHALLENGE", "FUNDED"]).default("CHALLENGE"),
  ftmoCreditDetail: z.string().max(200).optional(),
  ftmoAccountDetail: z.string().max(200).optional(),
  ftmoUserName: z.string().max(100).optional(),
});

export type OnboardingBrokerInput = z.infer<typeof onboardingBrokerSchema>;
export type OnboardingPropInput = z.infer<typeof onboardingPropSchema>;
