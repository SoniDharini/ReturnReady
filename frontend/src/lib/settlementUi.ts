import type { Deduction, Dispute, SettlementFinancials, SettlementRecord } from '@/types'

export function getSettlementStatusLabel(
  settlement: SettlementRecord | null | undefined,
  opts: { openDisputeCount: number; ownerDraftCount: number; isOwner: boolean },
) {
  const status = settlement?.status
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'READY_FOR_SIGNATURE') return 'Ready to Sign'
  if (status === 'READY_FOR_APPROVAL') return 'Ready for Approval'
  if (status === 'DISPUTED' || opts.openDisputeCount > 0) return 'Dispute Requires Review'
  if (status === 'UNDER_REVIEW') {
    return opts.isOwner ? 'Waiting for Tenant' : 'Action Required'
  }
  if (opts.ownerDraftCount > 0 || status === 'DRAFT' || !status) return 'Draft'
  return 'In Progress'
}

export function getDeductionStatusLabel(
  deduction: Deduction,
  disputes: Dispute[],
  isOwner: boolean,
) {
  const openDispute = disputes.find(
    (d) => d.deductionId === deduction.id && d.status === 'OPEN',
  )
  if (deduction.status === 'CANCELLED') return 'Cancelled'
  if (deduction.status === 'ACCEPTED') return 'Accepted'
  if (deduction.status === 'DISPUTED' || openDispute) {
    return isOwner ? 'Dispute Open' : 'Under Review'
  }
  if (deduction.isRevisedDeduction && deduction.status === 'PROPOSED') return 'Revised'
  if (deduction.status === 'PROPOSED' && deduction.submittedForReviewAt) {
    return isOwner ? 'Awaiting Tenant' : 'Action Required'
  }
  if (deduction.status === 'PROPOSED') return 'Draft'
  if (deduction.status === 'RESOLVED') return 'Resolved'
  return deduction.status
}

export function classificationLabel(value?: string) {
  if (!value) return '—'
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function splitDeductions(deductions: Deduction[], disputes: Dispute[]) {
  const active = deductions.filter((d) => d.status !== 'CANCELLED')
  const drafts = active.filter((d) => d.status === 'PROPOSED' && !d.submittedForReviewAt)
  const pendingTenant = active.filter(
    (d) => d.status === 'PROPOSED' && d.submittedForReviewAt && d.requiresTenantReview,
  )
  const disputed = active.filter((d) => {
    if (d.status === 'DISPUTED') return true
    return disputes.some((dis) => dis.deductionId === d.id && dis.status === 'OPEN')
  })
  const accepted = active.filter((d) => d.status === 'ACCEPTED')

  return { drafts, pendingTenant, disputed, accepted, resolved: accepted, all: active }
}

export function canOwnerAddDeduction(opts: {
  isOwner: boolean
  settlementComplete: boolean
  readinessReady: boolean
  settlementStatus?: string
}) {
  if (!opts.isOwner || opts.settlementComplete || !opts.readinessReady) return false
  return !['READY_FOR_APPROVAL', 'READY_FOR_SIGNATURE', 'COMPLETED'].includes(
    opts.settlementStatus || '',
  )
}

export function showFinalRefund(financials?: SettlementFinancials | null) {
  return (
    financials?.finalRefund != null &&
    financials.allResolved &&
    !financials.hasOpenDisputes &&
    !financials.hasPendingProposed
  )
}

export function proposedDeductionsTotal(financials?: SettlementFinancials | null) {
  if (!financials) return 0
  return (
    financials.proposedDeductionTotal +
    financials.disputedDeductionTotal +
    (financials.pendingReviewTotal ?? 0)
  )
}
