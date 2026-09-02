import { Deduction } from '../models/Deduction.js';
import { DamageAssessment } from '../models/DamageAssessment.js';
import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateFinancials, getTenancyForUser } from './settlementHelpers.js';
import { getSettlement, submitDeductionsForReview } from './settlement.service.js';

export async function listDeductions(user, tenancyId) {
  return getSettlement(user, tenancyId);
}

export async function createDeduction(user, tenancyId, payload) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can propose deductions');
  }

  const tenancy = await getTenancyForUser(user, tenancyId);

  if (payload.amount < 0 || Number.isNaN(payload.amount)) {
    throw new ApiError(400, 'Deduction amount must be a valid non-negative number');
  }

  let damageAssessmentId = payload.damageAssessmentId || null;
  if (damageAssessmentId) {
    const assessment = await DamageAssessment.findOne({
      _id: damageAssessmentId,
      tenancyId,
    });
    if (!assessment) throw new ApiError(404, 'Damage assessment not found');
  }

  const deduction = await Deduction.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId,
    damageAssessmentId,
    inspectionItemId: payload.inspectionItemId || null,
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

  const tenancy = await Tenancy.findOne({ _id: deduction.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');

  if (payload.title !== undefined) deduction.title = payload.title;
  if (payload.reason !== undefined) deduction.reason = payload.reason;
  if (payload.description !== undefined) deduction.description = payload.description;
  if (payload.amount !== undefined) {
    if (payload.amount < 0 || Number.isNaN(payload.amount)) {
      throw new ApiError(400, 'Deduction amount must be a valid non-negative number');
    }
    deduction.amount = payload.amount;
  }

  if (!['PROPOSED', 'DISPUTED'].includes(deduction.status)) {
    throw new ApiError(400, 'This deduction can no longer be edited');
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

  const tenancy = await Tenancy.findOne({ _id: deduction.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');

  if (!['PROPOSED'].includes(deduction.status)) {
    throw new ApiError(400, 'Only proposed deductions can be removed');
  }

  await deduction.deleteOne();
  const all = await Deduction.find({ tenancyId: tenancy._id });
  return {
    financials: calculateFinancials(tenancy, all.map((d) => d.toJSON())),
  };
}

export { submitDeductionsForReview };
