import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  changeStatusLabel,
  isChangeAuthorized,
  ownerConditionList,
  requestHeadline,
  tenantCommitmentList,
} from '@/lib/handoverUi'
import { formatDisplayDate } from '@/lib/tenancyContext'
import { resolveMediaUrl } from '@/services/property.service'
import type { PropertyChangeRequest } from '@/types'

type ChangeRequestCardProps = {
  request: PropertyChangeRequest
  onOpen?: () => void
  ctaLabel?: string
}

export function ChangeRequestCard({ request, onOpen, ctaLabel }: ChangeRequestCardProps) {
  const tone = isChangeAuthorized(request)
    ? 'success'
    : request.status === 'REJECTED' || request.status === 'CONDITIONS_DECLINED'
      ? 'danger'
      : 'warning'

  const commitments = tenantCommitmentList(request)
  const conditions = ownerConditionList(request)

  return (
    <li className="rounded-xl border border-border px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{requestHeadline(request)}</p>
            <Badge tone={tone}>{changeStatusLabel(request.status)}</Badge>
          </div>
          {request.description ? (
            <p className="mt-2 text-sm text-ink-secondary line-clamp-2">{request.description}</p>
          ) : null}
          {commitments.length ? (
            <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
              {commitments.slice(0, 2).map((item, index) => (
                <li key={item.id || index}>• {item.text}</li>
              ))}
            </ul>
          ) : null}
          {conditions.length ? (
            <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
              {conditions.slice(0, 2).map((item, index) => (
                <li key={item.id || index}>Owner: {item.text}</li>
              ))}
            </ul>
          ) : null}
          {request.status === 'PENDING' ? (
            <p className="mt-2 text-sm font-medium text-warning">
              Do not make this property change until the Owner gives final approval.
            </p>
          ) : null}
          {(request.status === 'REJECTED' || request.status === 'CONDITIONS_DECLINED') &&
          (request.rejectionReason || request.ownerNotes) ? (
            <p className="mt-2 text-sm text-ink-secondary">
              Reason: {request.rejectionReason || request.ownerNotes}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-ink-muted">
            Requested {formatDisplayDate(request.requestedAt || request.createdAt)}
          </p>
        </div>
        {request.evidence?.[0]?.fileUrl ? (
          <img
            src={resolveMediaUrl(request.evidence[0].fileUrl)}
            alt=""
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : null}
      </div>
      {onOpen ? (
        <Button className="mt-3" size="sm" variant="secondary" onClick={onOpen}>
          {ctaLabel ||
            (request.status === 'PENDING'
              ? 'Review Request'
              : isChangeAuthorized(request)
                ? 'View Agreement'
                : 'View Details')}
        </Button>
      ) : null}
    </li>
  )
}
