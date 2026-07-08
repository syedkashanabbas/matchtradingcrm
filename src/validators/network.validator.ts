import { z } from 'zod';

export const assignUplineSchema = z.object({
  uplineUserId: z.string().uuid()
});

export const changeUplineSchema = z.object({
  newUplineUserId: z.string().uuid()
});

export const registerWithReferralSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(10).regex(/^[\+]?[0-9]{10,15}$/, 'Please enter a valid phone number (10-15 digits)'),
  refCode: z.string().optional()
});
