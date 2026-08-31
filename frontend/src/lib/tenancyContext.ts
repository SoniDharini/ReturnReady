import type { Inspection, Tenancy } from '@/types'

export type OccupancyStatus =
  | 'UPCOMING'
  | 'CURRENTLY_STAYING'
  | 'PREPARING_TO_MOVE_OUT'
  | 'MOVED_OUT'
  | 'COMPLETED'

export const MOVE_OUT_REASONS = [
  'Tenant requested early termination',
  'Emergency',
  'Mutual agreement',
  'Owner requested possession',
  'Personal circumstances',
  'Lease extended',
  'Other',
] as const

export const DATE_CHANGE_REASONS = [
  'Lease extended',
  'Tenant requested early move-out',
  'Mutual agreement',
  'Emergency move-out',
  'Owner request',
  'Other',
] as const

export const OCCUPANCY_OPTIONS: Array<{ value: OccupancyStatus; label: string }> = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'CURRENTLY_STAYING', label: 'Currently Staying' },
  { value: 'PREPARING_TO_MOVE_OUT', label: 'Preparing to Move Out' },
  { value: 'MOVED_OUT', label: 'Moved Out' },
  { value: 'COMPLETED', label: 'Handover Completed' },
]

export function getOccupancyLabel(
  tenancy?: Partial<Pick<Tenancy, 'occupancyStatus' | 'stage' | 'status' | 'inviteStatus'>> | null,
) {
  if (!tenancy) return '—'
  switch (tenancy.occupancyStatus) {
    case 'UPCOMING':
      return 'Upcoming'
    case 'CURRENTLY_STAYING':
      return 'Currently Staying'
    case 'PREPARING_TO_MOVE_OUT':
      return 'Move-Out Started'
    case 'MOVED_OUT':
      return 'Moved Out'
    case 'COMPLETED':
      return 'Handover Completed'
    default:
      break
  }
  if (tenancy.stage === 'settlement' || tenancy.status === 'Settlement Pending') {
    return 'Settlement Pending'
  }
  if (tenancy.stage === 'move-out') return 'Move-Out in Progress'
  if (tenancy.stage === 'active') return 'Currently Staying'
  if (tenancy.stage === 'move-in') return 'Move-In Pending'
  if (tenancy.inviteStatus === 'Pending') return 'Invitation Sent'
  return tenancy.status || '—'
}

export function toInputDate(value?: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return value
}

export function formatDisplayDate(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }
  return value
}

export type ContextualAction = {
  kind: 'action' | 'info' | 'none'
  title: string
  description: string
  label?: string
  path?: string
}

