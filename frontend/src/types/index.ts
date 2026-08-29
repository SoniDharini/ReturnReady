export type RoomType =
  | 'BEDROOM'
  | 'BATHROOM'
  | 'LIVING_ROOM'
  | 'KITCHEN'
  | 'BALCONY'
  | 'DINING_ROOM'
  | 'CUSTOM'

export type PropertyRoom = {
  id?: string
  key?: string
  name: string
  type: RoomType
  isCustom: boolean
  items: Array<{
    id?: string
    name: string
    quantity: number
    description?: string
  }>
}

export type PropertyImage = {
  id?: string
  imageUrl: string
  caption?: string
  uploadedBy?: string
  uploadedAt?: string
}

export type UserRole = 'OWNER' | 'TENANT'

export type AuthUser = {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  accountStatus: string
  /** Derived: owner with zero properties */
  isNewOwner?: boolean
  tenantAccess?: {
    status: 'INVITED' | 'ACTIVE' | 'CLOSED' | 'REVOKED'
    tenancyId: string
    inviteId: string
    propertyName: string
    ownerName: string
    moveIn: string
    moveOut: string
    deposit: number
  }
}

export type Property = {
  id: string
  name: string
  type: string
  address: string
  city: string
  state: string
  pin: string
  rooms: number
  bathrooms: number
  status: string
  activeTenancy: string | null
  roomList?: PropertyRoom[]
  images?: PropertyImage[]
}

export type Tenancy = {
  id: string
  propertyId: string
  propertyName: string
  tenantName: string
  tenantEmail: string
  tenantPhone: string
  ownerName: string
  moveIn: string
  moveOut: string
  rent: number
  deposit: number
  status: string
  inviteStatus: 'Pending' | 'Accepted' | 'Expired' | 'Cancelled'
  inviteSentAt: string
  inviteToken: string
  stage: 'invitation' | 'move-in' | 'active' | 'move-out' | 'settlement' | 'complete'
}

export type Invitation = {
  token: string
  status: 'Pending' | 'Accepted' | 'Expired' | 'Cancelled'
  ownerName: string
  ownerEmail: string
  tenantName: string
  tenantEmail: string
  tenantPhone: string
  propertyName: string
  moveIn: string
  moveOut: string
  deposit: number
  tenancyId: string
}

export type InspectionCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'MISSING'

export type InspectionStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'APPROVAL_PENDING'
  | 'LOCKED'
  | 'COMPLETED'

export type Inspection = {
  id: string
  tenancyId: string
  propertyId: string
  ownerId: string
  tenantId?: string | null
  propertyName: string
  type: 'MOVE_IN' | 'MOVE_OUT'
  status: InspectionStatus
  startedBy: string
  startedAt: string
  submittedBy?: string | null
  submittedAt?: string | null
  ownerApproved: boolean
  tenantApproved: boolean
  ownerApprovedAt?: string | null
  tenantApprovedAt?: string | null
  lockedAt?: string | null
  completedAt?: string | null
  currentStepIndex: number
  createdAt?: string
  updatedAt?: string
}

export type InspectionItem = {
  id: string
  inspectionId: string
  propertyId: string
  roomId: string
  roomName?: string
  inventoryItemId?: string | null
  itemType: 'ROOM' | 'INVENTORY'
  itemName: string
  condition?: InspectionCondition | null
  notes?: string
  issueDescription?: string
  isCompleted: boolean
  inspectedBy?: string | null
  inspectedAt?: string | null
}

export type InspectionEvidence = {
  id: string
  inspectionId: string
  inspectionItemId: string
  roomId: string
  uploadedBy: string
  imageUrl: string
  caption?: string
  uploadedAt?: string
}

export type MeterReading = {
  id: string
  inspectionId: string
  type: 'ELECTRICITY' | 'WATER' | 'GAS' | 'OTHER'
  customTypeName?: string
  reading: string
  unit?: string
  meterNumber?: string
  imageUrl?: string
  notes?: string
  recordedAt?: string
}

