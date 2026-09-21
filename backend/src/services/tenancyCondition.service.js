import { Tenancy } from '../models/Tenancy.js';
import { TenancyCondition } from '../models/TenancyCondition.js';
import { TenancyConditionAcceptance } from '../models/TenancyConditionAcceptance.js';
import { ApiError } from '../utils/ApiError.js';
import { createNotification } from './notification.service.js';
import { getTenancyForUser } from './settlementHelpers.js';

function canEditCondition(tenancy, condition) {
  if (tenancy.conditionsAccepted && condition.status === 'ACCEPTED') return false;
  return ['DRAFT', 'AMENDMENT_PENDING'].includes(condition.status);
}

async function recordAcceptance(tenancy, userId, conditionIds, isAmendment) {
  const nextVersion = (tenancy.conditionVersion || 0) + 1;
  tenancy.conditionVersion = nextVersion;
  tenancy.acceptedConditionIds = conditionIds;
  tenancy.conditionsAccepted = true;
  tenancy.conditionsAcceptedAt = new Date();
  tenancy.conditionsAcceptedBy = userId;
  await TenancyConditionAcceptance.create({
    tenancyId: tenancy._id,
    tenantId: userId,
    conditionVersion: nextVersion,
    acceptedConditionIds: conditionIds,
    acceptedAt: tenancy.conditionsAcceptedAt,
    acceptedBy: userId,
    isAmendmentAcknowledgement: Boolean(isAmendment),
  });
}

export async function validateConditionsAccepted(tenancyId) {
  const tenancy = await Tenancy.findById(tenancyId);
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');

  const mandatory = await TenancyCondition.find({
    tenancyId,
    $or: [{ isMandatory: true }, { requiresTenantAcceptance: true }],
    status: { $ne: 'SUPERSEDED' },
  });

  if (!mandatory.length) {
    return { required: false, accepted: true, pendingCount: 0 };
  }

  const pending = mandatory.filter((c) => ['DRAFT', 'AMENDMENT_PENDING'].includes(c.status));
  return {
    required: true,
    accepted: pending.length === 0,
    pendingCount: pending.length,
    acceptedAt: tenancy.conditionsAcceptedAt,
    conditionVersion: tenancy.conditionVersion || 0,
  };
}

export async function listConditions(user, tenancyId) {
  const tenancy = await getTenancyForUser(user, tenancyId);
  const conditions = await TenancyCondition.find({ tenancyId }).sort({ sortOrder: 1, createdAt: 1 });
  const acceptances = await TenancyConditionAcceptance.find({ tenancyId }).sort({
    conditionVersion: 1,
  });
  return {
    conditions: conditions.map((c) => c.toJSON()),
    conditionsAccepted: Boolean(tenancy.conditionsAccepted),
    conditionsAcceptedAt: tenancy.conditionsAcceptedAt,
    conditionVersion: tenancy.conditionVersion || 0,
    acceptances: acceptances.map((a) => a.toJSON()),
    locked: Boolean(tenancy.conditionsAccepted),
  };
}

export const getTenancyConditions = listConditions;

export async function listConditionsForInvite(tenancyId) {
  const conditions = await TenancyCondition.find({ tenancyId }).sort({ sortOrder: 1, createdAt: 1 });
  return conditions.map((c) => c.toJSON());
}

export async function createCondition(user, tenancyId, payload) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can add handover conditions');

  const tenancy = await Tenancy.findOne({ _id: tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  if (tenancy.status === 'Completed' || tenancy.stage === 'complete') {
    throw new ApiError(400, 'Cannot add conditions to a completed tenancy');
  }

  const count = await TenancyCondition.countDocuments({ tenancyId });
  const isAmendment = Boolean(tenancy.conditionsAccepted);

  const condition = await TenancyCondition.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId,
    ownerId: tenancy.ownerId,
    title: payload.title.trim(),
    description: payload.description || '',
    category: payload.category || 'GENERAL',
    isMandatory: payload.isMandatory !== false,
    requiresTenantAcceptance: payload.requiresTenantAcceptance !== false,
    isAmendment,
    sortOrder: payload.sortOrder ?? count,
    status: isAmendment ? 'AMENDMENT_PENDING' : 'DRAFT',
    createdBy: user.id,
    updatedBy: user.id,
  });

  if (tenancy.tenantUserId && isAmendment) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'TENANCY_CONDITIONS_READY',
      title: 'New handover condition',
      message: `${tenancy.ownerName} added a condition that requires your acknowledgement.`,
    });
  } else if (tenancy.tenantUserId && !isAmendment) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'TENANCY_CONDITIONS_READY',
      title: 'Handover conditions ready',
      message: `Review the property handover conditions for ${tenancy.propertyName}.`,
    });
  }

  return condition.toJSON();
}

