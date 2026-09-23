import fs from 'fs';
import path from 'path';
import { DamageAssessment, REPAIR_REQUIRED_CLASSIFICATIONS } from '../models/DamageAssessment.js';
import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';
import { UPLOADS_ROOT } from '../middleware/upload.middleware.js';
import { getTenancyComparison } from './comparison.service.js';

const REPAIR_DIR = path.join(UPLOADS_ROOT, 'repairs');
fs.mkdirSync(REPAIR_DIR, { recursive: true });

export function requiresRepair(classification) {
  return REPAIR_REQUIRED_CLASSIFICATIONS.includes(classification);
}

export function initialResolution(classification) {
  return requiresRepair(classification) ? 'OPEN' : 'NOT_REQUIRED';
}

export function effectiveResolution(assessment) {
  return assessment.resolutionStatus || initialResolution(assessment.classification);
}

export function isRepairBlocking(assessment) {
  if (typeof assessment.$isDefault === 'function' && assessment.$isDefault('resolutionStatus')) {
    return false;
  }
  const status = assessment.resolutionStatus;
  if (!status || status === 'RESOLVED' || status === 'NOT_REQUIRED') return false;
  return (
    requiresRepair(assessment.classification) &&
    ['OPEN', 'REPAIR_PENDING', 'REPAIRED_PENDING_VERIFICATION'].includes(status)
  );
}

function assertTenancyOpen(tenancy) {
  if (tenancy.stage === 'complete' || tenancy.status === 'Completed') {
    throw new ApiError(403, 'This tenancy is completed and is read-only');
  }
}

function saveRepairEvidence(assessmentId, dataUrl) {
  if (!dataUrl) return '';
  if (!dataUrl.startsWith('data:image/')) {
    throw new ApiError(400, 'Repair evidence must be an image');
  }
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const filename = `repair-${assessmentId}-${Date.now()}.png`;
  fs.writeFileSync(path.join(REPAIR_DIR, filename), Buffer.from(base64, 'base64'));
  return `/uploads/repairs/${filename}`;
}

const DEDUCTION_CLASSIFICATIONS = ['TENANT_DAMAGE', 'MISSING_ITEM'];

async function getTenancyForUser(user, tenancyId) {
  const tenancy =
    user.role === 'OWNER'
      ? await Tenancy.findOne({ _id: tenancyId, ownerId: user.id })
      : await Tenancy.findOne({
          _id: tenancyId,
          tenantUserId: user.id,
          inviteStatus: 'Accepted',
        });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  return tenancy;
}

export async function listAssessments(user, tenancyId) {
  await getTenancyForUser(user, tenancyId);
  const assessments = await DamageAssessment.find({ tenancyId }).sort({ createdAt: -1 });
  return assessments.map((a) => a.toJSON());
}

export async function upsertAssessment(user, tenancyId, payload) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can create damage assessments');
  }

  const tenancy = await getTenancyForUser(user, tenancyId);
  const comparison = await getTenancyComparison(user, tenancyId);

  const item = comparison.items.find(
    (i) =>
      (payload.moveOutItemId && i.moveOutItemId === payload.moveOutItemId) ||
      (payload.key && i.key === payload.key),
  );

  if (!item) {
    throw new ApiError(404, 'Comparison item not found');
  }

  const deductionRequired = DEDUCTION_CLASSIFICATIONS.includes(payload.classification);

  const existing = await DamageAssessment.findOne({
    tenancyId,
    moveOutItemId: item.moveOutItemId,
  });

  const data = {
    tenancyId: tenancy._id,
    moveInInspectionId: comparison.moveInInspectionId,
    moveOutInspectionId: comparison.moveOutInspectionId,
    roomId: item.roomId,
    inventoryItemId: item.inventoryItemId || null,
    moveInItemId: item.moveInItemId,
    moveOutItemId: item.moveOutItemId,
    itemName: item.itemName,
    comparisonResult: item.result,
    classification: payload.classification,
    description: payload.description || '',
    deductionRequired,
    assessedBy: user.id,
    assessedAt: new Date(),
  };

  let assessment;
  if (existing) {
    Object.assign(existing, data);
    if (!requiresRepair(payload.classification)) {
      existing.resolutionStatus = 'NOT_REQUIRED';
    } else if (!existing.resolutionStatus || existing.resolutionStatus === 'NOT_REQUIRED') {
      existing.resolutionStatus = 'OPEN';
    }
    await existing.save();
    assessment = existing;
  } else {
    assessment = await DamageAssessment.create({
      ...data,
      resolutionStatus: initialResolution(payload.classification),
    });
  }

  return assessment.toJSON();
}

