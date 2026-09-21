import { z } from 'zod';
import { CONDITION_CATEGORIES, COMPLIANCE_STATUSES } from '../models/TenancyCondition.js';
import { CHANGE_TYPES } from '../models/PropertyChangeRequest.js';

export const conditionSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().default(''),
  category: z.enum(CONDITION_CATEGORIES).optional().default('GENERAL'),
  isMandatory: z.boolean().optional().default(true),
  requiresTenantAcceptance: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const conditionUpdateSchema = conditionSchema.partial();

export const complianceSchema = z.object({
  complianceStatus: z.enum(COMPLIANCE_STATUSES),
  complianceNotes: z.string().trim().max(2000).optional().default(''),
  evidenceDataUrl: z.string().optional(),
});

export const changeRequestSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().default(''),
  reason: z.string().trim().max(2000).optional().default(''),
  changeType: z.enum(CHANGE_TYPES).optional().default('OTHER'),
  roomId: z.string().optional().default(''),
  roomName: z.string().optional().default(''),
  inventoryItemId: z.string().optional().default(''),
  requestedAction: z.string().trim().max(160).optional().default(''),
  beforeState: z.string().trim().max(500).optional().default(''),
  requestedState: z.string().trim().max(500).optional().default(''),
  evidenceDataUrl: z.string().optional(),
  evidenceDataUrls: z.array(z.string()).optional(),
  tenantCommitments: z
    .array(
      z.union([
        z.string().trim().min(2).max(500),
        z.object({
          text: z.string().trim().min(2).max(500),
          details: z.string().trim().max(1000).optional().default(''),
        }),
      ]),
    )
    .min(1, 'Add at least one commitment'),
});

export const approveChangeSchema = z.object({
  ownerNotes: z.string().trim().max(2000).optional().default(''),
  ownerConditions: z.string().trim().max(2000).optional().default(''),
  ownerConditionItems: z
    .array(
      z.union([
        z.string().trim().min(2).max(500),
        z.object({
          text: z.string().trim().min(2).max(500),
          details: z.string().trim().max(1000).optional().default(''),
        }),
      ]),
    )
    .optional(),
  conditions: z
    .array(
      z.union([
        z.string().trim().min(2).max(500),
        z.object({
          text: z.string().trim().min(2).max(500),
          details: z.string().trim().max(1000).optional().default(''),
        }),
      ]),
    )
    .optional(),
});

export const declineConditionsSchema = z.object({
  reason: z.string().trim().max(2000).optional().default(''),
  note: z.string().trim().max(2000).optional().default(''),
});

export const rejectChangeSchema = z.object({
  ownerNotes: z.string().trim().min(3).max(2000).optional(),
  reason: z.string().trim().min(3).max(2000).optional(),
}).refine((value) => Boolean(value.reason || value.ownerNotes), {
  message: 'A rejection reason is required',
});

export const changeComplianceSchema = z.object({
  complianceStatus: z.enum(COMPLIANCE_STATUSES),
  complianceNotes: z.string().trim().max(2000).optional().default(''),
  moveOutInspectionId: z.string().optional(),
  evidenceDataUrl: z.string().optional(),
});

export const completeChangeSchema = z.object({
  note: z.string().trim().max(500).optional().default(''),
  completionNotes: z.string().trim().max(500).optional().default(''),
  evidenceDataUrl: z.string().optional(),
});

export const chatMessageSchema = z
  .object({
    text: z.string().trim().max(4000).optional().default(''),
    evidenceDataUrl: z.string().optional(),
  })
  .refine((value) => Boolean(value.text?.trim() || value.evidenceDataUrl), {
    message: 'Enter a message or attach a photo.',
  });
