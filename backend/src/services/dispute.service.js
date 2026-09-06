import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Deduction } from '../models/Deduction.js';
import { Dispute } from '../models/Dispute.js';
import { Settlement } from '../models/Settlement.js';
import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';
import { createNotification } from './notification.service.js';
import { getSettlement } from './settlement.service.js';
import { getTenancyForUser } from './settlementHelpers.js';
import { UPLOADS_ROOT } from '../middleware/upload.middleware.js';

const DISPUTE_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'disputes');
fs.mkdirSync(DISPUTE_UPLOADS_DIR, { recursive: true });

function tenantCanReviewDeduction(deduction) {
  return deduction.status === 'PROPOSED' && Boolean(deduction.submittedForReviewAt);
}

async function assertTenantAccess(tenancy) {
  if (tenancy.stage === 'complete' || tenancy.status === 'Completed') {
    throw new ApiError(403, 'Tenant access is closed for this tenancy');
  }
}

export async function acceptDeduction(user, deductionId) {
  if (user.role !== 'TENANT') {
    throw new ApiError(403, 'Only tenants can accept deductions');
  }

  const deduction = await Deduction.findById(deductionId);
  if (!deduction) throw new ApiError(404, 'Deduction not found');

  const tenancy = await Tenancy.findOne({
    _id: deduction.tenancyId,
    tenantUserId: user.id,
    inviteStatus: 'Accepted',
  });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');

  await assertTenantAccess(tenancy);

  const settlement = await Settlement.findOne({ tenancyId: tenancy._id });
  if (settlement?.status === 'COMPLETED') {
    throw new ApiError(400, 'Settlement is already completed');
  }

  if (!tenantCanReviewDeduction(deduction)) {
    throw new ApiError(400, 'This deduction is not available for acceptance');
  }

  if (deduction.status === 'ACCEPTED') {
    throw new ApiError(400, 'This deduction has already been accepted');
  }

  deduction.status = 'ACCEPTED';
  deduction.reviewedBy = user.id;
  deduction.reviewedAt = new Date();
  await deduction.save();

  await createNotification({
    userId: tenancy.ownerId,
    tenancyId: tenancy._id,
    type: 'DEDUCTION_ACCEPTED',
    title: 'Deduction accepted',
    message: `Tenant accepted deduction: ${deduction.title}.`,
  });

  return getSettlement(user, tenancy._id.toString());
}

export async function disputeDeduction(user, deductionId, payload) {
  if (user.role !== 'TENANT') {
    throw new ApiError(403, 'Only tenants can dispute deductions');
  }

  const deduction = await Deduction.findById(deductionId);
  if (!deduction) throw new ApiError(404, 'Deduction not found');

  const tenancy = await Tenancy.findOne({
    _id: deduction.tenancyId,
    tenantUserId: user.id,
    inviteStatus: 'Accepted',
  });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');

  await assertTenantAccess(tenancy);

  if (!tenantCanReviewDeduction(deduction)) {
    throw new ApiError(400, 'Only submitted proposed deductions can be disputed');
  }

  if (payload.reason === 'OTHER' && !payload.description?.trim()) {
    throw new ApiError(400, 'Explanation is required when reason is Other');
  }

  let evidenceUrl = '';
  if (payload.evidenceDataUrl?.startsWith('data:image/')) {
    const base64 = payload.evidenceDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const filename = `dispute-${deductionId}-${Date.now()}.png`;
    fs.writeFileSync(path.join(DISPUTE_UPLOADS_DIR, filename), buffer);
    evidenceUrl = `/uploads/disputes/${filename}`;
  }

  if (!deduction.originalAmount) deduction.originalAmount = deduction.amount;

  deduction.status = 'DISPUTED';
  deduction.reviewedBy = user.id;
  deduction.reviewedAt = new Date();
  await deduction.save();

  await Dispute.findOneAndUpdate(
    { deductionId: deduction._id },
    {
      tenancyId: tenancy._id,
      deductionId: deduction._id,
      raisedBy: user.id,
      reason: payload.reason,
      description: payload.description || '',
      evidenceUrl,
      status: 'OPEN',
      originalAmount: deduction.originalAmount ?? deduction.amount,
    },
    { upsert: true, new: true },
  );

  await createNotification({
    userId: tenancy.ownerId,
    tenancyId: tenancy._id,
    type: 'DEDUCTION_DISPUTED',
    title: 'Deduction disputed',
    message: `Tenant disputed deduction: ${deduction.title}.`,
  });

  return getSettlement(user, tenancy._id.toString());
}

