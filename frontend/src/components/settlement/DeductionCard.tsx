import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getDeductionStatusLabel, classificationLabel } from '@/lib/settlementUi'
import { formatCurrency } from '@/lib/utils'
import { resolveMediaUrl } from '@/services/property.service'
import type { Deduction, Dispute } from '@/types'

type DeductionCardProps = {
  deduction: Deduction
  disputes: Dispute[]
  isOwner: boolean
  relatedConditionTitle?: string
  relatedChangeTitle?: string
  onEdit?: () => void
  onRemove?: () => void
  onAccept?: () => void
  onDispute?: () => void
  onReviewDispute?: () => void
}

export function DeductionCard({
  deduction,
  disputes,
  isOwner,
  relatedConditionTitle,
  relatedChangeTitle,
  onEdit,
  onRemove,
  onAccept,
  onDispute,
  onReviewDispute,
}: DeductionCardProps) {
  const dispute = disputes.find((d) => d.deductionId === deduction.id && d.status === 'OPEN')
  const statusLabel = getDeductionStatusLabel(deduction, disputes, isOwner)
  const isDraft = deduction.status === 'PROPOSED' && !deduction.submittedForReviewAt
  const tenantCanAct =
    !isOwner && deduction.requiresTenantReview && deduction.status === 'PROPOSED'
  const showAccepted = deduction.status === 'ACCEPTED'

  return (
    <li className="rounded-xl border border-border px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{deduction.title}</p>
            <Badge status={showAccepted ? 'Active' : 'Proposed'}>{statusLabel}</Badge>
          </div>
          {deduction.context?.classification || deduction.category ? (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
              {classificationLabel(deduction.context?.classification || deduction.category)}
            </p>
          ) : null}
          {deduction.description ? (
            <p className="mt-2 text-sm text-ink-secondary">
              {isOwner ? deduction.description : `Owner's reason: ${deduction.description}`}
            </p>
          ) : null}
          {relatedConditionTitle ? (
            <p className="mt-2 text-sm text-ink-secondary">
              Related handover condition: {relatedConditionTitle}
            </p>
          ) : null}
          {relatedChangeTitle ? (
            <p className="mt-1 text-sm text-ink-secondary">
              Related approved change: {relatedChangeTitle}
            </p>
          ) : null}
          {deduction.isRevisedDeduction &&
          deduction.originalAmount != null &&
          deduction.originalAmount !== deduction.amount ? (
            <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm">
              <p className="text-ink-muted">
                Original: {formatCurrency(deduction.originalAmount)}
              </p>
              <p className="font-semibold text-ink">
                Revised: {formatCurrency(deduction.amount)}
              </p>
              {deduction.resolutionNotes ? (
                <p className="mt-1 text-ink-secondary">{deduction.resolutionNotes}</p>
              ) : null}
            </div>
          ) : null}
          {!isOwner && dispute ? (
            <div className="mt-2 text-sm text-ink-secondary">
              <p>
                Your reason:{' '}
                {dispute.reason.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </p>
              {dispute.description ? <p className="mt-1">{dispute.description}</p> : null}
            </div>
          ) : null}
        </div>
        <p className="text-xl font-bold text-ink">{formatCurrency(deduction.amount)}</p>
      </div>

      {deduction.context ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <EvidenceBlock
            title="Move-In"
            condition={deduction.context.moveInCondition}
            evidence={deduction.context.moveInEvidence}
          />
          <EvidenceBlock
            title="Move-Out"
            condition={deduction.context.moveOutCondition}
            evidence={deduction.context.moveOutEvidence}
          />
        </div>
      ) : null}

      {dispute?.evidenceUrl ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-ink-muted">Tenant Evidence</p>
          <img
            src={resolveMediaUrl(dispute.evidenceUrl)}
            alt="Tenant dispute evidence"
            className="mt-1 h-20 w-20 rounded-lg object-cover"
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {isOwner && isDraft && onEdit ? (
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        {isOwner && isDraft && onRemove ? (
          <Button variant="tertiary" size="sm" onClick={onRemove}>
            Remove
          </Button>
        ) : null}
        {tenantCanAct && onAccept ? (
          <Button size="sm" className="w-full sm:w-auto" onClick={onAccept}>
            {deduction.isRevisedDeduction ? 'Accept Revised Deduction' : 'Accept Deduction'}
          </Button>
        ) : null}
        {tenantCanAct && !deduction.isRevisedDeduction && onDispute ? (
          <Button size="sm" variant="secondary" className="w-full sm:w-auto" onClick={onDispute}>
            Dispute
          </Button>
        ) : null}
        {showAccepted ? (
          <span className="inline-flex items-center text-sm font-semibold text-success">✓ Accepted</span>
        ) : null}
        {isOwner && dispute && onReviewDispute ? (
          <Button size="sm" onClick={onReviewDispute}>
            Review Dispute
          </Button>
        ) : null}
      </div>
    </li>
  )
}

function EvidenceBlock({
  title,
  condition,
  evidence,
}: {
  title: string
  condition?: string | null
  evidence?: Array<{ id?: string; fileUrl?: string; caption?: string }>
}) {
  return (
    <div className="rounded-xl bg-surface-muted p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{title}</p>
      {evidence?.[0]?.fileUrl ? (
        <img
          src={resolveMediaUrl(evidence[0].fileUrl)}
          alt={`${title} evidence`}
          className="mt-2 aspect-[4/3] w-full rounded-lg object-cover"
        />
      ) : (
        <div className="mt-2 flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-border text-xs text-ink-muted">
          No photo
        </div>
      )}
      {condition ? (
        <p className="mt-2 text-sm">
          Condition: <span className="font-semibold text-ink">{condition}</span>
        </p>
      ) : null}
    </div>
  )
}