export function getOwnerAction(
  tenancy: Tenancy | undefined,
  inspections: Inspection[],
  paths: {
    tenancy: (id: string) => string
    inspectionMoveIn: (id?: string) => string
    inspectionWizard: (id: string) => string
    inspectionApproval: (id?: string) => string
    comparison: (id?: string) => string
    settlement: (id?: string) => string
    tenancyNew?: string
  },
): ContextualAction {
  if (!tenancy) {
    return {
      kind: 'action',
      title: 'No active tenant',
      description: 'Invite a tenant to begin the rental handover for this property.',
      label: 'Invite Tenant',
      path: paths.tenancyNew,
    }
  }

  const moveIn = inspections.find((i) => i.type === 'MOVE_IN')
  const moveOut = inspections.find((i) => i.type === 'MOVE_OUT')

  if (tenancy.inviteStatus === 'Pending') {
    return {
      kind: 'action',
      title: 'Invitation sent',
      description: `${tenancy.tenantName} has not joined yet.`,
      label: 'Manage Invitation',
      path: paths.tenancy(tenancy.id),
    }
  }

  if (!moveIn || ['DRAFT', 'IN_PROGRESS'].includes(moveIn.status)) {
    return {
      kind: 'action',
      title: 'Move-in inspection pending',
      description: 'Complete the move-in inspection to record the property baseline.',
      label: 'Complete Move-In Inspection',
      path: moveIn ? paths.inspectionWizard(moveIn.id) : paths.inspectionMoveIn(tenancy.id),
    }
  }

  if (moveIn.status === 'APPROVAL_PENDING') {
    return {
      kind: 'action',
      title: 'Approval required',
      description: 'Both parties need to approve the move-in inspection.',
      label: 'Review Move-In Approval',
      path: paths.inspectionApproval(moveIn.id),
    }
  }

  if (tenancy.stage === 'settlement' || tenancy.status === 'Settlement Pending') {
    return {
      kind: 'action',
      title: 'Settlement pending',
      description: 'Review proposed deductions and projected refund.',
      label: 'Review Settlement',
      path: paths.settlement(tenancy.id),
    }
  }

  if (moveOut?.status === 'COMPLETED') {
    return {
      kind: 'action',
      title: 'Handover comparison ready',
      description: 'Review condition changes and finalize settlement.',
      label: 'View Comparison',
      path: paths.comparison(tenancy.id),
    }
  }

  if (
    tenancy.stage === 'move-out' ||
    tenancy.occupancyStatus === 'PREPARING_TO_MOVE_OUT' ||
    (moveOut && ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVAL_PENDING'].includes(moveOut.status))
  ) {
    return {
      kind: 'action',
      title: 'Move-out in progress',
      description: 'Continue the property handover inspection.',
      label: 'Continue Handover',
      path: moveOut ? paths.inspectionWizard(moveOut.id) : paths.tenancy(tenancy.id),
    }
  }

  if (tenancy.stage === 'active' || tenancy.occupancyStatus === 'CURRENTLY_STAYING') {
    return {
      kind: 'info',
      title: 'No action required',
      description: `${tenancy.tenantName} is currently staying at this property.`,
      label: 'View Tenancy',
      path: paths.tenancy(tenancy.id),
    }
  }

  return {
    kind: 'info',
    title: 'View tenancy',
    description: 'See rental details and available actions.',
    label: 'View Tenancy',
    path: paths.tenancy(tenancy.id),
  }
}

export function getTenantAction(
  tenancy: Pick<
    Tenancy,
    'id' | 'stage' | 'occupancyStatus' | 'status' | 'actualMoveOut' | 'moveOutReason'
  > | null,
  inspections: Inspection[],
  paths: {
    inspectionApproval: (id?: string) => string
    inspectionWizard: (id: string) => string
    comparison: (id?: string) => string
    settlement: (id?: string) => string
    rental: string
  },
): ContextualAction {
  if (!tenancy) {
    return {
      kind: 'info',
      title: 'Rental access',
      description: 'Your rental details will appear here once your invitation is accepted.',
    }
  }

  const moveIn = inspections.find((i) => i.type === 'MOVE_IN')
  const moveOut = inspections.find((i) => i.type === 'MOVE_OUT')

  if (moveIn?.status === 'APPROVAL_PENDING' && !moveIn.tenantApproved) {
    return {
      kind: 'action',
      title: 'Action required',
      description: 'Review and approve the move-in inspection record.',
      label: 'Review Move-In Inspection',
      path: paths.inspectionApproval(moveIn.id),
    }
  }

  if (moveOut?.status === 'COMPLETED') {
    return {
      kind: 'action',
      title: 'Handover review',
      description: 'View the comparison and any proposed deposit deductions.',
      label: 'View Comparison',
      path: paths.comparison(tenancy.id),
    }
  }

  if (
    tenancy.occupancyStatus === 'PREPARING_TO_MOVE_OUT' ||
    tenancy.stage === 'move-out' ||
    (moveOut && ['DRAFT', 'IN_PROGRESS'].includes(moveOut.status))
  ) {
    const dateNote = tenancy.actualMoveOut
      ? `Move-out date: ${formatDisplayDate(tenancy.actualMoveOut)}`
      : ''
    return {
      kind: 'action',
      title: 'Move-out started',
      description: `Your property handover has been started. ${dateNote}`.trim(),
      label: moveOut ? 'Complete Move-Out Inspection' : 'View Rental',
      path: moveOut ? paths.inspectionWizard(moveOut.id) : paths.rental,
    }
  }

  if (tenancy.stage === 'settlement') {
    return {
      kind: 'action',
      title: 'Settlement pending',
      description: 'Review proposed deductions from your security deposit.',
      label: 'View Proposed Deductions',
      path: paths.settlement(tenancy.id),
    }
  }

  return {
    kind: 'none',
    title: 'No action required',
    description: 'Your tenancy is currently active.',
  }
}
