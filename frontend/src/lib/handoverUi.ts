import type {
  ChangeRequestStatus,
  ChangeRequestType,
  ComplianceStatus,
  ConditionCategory,
  PropertyChangeCommitment,
  PropertyChangeRequest,
} from '@/types'

export const CONDITION_CATEGORIES: Array<{ value: ConditionCategory; label: string }> = [
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'PAINTING', label: 'Painting' },
  { value: 'STRUCTURAL_CHANGE', label: 'Structural change' },
  { value: 'FIXTURE_CHANGE', label: 'Fixture change' },
  { value: 'APPLIANCE', label: 'Appliance' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'KEYS_ACCESS', label: 'Keys & access' },
  { value: 'GENERAL', label: 'General' },
  { value: 'CUSTOM', label: 'Custom' },
]

export const CONDITION_TEMPLATES = [
  {
    title: 'Deep clean before handover',
    category: 'CLEANING' as ConditionCategory,
    description: 'Property must be deep cleaned before final handover.',
  },
  {
    title: 'Restore wall colour',
    category: 'PAINTING' as ConditionCategory,
    description: 'Any wall colour changes must be restored to the original colour.',
  },
  {
    title: 'Repair drilling or wall patches',
    category: 'STRUCTURAL_CHANGE' as ConditionCategory,
    description: 'Any holes, patches, drilling marks or mounting damage must be repaired.',
  },
  {
    title: 'Return furniture in recorded condition',
    category: 'INVENTORY' as ConditionCategory,
    description: 'Furniture must be returned in the same condition as recorded during Move-In.',
  },
  {
    title: 'No fixture changes without approval',
    category: 'FIXTURE_CHANGE' as ConditionCategory,
    description:
      'Any additional fixtures installed by the Tenant must be removed before Move-Out unless the Owner approves otherwise.',
  },
  {
    title: 'No appliance install or removal without approval',
    category: 'APPLIANCE' as ConditionCategory,
    description:
      'Air conditioners, appliances or fittings cannot be installed or removed without Owner approval.',
  },
  {
    title: 'Return all keys and remotes',
    category: 'KEYS_ACCESS' as ConditionCategory,
    description: 'All keys, access cards and remotes must be returned.',
  },
]

export const CHANGE_TYPES: Array<{ value: ChangeRequestType; label: string }> = [
  { value: 'APPLIANCE_INSTALLATION', label: 'Install appliance' },
  { value: 'APPLIANCE_REMOVAL', label: 'Remove appliance' },
  { value: 'INSTALL_FIXTURE', label: 'Install fixture' },
  { value: 'REMOVE_FIXTURE', label: 'Remove fixture' },
  { value: 'ADD_ITEM', label: 'Add item / furniture' },
  { value: 'REMOVE_ITEM', label: 'Remove item / furniture' },
  { value: 'REPLACE_ITEM', label: 'Replace item' },
  { value: 'PAINT_CHANGE', label: 'Paint / wall colour' },
  { value: 'DRILLING', label: 'Drilling / mounting' },
  { value: 'STRUCTURAL_CHANGE', label: 'Structural change' },
  { value: 'OTHER', label: 'Other' },
]

export const COMPLIANCE_OPTIONS: Array<{ value: ComplianceStatus; label: string }> = [
  { value: 'NEEDS_REVIEW', label: 'Needs review' },
  { value: 'COMPLIED', label: 'Complied' },
  { value: 'NOT_COMPLIED', label: 'Not complied' },
  { value: 'NOT_APPLICABLE', label: 'Not applicable' },
]

export function changeStatusLabel(status: ChangeRequestStatus) {
  switch (status) {
    case 'PENDING':
      return 'Awaiting Owner Review'
    case 'AWAITING_TENANT_ACCEPTANCE':
    case 'APPROVED_PENDING_TENANT_ACCEPTANCE':
      return 'Waiting for Tenant Acceptance'
    case 'AWAITING_OWNER_FINAL_APPROVAL':
      return 'Waiting for Owner Final Approval'
    case 'AUTHORIZED':
    case 'APPROVED':
      return 'Approved ✓'
    case 'REJECTED':
      return 'Rejected'
    case 'CONDITIONS_DECLINED':
      return 'Conditions Declined'
    case 'COMPLETED':
      return 'Completed'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

export function changeTypeLabel(type?: ChangeRequestType | string) {
  return CHANGE_TYPES.find((item) => item.value === type)?.label || type || 'Change'
}

export function categoryLabel(category?: ConditionCategory | string) {
  return CONDITION_CATEGORIES.find((item) => item.value === category)?.label || category || 'General'
}

export function isChangeAuthorized(request?: Pick<PropertyChangeRequest, 'status'> | null) {
  return (
    request?.status === 'AUTHORIZED' ||
    request?.status === 'APPROVED' ||
    request?.status === 'COMPLETED'
  )
}

export function isAwaitingTenantAcceptance(status?: ChangeRequestStatus) {
  return (
    status === 'AWAITING_TENANT_ACCEPTANCE' || status === 'APPROVED_PENDING_TENANT_ACCEPTANCE'
  )
}

export function ownerConditionList(request?: PropertyChangeRequest | null): PropertyChangeCommitment[] {
  if (!request) return []
  if (request.ownerConditionItems?.length) return request.ownerConditionItems
  if (request.ownerConditions?.trim()) {
    return request.ownerConditions
      .split(/\n+/)
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ text }))
  }
  return []
}

export function tenantCommitmentList(request?: PropertyChangeRequest | null): PropertyChangeCommitment[] {
  return request?.tenantCommitments || []
}

export function requestHeadline(request: PropertyChangeRequest) {
  return request.roomName ? `${request.title} — ${request.roomName}` : request.title
}

export function changesForRoom(
  requests: PropertyChangeRequest[],
  roomId?: string,
  roomName?: string,
) {
  return requests.filter(
    (request) =>
      (roomId && request.roomId && request.roomId === roomId) ||
      (roomName && request.roomName && request.roomName === roomName),
  )
}

export function actionRequiredForRole(
  request: PropertyChangeRequest,
  role: 'OWNER' | 'TENANT',
) {
  if (role === 'OWNER') {
    return request.status === 'PENDING' || request.status === 'AWAITING_OWNER_FINAL_APPROVAL'
  }
  return isAwaitingTenantAcceptance(request.status)
}

export function timelineLabel(action: string) {
  switch (action) {
    case 'REQUESTED':
      return 'Tenant submitted request'
    case 'CONDITIONS_PROPOSED':
    case 'CONDITIONALLY_APPROVED':
      return 'Owner approved with conditions'
    case 'APPROVED_WITHOUT_CONDITIONS':
      return 'Owner approved without conditions'
    case 'CONDITIONS_ACCEPTED':
      return 'Tenant accepted all conditions'
    case 'CONDITIONS_DECLINED':
      return 'Tenant declined owner conditions'
    case 'FINAL_APPROVED':
    case 'APPROVED':
      return 'Property change officially approved'
    case 'REJECTED':
      return 'Owner rejected request'
    case 'COMPLETED':
      return 'Tenant marked change completed'
    case 'CANCELLED':
      return 'Tenant cancelled request'
    default:
      return action.replaceAll('_', ' ')
  }
}
