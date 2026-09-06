import type { Inspection } from '@/types'

export function isInspectionFullyApproved(inspection?: Pick<
  Inspection,
  'status' | 'ownerApproved' | 'tenantApproved'
> | null) {
  if (!inspection) return false
  return (
    inspection.status === 'LOCKED' ||
    inspection.status === 'COMPLETED' ||
    Boolean(inspection.ownerApproved && inspection.tenantApproved)
  )
}

export function getInspectionDisplayStatus(inspection?: Inspection | null) {
  if (!inspection) {
    return { label: 'Not Started', badgeStatus: 'Not Started' }
  }

  if (isInspectionFullyApproved(inspection)) {
    return { label: 'Approved ✓', badgeStatus: 'Approved' }
  }

  if (inspection.status === 'APPROVAL_PENDING' || inspection.status === 'SUBMITTED') {
    if (inspection.ownerApproved && !inspection.tenantApproved) {
      return { label: 'Waiting for Tenant Approval', badgeStatus: 'Awaiting Approval' }
    }
    if (inspection.tenantApproved && !inspection.ownerApproved) {
      return { label: 'Waiting for Owner Approval', badgeStatus: 'Awaiting Approval' }
    }
    return { label: 'Awaiting Approval', badgeStatus: 'Awaiting Approval' }
  }

  if (['DRAFT', 'IN_PROGRESS'].includes(inspection.status)) {
    return { label: 'In Progress', badgeStatus: 'In Progress' }
  }

  return {
    label: inspection.status.replaceAll('_', ' '),
    badgeStatus: 'In Progress',
  }
}
