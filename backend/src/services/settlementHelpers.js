import { Tenancy } from '../models/Tenancy.js';
import { Inspection } from '../models/Inspection.js';
import { DamageAssessment } from '../models/DamageAssessment.js';
import { Dispute } from '../models/Dispute.js';
import { ApiError } from '../utils/ApiError.js';
import { loadComparisonForTenancy } from './comparison.service.js';

export async function getTenancyForUser(user, tenancyId) {
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

const FLAGGED_COMPARISON_RESULTS = ['NEW_DAMAGE', 'DETERIORATED', 'MISSING'];

export async function getSettlementReadiness(tenancyId) {
  const blockers = [];

  const moveOut = await Inspection.findOne({
    tenancyId,
    type: 'MOVE_OUT',
    status: { $in: ['COMPLETED', 'SUBMITTED', 'APPROVAL_PENDING'] },
  });

  const moveOutComplete = Boolean(moveOut);
  if (!moveOutComplete) {
    blockers.push('Move-out inspection must be completed before settlement.');
  }

  let comparisonAvailable = false;
  let damageAssessmentComplete = false;

  if (moveOutComplete) {
    try {
      const comparison = await loadComparisonForTenancy(tenancyId);
      comparisonAvailable = true;

      const flagged = comparison.items.filter((item) =>
        FLAGGED_COMPARISON_RESULTS.includes(item.result),
      );

      if (flagged.length === 0) {
        damageAssessmentComplete = true;
      } else {
        const assessments = await DamageAssessment.find({ tenancyId });
        const assessedMoveOutIds = new Set(
          assessments.map((a) => a.moveOutItemId?.toString()).filter(Boolean),
        );
        const unassessed = flagged.filter(
          (item) => item.moveOutItemId && !assessedMoveOutIds.has(item.moveOutItemId),
        );
        if (unassessed.length > 0) {
          blockers.push(
            'Complete damage assessment for all flagged comparison items before settlement.',
          );
        } else {
          damageAssessmentComplete = true;
        }
      }
    } catch {
      blockers.push('Comparison is not available yet.');
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
    moveOutComplete,
    comparisonAvailable,
    damageAssessmentComplete,
  };
}

export async function assertSettlementCanStart(tenancyId) {
  const readiness = await getSettlementReadiness(tenancyId);
  if (!readiness.ready) {
    throw new ApiError(400, readiness.blockers[0] || 'Settlement is not ready to begin');
  }
  return readiness;
}

export function getEffectiveDeductionAmount(deduction) {
  if (deduction.status === 'CANCELLED') return 0;
  if (deduction.status === 'ACCEPTED') return deduction.amount;
  return 0;
}

export function calculateFinancials(tenancy, deductions, openDisputeCount = 0) {
  const deposit = tenancy.deposit || 0;
  const active = deductions.filter((d) => d.status !== 'CANCELLED');

  const acceptedItems = active.filter((d) => d.status === 'ACCEPTED');
  const disputedItems = active.filter((d) => d.status === 'DISPUTED');
  const proposedItems = active.filter((d) => d.status === 'PROPOSED');

  const acceptedDeductionTotal = acceptedItems.reduce(
    (sum, d) => sum + getEffectiveDeductionAmount(d),
    0,
  );
  const disputedDeductionTotal = disputedItems.reduce((sum, d) => sum + d.amount, 0);
  const proposedDeductionTotal = proposedItems.reduce((sum, d) => sum + d.amount, 0);
  const pendingReviewTotal = proposedDeductionTotal + disputedDeductionTotal;

  const hasOpenDisputes = disputedItems.length > 0 || openDisputeCount > 0;
  const hasPendingProposed = proposedItems.length > 0;
  const allResolved =
    active.length === 0 ||
    active.every((d) => ['ACCEPTED', 'CANCELLED'].includes(d.status));

  const exceedsDeposit = acceptedDeductionTotal > deposit;
  const additionalAmountClaimed = exceedsDeposit ? acceptedDeductionTotal - deposit : 0;
  const projectedRefund = Math.max(0, deposit - acceptedDeductionTotal);
  const finalRefund =
    allResolved && !hasOpenDisputes && !hasPendingProposed
      ? Math.max(0, deposit - acceptedDeductionTotal)
      : null;

  return {
    securityDeposit: deposit,
    acceptedDeductionTotal,
    disputedDeductionTotal,
    proposedDeductionTotal,
    pendingReviewTotal,
    finalDeductionTotal: acceptedDeductionTotal,
    projectedRefund,
    finalRefund,
    exceedsDeposit,
    depositExhausted: exceedsDeposit,
    additionalAmountClaimed,
    allResolved,
    hasOpenDisputes,
    hasPendingProposed,
  };
}

export function canFinalizeSettlement(financials, openDisputeCount = 0) {
  return (
    financials.allResolved &&
    !financials.hasOpenDisputes &&
    !financials.hasPendingProposed &&
    openDisputeCount === 0
  );
}

export function deriveSettlementStatus(financials, settlement, openDisputeCount = 0) {
  if (settlement?.status === 'COMPLETED') return 'COMPLETED';
  if (settlement?.status === 'READY_FOR_SIGNATURE') return 'READY_FOR_SIGNATURE';
  if (settlement?.ownerApproved && settlement?.tenantApproved) return 'READY_FOR_SIGNATURE';
  if (financials.hasOpenDisputes || openDisputeCount > 0) return 'DISPUTED';
  if (canFinalizeSettlement(financials, openDisputeCount)) return 'READY_FOR_APPROVAL';
  if (financials.hasPendingProposed || settlement?.status === 'UNDER_REVIEW') return 'UNDER_REVIEW';
  return settlement?.status || 'DRAFT';
}

export async function calculateSettlement(tenancy, deductions, disputes = []) {
  const openDisputeCount = disputes.filter((d) => d.status === 'OPEN').length;
  return calculateFinancials(tenancy, deductions, openDisputeCount);
}
