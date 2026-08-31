import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

const roomTypeEnum = z.enum([
  'BEDROOM',
  'BATHROOM',
  'LIVING_ROOM',
  'KITCHEN',
  'BALCONY',
  'DINING_ROOM',
  'CUSTOM',
]);

const inventoryItemSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.coerce.number().min(0).default(1),
  description: z.string().optional().default(''),
});

const roomSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  type: roomTypeEnum.optional().default('CUSTOM'),
  isCustom: z.boolean().optional().default(false),
  items: z.array(inventoryItemSchema).optional().default([]),
});

const imageMetaSchema = z.object({
  id: z.string().optional(),
  imageUrl: z.string().trim().min(1),
  caption: z.string().trim().optional().default(''),
  uploadedAt: z.union([z.string(), z.date()]).optional(),
  uploadedBy: z.string().optional(),
});

export const propertySchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z
    .enum(['apartment', 'house', 'villa', 'pg', 'office', 'studio', 'other'])
    .default('apartment'),
  address: z.string().trim().min(2),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pin: z.string().trim().min(4).max(12),
  rooms: z.coerce.number().int().min(0).optional().default(0),
  bathrooms: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(['Draft', 'Active', 'Archived']).optional().default('Active'),
  roomList: z.array(roomSchema).optional().default([]),
  images: z.array(imageMetaSchema).optional().default([]),
});

export const imageCaptionSchema = z.object({
  caption: z.string().trim().max(200).optional().default(''),
});

export const tenancySchema = z.object({
  propertyId: z.string().min(1),
  tenantName: z.string().trim().min(2),
  tenantEmail: z.string().trim().email().transform((v) => v.toLowerCase()),
  tenantPhone: z.string().trim().optional().default(''),
  moveIn: z.string().min(1),
  moveOut: z.string().min(1),
  rent: z.coerce.number().min(0),
  deposit: z.coerce.number().min(0),
});

export const activateTenantSchema = z.object({
  token: z.string().min(10),
  password: z
    .string()
    .min(8)
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[0-9]/, 'Password must include a number'),
});

const occupancyStatusEnum = z.enum([
  'UPCOMING',
  'CURRENTLY_STAYING',
  'PREPARING_TO_MOVE_OUT',
  'MOVED_OUT',
  'COMPLETED',
]);

export const tenancyUpdateSchema = z
  .object({
    moveIn: z.string().min(1).optional(),
    moveOut: z.string().min(1).optional(),
    actualMoveOut: z.string().min(1).nullable().optional(),
    moveOutReason: z.string().trim().max(200).optional(),
    moveOutNotes: z.string().trim().max(2000).optional(),
    occupancyStatus: occupancyStatusEnum.optional(),
    tenantPhone: z.string().trim().optional(),
    changeReason: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const startMoveOutSchema = z.object({
  actualMoveOut: z.string().min(1),
  moveOutReason: z.string().trim().min(1).max(200),
  moveOutNotes: z.string().trim().max(2000).optional().default(''),
});

function formatZodErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ApiError(400, 'Validation failed', formatZodErrors(result.error)));
    }
    req.body = result.data;
    return next();
  };
}
