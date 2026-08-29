import { DamageAssessment } from '../models/DamageAssessment.js';
import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';
import { getTenancyComparison } from './comparison.service.js';

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
    await existing.save();
    assessment = existing;
  } else {
    assessment = await DamageAssessment.create(data);
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
