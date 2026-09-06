import { Deduction } from '../models/Deduction.js';
import { DamageAssessment } from '../models/DamageAssessment.js';
import { Settlement } from '../models/Settlement.js';
import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';
import {
  assertSettlementCanStart,
  calculateFinancials,
  getTenancyForUser,
} from './settlementHelpers.js';
import { getSettlement, submitDeductionsForReview } from './settlement.service.js';

function validateAmount(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || !Number.isFinite(amount) || amount < 0) {
    throw new ApiError(400, 'Deduction amount must be a valid non-negative number');
  }
}

async function assertSettlementMutable(tenancyId) {
  const settlement = await Settlement.findOne({ tenancyId });
  if (settlement?.status === 'COMPLETED') {
    throw new ApiError(400, 'Settlement is completed and cannot be modified');
  }
}

export async function listDeductions(user, tenancyId) {
  return getSettlement(user, tenancyId);
}

export async function createDeduction(user, tenancyId, payload) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can propose deductions');
  }

  await assertSettlementCanStart(tenancyId);
  await assertSettlementMutable(tenancyId);

  const tenancy = await getTenancyForUser(user, tenancyId);
  validateAmount(payload.amount);

  let damageAssessmentId = payload.damageAssessmentId || null;
  if (damageAssessmentId) {
    const assessment = await DamageAssessment.findOne({
      _id: damageAssessmentId,
      tenancyId,
    });
    if (!assessment) throw new ApiError(404, 'Damage assessment not found');
    if (!assessment.deductionRequired) {
      throw new ApiError(
        400,
        'Deductions can only be linked to damage assessments that require a deduction',
      );
    }
  }

  const deduction = await Deduction.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId,
    damageAssessmentId,
    inspectionItemId: payload.inspectionItemId || null,
    tenancyConditionId: payload.tenancyConditionId || null,
    propertyChangeRequestId: payload.propertyChangeRequestId || null,
    title: payload.title,
    category: payload.category || payload.reason || payload.title,
    reason: payload.reason || payload.title,
    description: payload.description || '',
    amount: payload.amount,
    originalAmount: payload.amount,
    status: 'PROPOSED',
    createdBy: user.id,
  });

  if (tenancy.stage === 'move-out') {
    tenancy.stage = 'settlement';
    tenancy.status = 'Settlement Pending';
    await tenancy.save();
  }

  const all = await Deduction.find({ tenancyId });
  const financials = calculateFinancials(tenancy, all.map((d) => d.toJSON()));
  return {
    deduction: deduction.toJSON(),
    financials,
  };
}

export async function updateDeduction(user, deductionId, payload) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can update deductions');
  }

  const deduction = await Deduction.findById(deductionId);
  if (!deduction) throw new ApiError(404, 'Deduction not found');

  await assertSettlementMutable(deduction.tenancyId);

  const tenancy = await Tenancy.findOne({ _id: deduction.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');

  if (!['PROPOSED'].includes(deduction.status)) {
    throw new ApiError(400, 'This deduction can no longer be edited');
  }

  if (payload.title !== undefined) deduction.title = payload.title;
  if (payload.reason !== undefined) deduction.reason = payload.reason;
  if (payload.description !== undefined) deduction.description = payload.description;
  if (payload.amount !== undefined) {
    validateAmount(payload.amount);
    if (!deduction.originalAmount) deduction.originalAmount = deduction.amount;
    deduction.amount = payload.amount;
  }

  await deduction.save();
  const all = await Deduction.find({ tenancyId: tenancy._id });
  return {
    deduction: deduction.toJSON(),
    financials: calculateFinancials(tenancy, all.map((d) => d.toJSON())),
  };
}

export async function deleteDeduction(user, deductionId) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can delete deductions');
  }

  const deduction = await Deduction.findById(deductionId);
  if (!deduction) throw new ApiError(404, 'Deduction not found');

  await assertSettlementMutable(deduction.tenancyId);

  const tenancy = await Tenancy.findOne({ _id: deduction.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');

  if (deduction.submittedForReviewAt) {
    deduction.status = 'CANCELLED';
    await deduction.save();
  } else if (deduction.status === 'PROPOSED') {
    await deduction.deleteOne();
  } else {
    throw new ApiError(400, 'This deduction cannot be removed');
  }

  const all = await Deduction.find({ tenancyId: tenancy._id });
  return {
    financials: calculateFinancials(tenancy, all.map((d) => d.toJSON())),
  };
}

export { submitDeductionsForReview };
