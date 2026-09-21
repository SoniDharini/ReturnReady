import type { MoveOutTimeline, TenancyExtensionRequest, UserRole } from '@/types'

export function timelineLabel(timeline?: MoveOutTimeline | null) {
  return timeline?.label || ''
}

export function isMoveOutUrgent(timeline?: MoveOutTimeline | null) {
  if (!timeline) return false
  return ['FIVE_DAYS', 'TODAY', 'OVERDUE'].includes(timeline.moveOutReminderState)
}

export function reminderBanner(timeline?: MoveOutTimeline | null, role: UserRole = 'TENANT') {
  if (!timeline || timeline.moveOutReminderState === 'NONE') return null

  if (timeline.isOverdue) {
    return {
      title: 'Move-Out Date Passed',
      description:
        role === 'OWNER'
          ? 'The tenancy has not yet been completed. Existing Move-Out and settlement steps still apply.'
          : 'Your expected Move-Out date has passed. Complete handover when ready — your tenancy stays open until the current workflow finishes.',
    }
  }

  if (timeline.isMoveOutToday) {
    return {
      title: role === 'OWNER' ? 'Today is Tenant Move-Out Day' : 'Today is Your Move-Out Day',
      description:
        role === 'OWNER'
          ? 'Start or continue Move-Out when ready. The tenancy is not completed automatically.'
          : 'Complete the required handover and Move-Out Inspection when ready.',
    }
  }

  if (timeline.moveOutReminderState === 'FIVE_DAYS') {
    return {
      title: role === 'OWNER' ? 'Tenant Move-Out in 5 Days' : 'Move-Out in 5 Days',
      description:
        role === 'OWNER'
          ? 'Prepare for the Move-Out Inspection and property handover.'
          : 'Please prepare for the property handover and Move-Out Inspection.',
    }
  }

  if (timeline.moveOutReminderState === 'THIRTY_DAYS') {
    return {
      title: 'Move-Out approaching',
      description:
        role === 'TENANT'
          ? 'Your tenancy is expected to end in approximately one month. You can send an extension request to the Owner.'
          : 'This tenancy is approaching its expected Move-Out date.',
    }
  }

  return null
}

export function extensionStatusLabel(request?: TenancyExtensionRequest | null) {
  if (!request) return ''
  switch (request.status) {
    case 'PENDING':
      return 'Extension Request Pending'
    case 'APPROVED':
      return 'Extension Approved'
    case 'REJECTED':
      return 'Extension Request Rejected'
    case 'CANCELLED':
      return 'Extension Request Cancelled'
    default:
      return request.status
  }
}
