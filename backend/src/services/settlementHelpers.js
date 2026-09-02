import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';

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

export function getEffectiveDeductionAmount(deduction) {
  if (deduction.status === 'CANCELLED') return 0;
  if (deduction.status === 'RESOLVED') {
    if (deduction.resolutionType === 'CANCEL') return 0;
    if (deduction.resolvedAmount != null) return deduction.resolvedAmount;
  }
  if (deduction.status === 'ACCEPTED') return deduction.amount;
  return 0;
}

export function calculateFinancials(tenancy, deductions) {
  const deposit = tenancy.deposit || 0;
  const active = deductions.filter((d) => d.status !== 'CANCELLED');

  const acceptedItems = active.filter((d) => ['ACCEPTED', 'RESOLVED'].includes(d.status));
  const disputedItems = active.filter((d) => d.status === 'DISPUTED');
  const proposedItems = active.filter((d) => d.status === 'PROPOSED');

  const acceptedDeductionTotal = acceptedItems.reduce(
    (sum, d) => sum + getEffectiveDeductionAmount(d),
    0,
  );
  const disputedDeductionTotal = disputedItems.reduce((sum, d) => sum + d.amount, 0);
  const proposedDeductionTotal = proposedItems.reduce((sum, d) => sum + d.amount, 0);

  const hasOpenDisputes = disputedItems.length > 0;
  const hasPendingProposed = proposedItems.length > 0;
  const allResolved =
    active.length === 0 ||
    active.every((d) => ['ACCEPTED', 'RESOLVED'].includes(d.status));

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
    finalDeductionTotal: acceptedDeductionTotal,
    projectedRefund,
    finalRefund,
    exceedsDeposit: acceptedDeductionTotal > deposit,
    allResolved,
    hasOpenDisputes,
    hasPendingProposed,
  };
}

export function deriveSettlementStatus(financials, settlement) {
  if (settlement?.status === 'COMPLETED') return 'COMPLETED';
  if (settlement?.status === 'READY_FOR_SIGNATURE') return 'READY_FOR_SIGNATURE';
  if (settlement?.ownerApproved && settlement?.tenantApproved) return 'READY_FOR_SIGNATURE';
  if (financials.hasOpenDisputes) return 'DISPUTED';
  if (financials.allResolved && !financials.hasPendingProposed) return 'READY_FOR_APPROVAL';
  if (financials.hasPendingProposed) return 'UNDER_REVIEW';
  return settlement?.status || 'DRAFT';
}
