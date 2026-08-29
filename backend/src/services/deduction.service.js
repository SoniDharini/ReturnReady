import { Deduction } from '../models/Deduction.js';
import { DamageAssessment } from '../models/DamageAssessment.js';
import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';

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

function buildSummary(tenancy, deductions) {
  const proposed = deductions.filter((d) => d.status === 'PROPOSED');
  const totalProposed = proposed.reduce((sum, d) => sum + d.amount, 0);
  const deposit = tenancy.deposit || 0;
  const projectedRefund = Math.max(0, deposit - totalProposed);

  return {
    securityDeposit: deposit,
    totalProposedDeductions: totalProposed,
    projectedRefund,
    exceedsDeposit: totalProposed > deposit,
  };
}

export async function listDeductions(user, tenancyId) {
  const tenancy = await getTenancyForUser(user, tenancyId);
  const deductions = await Deduction.find({ tenancyId }).sort({ createdAt: -1 });
  const items = deductions.map((d) => d.toJSON());

  return {
    deductions: items,
    summary: buildSummary(tenancy, items),
  };
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
    reason: payload.reason || payload.title,
    description: payload.description || '',
    amount: payload.amount,
    status: 'PROPOSED',
    createdBy: user.id,
  });

  if (tenancy.stage === 'move-out') {
    tenancy.stage = 'settlement';
    tenancy.status = 'Settlement Pending';
    await tenancy.save();
  }

  const all = await Deduction.find({ tenancyId });
  return {
    deduction: deduction.toJSON(),
    summary: buildSummary(tenancy, all.map((d) => d.toJSON())),
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

  await deduction.save();
  const all = await Deduction.find({ tenancyId: tenancy._id });
  return {
    deduction: deduction.toJSON(),
    summary: buildSummary(tenancy, all.map((d) => d.toJSON())),
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

  await deduction.deleteOne();
  const all = await Deduction.find({ tenancyId: tenancy._id });
  return {
    summary: buildSummary(tenancy, all.map((d) => d.toJSON())),
  };
}
