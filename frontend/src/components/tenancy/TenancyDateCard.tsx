import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { extensionStatusLabel, reminderBanner } from '@/lib/moveOutTimeline'
import { formatDisplayDate } from '@/lib/tenancyContext'
import type { MoveOutTimeline, TenancyExtensionRequest, UserRole } from '@/types'

type TenancyDateCardProps = {
  role: UserRole
  moveIn?: string
  expectedMoveOut?: string
  actualMoveOut?: string | null
  tenantName?: string
  timeline?: MoveOutTimeline | null
  pendingExtension?: TenancyExtensionRequest | null
  latestRejectedExtension?: TenancyExtensionRequest | null
  compact?: boolean
  onRequestExtension?: () => void
  onReviewExtension?: () => void
  onViewTenancy?: () => void
  onStartMoveOut?: () => void
  onUpdateDate?: () => void
  onViewMoveOut?: () => void
  startMoveOutLabel?: string
}

export function TenancyDateCard({
  role,
  moveIn,
  expectedMoveOut,
  actualMoveOut,
  tenantName,
  timeline,
  pendingExtension,
  latestRejectedExtension,
  compact,
  onRequestExtension,
  onReviewExtension,
  onViewTenancy,
  onStartMoveOut,
  onUpdateDate,
  onViewMoveOut,
  startMoveOutLabel = 'Start Move-Out',
}: TenancyDateCardProps) {
  const banner = reminderBanner(timeline, role)
  const showExtension = role === 'TENANT' && (timeline?.canRequestExtension || pendingExtension)
  const urgent = Boolean(
    timeline && ['FIVE_DAYS', 'TODAY', 'OVERDUE'].includes(timeline.moveOutReminderState),
  )

  return (
    <Card className={urgent ? 'border-warning bg-warning-bg/20' : undefined}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Tenancy Dates
      </p>
      {tenantName && role === 'OWNER' ? (
        <p className="mt-1 text-sm font-semibold text-ink">{tenantName}</p>
      ) : null}
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {moveIn ? (
          <div>
            <dt className="text-ink-muted">Move-In</dt>
            <dd className="mt-1 font-semibold text-ink">{formatDisplayDate(moveIn)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-ink-muted">Expected Move-Out</dt>
          <dd className="mt-1 font-semibold text-ink">{formatDisplayDate(expectedMoveOut)}</dd>
        </div>
        {actualMoveOut ? (
          <div>
            <dt className="text-ink-muted">Actual Move-Out</dt>
            <dd className="mt-1 font-semibold text-ink">{formatDisplayDate(actualMoveOut)}</dd>
          </div>
        ) : null}
      </dl>

      {timeline?.label ? (
        <p className="mt-4 text-sm font-semibold text-ink">{timeline.label}</p>
      ) : null}

      {banner && !compact ? (
        <div className="mt-4 rounded-xl bg-surface-muted px-4 py-3">
          <p className="font-semibold text-ink">{banner.title}</p>
          <p className="mt-1 text-sm text-ink-secondary">{banner.description}</p>
        </div>
      ) : null}

      {pendingExtension ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3">
          <p className="font-semibold text-ink">{extensionStatusLabel(pendingExtension)}</p>
          <p className="mt-1 text-sm text-ink-secondary">
            Requested: {formatDisplayDate(pendingExtension.requestedMoveOutDate)}
          </p>
        </div>
      ) : null}

      {role === 'TENANT' && latestRejectedExtension && !pendingExtension ? (
        <div className="mt-4 rounded-xl bg-danger-bg/40 px-4 py-3">
          <p className="font-semibold text-ink">Extension Request Rejected</p>
          <p className="mt-1 text-sm text-ink-secondary">
            Requested Move-Out: {formatDisplayDate(latestRejectedExtension.requestedMoveOutDate)}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            Current Move-Out remains: {formatDisplayDate(expectedMoveOut)}
          </p>
          {latestRejectedExtension.ownerResponse ? (
            <p className="mt-1 text-sm text-ink-secondary">
              Reason: {latestRejectedExtension.ownerResponse}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {showExtension && !pendingExtension && onRequestExtension ? (
          <Button onClick={onRequestExtension}>Request Extension</Button>
        ) : null}
        {pendingExtension && role === 'TENANT' ? (
          <Button variant="secondary" disabled>
            Extension Request Pending
          </Button>
        ) : null}
        {pendingExtension && role === 'OWNER' && onReviewExtension ? (
          <Button onClick={onReviewExtension}>Review Extension Request</Button>
        ) : null}
        {onViewTenancy ? (
          <Button variant="secondary" onClick={onViewTenancy}>
            View Tenancy
          </Button>
        ) : null}
        {onViewMoveOut ? (
          <Button variant="secondary" onClick={onViewMoveOut}>
            {timeline?.isMoveOutToday || timeline?.isOverdue ? 'View Move-Out' : 'View Move-Out Details'}
          </Button>
        ) : null}
        {onStartMoveOut ? (
          <Button variant={timeline?.isOverdue || timeline?.isMoveOutToday ? 'primary' : 'secondary'} onClick={onStartMoveOut}>
            {startMoveOutLabel}
          </Button>
        ) : null}
        {onUpdateDate ? (
          <Button variant="secondary" onClick={onUpdateDate}>
            Update Move-Out Date
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