export type AccessItem = {
  id: string
  inspectionId: string
  name: string
  quantity: number
  notes?: string
  imageUrl?: string
}

export type InspectionRoomGroup = {
  roomId: string
  roomName: string
  items: InspectionItem[]
}

export type InspectionDetail = {
  inspection: Inspection
  items: InspectionItem[]
  rooms: InspectionRoomGroup[]
  evidence: InspectionEvidence[]
  meters: MeterReading[]
  accessItems: AccessItem[]
  baseline?: {
    items: InspectionItem[]
    itemsByKey: Record<string, InspectionItem>
    evidenceByItem: Record<string, InspectionEvidence[]>
  } | null
  progress: {
    totalItems: number
    completedItems: number
    percent: number
    totalRooms: number
    evidenceCount: number
    meterCount: number
    accessItemCount: number
  }
}

export type InspectionReview = InspectionDetail & {
  issues: InspectionItem[]
  incomplete: InspectionItem[]
  roomCompletion: Array<{
    roomId: string
    roomName: string
    total: number
    completed: number
    isComplete: boolean
  }>
  canSubmit: boolean
}

export type ComparisonResult =
  | 'NO_CHANGE'
  | 'IMPROVED'
  | 'DETERIORATED'
  | 'NEW_DAMAGE'
  | 'MISSING'
  | 'NEEDS_REVIEW'

export type ComparisonItem = {
  key: string
  roomId: string
  roomName: string
  itemName: string
  inventoryItemId?: string | null
  moveInItemId?: string | null
  moveOutItemId?: string | null
  moveInCondition?: InspectionCondition | null
  moveOutCondition?: InspectionCondition | null
  moveInNotes?: string
  moveOutNotes?: string
  moveInIssue?: string
  moveOutIssue?: string
  moveInEvidence: InspectionEvidence[]
  moveOutEvidence: InspectionEvidence[]
  result: ComparisonResult
}

export type ComparisonData = {
  tenancy: {
    id: string
    propertyName: string
    tenantName: string
    deposit: number
    moveOut: string
  }
  moveInInspectionId: string
  moveOutInspectionId: string
  summary: {
    totalItems: number
    unchanged: number
    improved: number
    changed: number
    damaged: number
    missing: number
    needsReview: number
  }
  items: ComparisonItem[]
  rooms: Array<{ roomId: string; roomName: string; items: ComparisonItem[] }>
  accessComparisons: Array<{
    name: string
    moveInQuantity: number
    moveOutQuantity: number
    difference: number
    result: string
  }>
  meterComparisons: Array<{
    label: string
    moveInReading: string | null
    moveOutReading: string | null
    unit: string
    usage: number | null
    moveInImageUrl?: string
    moveOutImageUrl?: string
  }>
}

export type DamageClassification =
  | 'NORMAL_WEAR_AND_TEAR'
  | 'EXISTING_DAMAGE'
  | 'TENANT_DAMAGE'
  | 'MISSING_ITEM'
  | 'REQUIRES_REVIEW'
  | 'NO_ACTION'

export type DamageAssessment = {
  id: string
  tenancyId: string
  moveInInspectionId: string
  moveOutInspectionId: string
  roomId: string
  inventoryItemId?: string | null
  moveInItemId?: string | null
  moveOutItemId?: string | null
  itemName: string
  comparisonResult: string
  classification: DamageClassification
  description: string
  deductionRequired: boolean
  assessedBy: string
  assessedAt: string
}

export type DeductionStatus = 'PROPOSED' | 'ACCEPTED' | 'DISPUTED' | 'RESOLVED' | 'CANCELLED'

export type Deduction = {
  id: string
  tenancyId: string
  propertyId: string
  damageAssessmentId?: string | null
  inspectionItemId?: string | null
  title: string
  reason: string
  description: string
  amount: number
  status: DeductionStatus
  createdBy: string
  createdAt?: string
}

export type DeductionSummary = {
  securityDeposit: number
  totalProposedDeductions: number
  projectedRefund: number
  exceedsDeposit: boolean
}
