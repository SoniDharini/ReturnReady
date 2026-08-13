import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone =
  | 'draft'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'locked'

const toneStyles: Record<BadgeTone, string> = {
  draft: 'bg-surface-subtle text-ink-secondary',
  info: 'bg-info-bg text-info',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-surface-subtle text-ink-muted',
  locked: 'bg-brand-50 text-brand-700',
}

const statusToneMap: Record<string, BadgeTone> = {
  Draft: 'draft',
  'Invitation Sent': 'info',
  Active: 'success',
  'Inspection Pending': 'warning',
  'Awaiting Approval': 'warning',
  Approved: 'success',
  Locked: 'locked',
  'New Damage': 'danger',
  Missing: 'danger',
  Disputed: 'danger',
  'Settlement Pending': 'warning',
  Completed: 'success',
  'In Progress': 'info',
  'Not Started': 'neutral',
  Pending: 'warning',
  Accepted: 'success',
  'Under Review': 'warning',
  'No Change': 'success',
  Changed: 'warning',
  'Ready for Sign-Off': 'info',
}

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  status?: string
  className?: string
}

export function Badge({ children, tone, status, className }: BadgeProps) {
  const resolvedTone = tone || (status ? statusToneMap[status] : undefined) || 'neutral'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        toneStyles[resolvedTone],
        className,
      )}
    >
      {children}
    </span>
  )
}
