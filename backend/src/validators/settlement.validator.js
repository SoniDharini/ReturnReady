import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const damageAssessmentSchema = z.object({
  key: z.string().optional(),
  moveOutItemId: z.string().optional(),
  classification: z.enum([
    'NORMAL_WEAR_AND_TEAR',
    'EXISTING_DAMAGE',
    'TENANT_DAMAGE',
    'MISSING_ITEM',
    'REQUIRES_REVIEW',
    'NO_ACTION',
  ]),
  description: z.string().trim().max(2000).optional().default(''),
});

export const deductionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(200).optional().default(''),
  description: z.string().trim().max(2000).optional().default(''),
  amount: z.coerce.number().min(0),
  damageAssessmentId: z.string().optional().nullable(),
  inspectionItemId: z.string().optional().nullable(),
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