export async function createConditionAmendment(user, tenancyId, payload) {
  const tenancy = await Tenancy.findOne({ _id: tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  if (!tenancy.conditionsAccepted) {
    return createCondition(user, tenancyId, payload);
  }
  return createCondition(user, tenancyId, { ...payload, isAmendment: true });
}

export async function updateCondition(user, conditionId, payload) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can edit handover conditions');

  const condition = await TenancyCondition.findById(conditionId);
  if (!condition) throw new ApiError(404, 'Condition not found');

  const tenancy = await Tenancy.findOne({ _id: condition.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'Unauthorized Owner');

  if (!canEditCondition(tenancy, condition)) {
    throw new ApiError(
      400,
      'Accepted handover conditions cannot be changed silently. Add an amendment instead.',
    );
  }

  if (payload.title !== undefined) condition.title = payload.title.trim();
  if (payload.description !== undefined) condition.description = payload.description;
  if (payload.category !== undefined) condition.category = payload.category;
  if (payload.isMandatory !== undefined) condition.isMandatory = payload.isMandatory;
  if (payload.requiresTenantAcceptance !== undefined) {
    condition.requiresTenantAcceptance = payload.requiresTenantAcceptance;
  }
  if (payload.sortOrder !== undefined) condition.sortOrder = payload.sortOrder;
  condition.updatedBy = user.id;

  await condition.save();
  return condition.toJSON();
}

export async function deleteCondition(user, conditionId) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can remove handover conditions');

  const condition = await TenancyCondition.findById(conditionId);
  if (!condition) throw new ApiError(404, 'Condition not found');

  const tenancy = await Tenancy.findOne({ _id: condition.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'Unauthorized Owner');

  if (!canEditCondition(tenancy, condition)) {
    throw new ApiError(400, 'Accepted handover conditions cannot be deleted');
  }

  await condition.deleteOne();
  return { id: conditionId };
}

export const removeCondition = deleteCondition;

export async function acceptConditions(user, tenancyId) {
  if (user.role !== 'TENANT') {
    throw new ApiError(403, 'Only the tenant can accept handover conditions');
  }

  const tenancy = await Tenancy.findOne({
    _id: tenancyId,
    tenantUserId: user.id,
    inviteStatus: 'Accepted',
  });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  if (tenancy.stage === 'complete' || tenancy.status === 'Completed') {
    throw new ApiError(403, 'Tenant access is closed for this tenancy');
  }

  const now = new Date();
  const pending = await TenancyCondition.find({
    tenancyId,
    status: { $in: ['DRAFT', 'AMENDMENT_PENDING'] },
  });
  const isAmendment = pending.some((c) => c.status === 'AMENDMENT_PENDING');

  for (const condition of pending) {
    condition.status = 'ACCEPTED';
    condition.acceptedAt = now;
    condition.acceptedBy = user.id;
    condition.updatedBy = user.id;
    await condition.save();
  }

  const allAccepted = await TenancyCondition.find({ tenancyId, status: 'ACCEPTED' });
  await recordAcceptance(
    tenancy,
    user.id,
    allAccepted.map((c) => c._id),
    isAmendment,
  );
  await tenancy.save();

  await createNotification({
    userId: tenancy.ownerId,
    tenancyId: tenancy._id,
    type: 'TENANCY_CONDITIONS_ACCEPTED',
    title: 'Handover conditions accepted',
    message: `${tenancy.tenantName} accepted the property handover conditions.`,
  });

  return listConditions(user, tenancyId);
}

export async function reviewConditionCompliance(user, conditionId, payload) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can review handover condition compliance');
  }

  const condition = await TenancyCondition.findById(conditionId);
  if (!condition) throw new ApiError(404, 'Condition not found');

  const tenancy = await Tenancy.findOne({ _id: condition.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'Unauthorized Owner');

  condition.complianceStatus = payload.complianceStatus;
  condition.complianceNotes = payload.complianceNotes || '';
  condition.complianceReviewedBy = user.id;
  condition.complianceReviewedAt = new Date();
  condition.updatedBy = user.id;
  if (payload.evidenceDataUrl?.startsWith('data:image/')) {
    const { saveChangeEvidence } = await import('./propertyChange.service.js');
    const fileUrl = saveChangeEvidence('condition', payload.evidenceDataUrl);
    if (fileUrl) {
      condition.complianceEvidence.push({
        fileUrl,
        uploadedBy: user.id,
        uploadedAt: new Date(),
      });
    }
  }
  await condition.save();
  return condition.toJSON();
}

export async function acceptConditionsForActivation(tenancy, userId) {
  const now = new Date();
  const conditions = await TenancyCondition.find({ tenancyId: tenancy._id });
  const mandatory = conditions.filter((c) => c.isMandatory || c.requiresTenantAcceptance);

  for (const condition of conditions) {
    condition.status = 'ACCEPTED';
    condition.acceptedAt = now;
    condition.acceptedBy = userId;
    await condition.save();
  }

  if (conditions.length) {
    await recordAcceptance(
      tenancy,
      userId,
      conditions.map((c) => c._id),
      false,
    );
    await createNotification({
      userId: tenancy.ownerId,
      tenancyId: tenancy._id,
      type: 'TENANCY_CONDITIONS_ACCEPTED',
      title: 'Handover conditions accepted',
      message: `${tenancy.tenantName} accepted the property handover conditions.`,
    });
  }

  return { mandatoryCount: mandatory.length };
}