export async function resolveDispute(user, disputeId, payload) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can resolve disputes');
  }

  const session = await mongoose.startSession();
  try {
    let result;

    await session.withTransaction(async () => {
      const dispute = await Dispute.findById(disputeId).session(session);
      if (!dispute) throw new ApiError(404, 'Dispute not found');

      const tenancy = await Tenancy.findOne({ _id: dispute.tenancyId, ownerId: user.id }).session(
        session,
      );
      if (!tenancy) throw new ApiError(403, 'You do not have permission');

      const deduction = await Deduction.findById(dispute.deductionId).session(session);
      if (!deduction) throw new ApiError(404, 'Deduction not found');

      if (dispute.status === 'RESOLVED') {
        throw new ApiError(400, 'Dispute has already been resolved');
      }

      if (!deduction.originalAmount) deduction.originalAmount = deduction.amount;

      let resolvedAmount = deduction.amount;
      const now = new Date();

      if (payload.resolutionType === 'CANCEL') {
        resolvedAmount = 0;
        deduction.amount = 0;
        deduction.status = 'CANCELLED';
      } else if (payload.resolutionType === 'MODIFY') {
        if (
          typeof payload.resolvedAmount !== 'number' ||
          Number.isNaN(payload.resolvedAmount) ||
          !Number.isFinite(payload.resolvedAmount) ||
          payload.resolvedAmount < 0
        ) {
          throw new ApiError(400, 'Resolved amount must be a valid non-negative number');
        }
        resolvedAmount = payload.resolvedAmount;
        deduction.amount = payload.resolvedAmount;
        deduction.status = 'PROPOSED';
        deduction.reviewedBy = null;
        deduction.reviewedAt = null;
        deduction.submittedForReviewAt = now;
      } else if (payload.resolutionType === 'MAINTAIN') {
        resolvedAmount = deduction.originalAmount ?? deduction.amount;
        deduction.amount = resolvedAmount;
        deduction.status = 'PROPOSED';
        deduction.reviewedBy = null;
        deduction.reviewedAt = null;
        deduction.submittedForReviewAt = now;
      } else {
        throw new ApiError(400, 'Invalid resolution type');
      }

      deduction.resolvedAmount = resolvedAmount;
      deduction.resolutionType = payload.resolutionType;
      deduction.resolutionNotes = payload.resolutionNotes || '';
      deduction.resolvedBy = user.id;
      deduction.resolvedAt = now;
      await deduction.save({ session });

      dispute.status = 'RESOLVED';
      dispute.resolutionType = payload.resolutionType;
      dispute.resolvedAmount = resolvedAmount;
      dispute.resolutionNotes = payload.resolutionNotes || '';
      dispute.ownerResponse = payload.resolutionNotes || '';
      dispute.resolvedBy = user.id;
      dispute.resolvedAt = now;
      await dispute.save({ session });

      if (tenancy.tenantUserId) {
        await createNotification({
          userId: tenancy.tenantUserId,
          tenancyId: tenancy._id,
          type: 'DISPUTE_RESOLVED',
          title: 'Dispute resolved',
          message: `Owner resolved dispute for ${deduction.title}. Please review the revised deduction.`,
        });
      }

      result = tenancy._id.toString();
    });

    return getSettlement(user, result);
  } finally {
    session.endSession();
  }
}

export async function getDispute(user, disputeId) {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw new ApiError(404, 'Dispute not found');
  await getTenancyForUser(user, dispute.tenancyId.toString());
  return dispute.toJSON();
}
