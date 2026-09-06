import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { changeStatusLabel, changeTypeLabel, requestHeadline } from '@/lib/handoverUi'
import { formatDisplayDate } from '@/lib/tenancyContext'
import { resolveMediaUrl } from '@/services/property.service'
import type { PropertyChangeRequest } from '@/types'

type ChangeRequestCardProps = {
  request: PropertyChangeRequest
  onOpen?: () => void
  ctaLabel?: string
}

export function ChangeRequestCard({ request, onOpen, ctaLabel }: ChangeRequestCardProps) {
  const tone =
    request.status === 'APPROVED' || request.status === 'COMPLETED'
      ? 'success'
      : request.status === 'REJECTED'
        ? 'danger'
        : 'warning'

  return (
    <li className="rounded-xl border border-border px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{requestHeadline(request)}</p>
            <Badge tone={tone}>{changeStatusLabel(request.status)}</Badge>
          </div>
          <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">
            {changeTypeLabel(request.changeType)}
          </p>
          {request.description ? (
            <p className="mt-2 text-sm text-ink-secondary">{request.description}</p>
          ) : null}
          {request.reason ? (
            <p className="mt-1 text-sm text-ink-secondary">Reason: {request.reason}</p>
          ) : null}
          {request.status === 'PENDING' ? (
            <p className="mt-2 text-sm font-medium text-warning">
              Do not make this property change until the Owner approves it.
            </p>
          ) : null}
          {request.status === 'APPROVED' && request.ownerConditions ? (
            <p className="mt-2 text-sm text-ink-secondary">
              Owner condition: {request.ownerConditions}
            </p>
          ) : null}
          {request.status === 'REJECTED' && request.ownerNotes ? (
            <p className="mt-2 text-sm text-ink-secondary">Reason: {request.ownerNotes}</p>
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
          {ctaLabel || (request.status === 'PENDING' ? 'Review Request' : 'View Details')}
        </Button>
      ) : null}
    </li>
  )
}
