import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

const conditionEnum = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'MISSING']);

export const createInspectionSchema = z.object({
  type: z.enum(['MOVE_IN', 'MOVE_OUT']).default('MOVE_IN'),
});

export const updateInspectionItemSchema = z.object({
  condition: conditionEnum.optional(),
  notes: z.string().trim().max(2000).optional(),
  issueDescription: z.string().trim().max(2000).optional(),
});

export const updateInspectionSchema = z.object({
  currentStepIndex: z.coerce.number().int().min(0).optional(),
  status: z
    .enum(['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVAL_PENDING', 'LOCKED', 'COMPLETED'])
    .optional(),
});

export const meterReadingSchema = z.object({
  type: z.enum(['ELECTRICITY', 'WATER', 'GAS', 'OTHER']),
  customTypeName: z.string().trim().max(80).optional().default(''),
  reading: z.string().trim().min(1).max(50),
  unit: z.string().trim().max(20).optional().default(''),
  meterNumber: z.string().trim().max(50).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
});

export const accessItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
  notes: z.string().trim().max(500).optional().default(''),
});

export const evidenceCaptionSchema = z.object({
  caption: z.string().trim().max(200).optional().default(''),
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
