import { z } from 'zod';

export const createExtensionSchema = z.object({
  requestedMoveOutDate: z.string().trim().min(8).max(40),
  reason: z.string().trim().min(3).max(2000),
});

export const rejectExtensionSchema = z.object({
  ownerResponse: z.string().trim().min(3).max(2000).optional(),
  reason: z.string().trim().min(3).max(2000).optional(),
  ownerNotes: z.string().trim().min(3).max(2000).optional(),
}).refine((value) => Boolean(value.ownerResponse || value.reason || value.ownerNotes), {
  message: 'A rejection reason is required',
});