export async function deleteAssessment(user, assessmentId) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can delete damage assessments');
  }

  const assessment = await DamageAssessment.findById(assessmentId);
  if (!assessment) throw new ApiError(404, 'Assessment not found');

  const tenancy = await Tenancy.findOne({ _id: assessment.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');

  await assessment.deleteOne();
  return true;
}

async function loadOwnedAssessment(user, assessmentId) {
  const assessment = await DamageAssessment.findById(assessmentId);
  if (!assessment) throw new ApiError(404, 'Assessment not found');
  const tenancy = await getTenancyForUser(user, assessment.tenancyId.toString());
  return { assessment, tenancy };
}

export async function submitRepair(user, assessmentId, payload) {
  if (user.role !== 'TENANT') {
    throw new ApiError(403, 'Only the tenant can submit a repair');
  }

  const { assessment, tenancy } = await loadOwnedAssessment(user, assessmentId);
  assertTenancyOpen(tenancy);
  if (tenancy.tenantUserId?.toString() !== user.id) {
    throw new ApiError(403, 'You do not have permission');
  }
  if (!requiresRepair(assessment.classification)) {
    throw new ApiError(400, 'This item does not require a repair update');
  }
  if (!['OPEN', 'REPAIR_PENDING'].includes(effectiveResolution(assessment))) {
    throw new ApiError(400, 'This repair is not waiting for a tenant update');
  }

  const notes = String(payload.notes || '').trim();
  if (notes.length < 2) {
    throw new ApiError(400, 'Describe the repair that was completed');
  }

  assessment.tenantRepairNotes = notes;
  if (payload.evidenceDataUrl) {
    assessment.tenantRepairEvidenceUrl = saveRepairEvidence(assessment._id, payload.evidenceDataUrl);
  }
  assessment.tenantRepairSubmittedAt = new Date();
  assessment.resolutionStatus = 'REPAIRED_PENDING_VERIFICATION';
  await assessment.save();
  return assessment.toJSON();
}

export async function updateRepairResolution(user, assessmentId, payload) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only the owner can verify repairs');
  }

  const { assessment, tenancy } = await loadOwnedAssessment(user, assessmentId);
  assertTenancyOpen(tenancy);
  if (tenancy.ownerId.toString() !== user.id) {
    throw new ApiError(403, 'You do not have permission');
  }
  if (!requiresRepair(assessment.classification)) {
    throw new ApiError(400, 'This item does not require repair verification');
  }

  const notes = String(payload.notes || '').trim();
  if (payload.action === 'RESOLVED') {
    assessment.resolutionStatus = 'RESOLVED';
    assessment.resolutionNotes = notes || 'Repair verified.';
    assessment.resolvedBy = user.id;
    assessment.resolvedAt = new Date();
  } else if (payload.action === 'REPAIR_PENDING') {
    if (notes.length < 2) {
      throw new ApiError(400, 'Explain what still requires work');
    }
    assessment.resolutionStatus = 'REPAIR_PENDING';
    assessment.resolutionNotes = notes;
    assessment.resolvedBy = null;
    assessment.resolvedAt = null;
  } else {
    throw new ApiError(400, 'Unsupported repair action');
  }

  await assessment.save();
  return assessment.toJSON();
}
