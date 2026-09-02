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
  category: z.string().trim().max(120).optional().default(''),
  reason: z.string().trim().max(200).optional().default(''),
  description: z.string().trim().max(2000).optional().default(''),
  amount: z.coerce.number().min(0),
  damageAssessmentId: z.string().optional().nullable(),
  inspectionItemId: z.string().optional().nullable(),
});

export const disputeSchema = z.object({
  reason: z.enum([
    'DAMAGE_ALREADY_EXISTED',
    'NORMAL_WEAR_AND_TEAR',
    'AMOUNT_INCORRECT',
    'INCORRECT_ITEM',
    'NOT_CAUSED_BY_TENANT',
    'INSUFFICIENT_EVIDENCE',
    'OTHER',
  ]),
  description: z.string().trim().max(2000).optional().default(''),
  evidenceDataUrl: z.string().optional(),
});

export const resolveDisputeSchema = z.object({
  resolutionType: z.enum(['CANCEL', 'MODIFY', 'MAINTAIN']),
  resolvedAmount: z.coerce.number().min(0).optional(),
  resolutionNotes: z.string().trim().max(2000).optional().default(''),
});

export const signSchema = z.object({
  signatureDataUrl: z.string().min(20),
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
