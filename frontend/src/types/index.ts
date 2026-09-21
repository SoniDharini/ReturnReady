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

export type OccupancyStatus =
  | 'UPCOMING'
  | 'CURRENTLY_STAYING'
  | 'PREPARING_TO_MOVE_OUT'
  | 'MOVED_OUT'
  | 'COMPLETED'

export type TenancyStage =
  | 'invitation'
  | 'move-in'
  | 'active'
  | 'move-out'
  | 'settlement'
  | 'complete'

export type MoveOutReminderState =
  | 'NONE'
  | 'MORE_THAN_30'
  | 'THIRTY_DAYS'
  | 'FIVE_DAYS'
  | 'TODAY'
  | 'OVERDUE'

export type MoveOutTimeline = {
  expectedMoveOut: string
  actualMoveOut?: string | null
  daysUntilMoveOut: number | null
  daysOverdue: number
  moveOutReminderState: MoveOutReminderState
  isMoveOutToday: boolean
  isOverdue: boolean
  label: string
  canRequestExtension: boolean
}

export type TenancyDateHistoryEntry = {
  field: string
  oldValue: string
  newValue: string
  reason: string
  changedBy?: string | null
  requestedBy?: string | null
  approvedBy?: string | null
  changedAt?: string | null
}

export type MoveOutHistory = {
  originalExpectedMoveOut: string
  approvedExtensions: TenancyDateHistoryEntry[]
  finalExpectedMoveOut: string
  actualMoveOut?: string | null
}

export type ExtensionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type TenancyExtensionRequest = {
  id: string
  tenancyId: string
  propertyId: string
  tenantId?: string | null
  ownerId: string
  currentMoveOutDate: string
  requestedMoveOutDate: string
  reason: string
  status: ExtensionRequestStatus
  ownerResponse?: string
  ownerNotes?: string
  requestedAt?: string
  reviewedAt?: string | null
  cancelledAt?: string | null
}

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
    actualMoveOut?: string | null
    moveOutReason?: string
    moveOutNotes?: string
    occupancyStatus?: OccupancyStatus
    stage?: TenancyStage
    deposit: number
    moveOutTimeline?: MoveOutTimeline | null
    pendingExtension?: TenancyExtensionRequest | null
    latestRejectedExtension?: TenancyExtensionRequest | null
    moveOutHistory?: MoveOutHistory | null
  }
}

export type PropertyAvailability =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'MOVE_OUT_IN_PROGRESS'
  | 'SETTLEMENT_PENDING'

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
  availability?: PropertyAvailability
  activeTenantName?: string | null
  activeTenancyId?: string | null
  canAssignTenant?: boolean
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
  inviteExpiresAt?: string
  inviteToken: string
  invitationUrl?: string | null
  invitationExpired?: boolean
  createdAt?: string
  updatedAt?: string
  stage: TenancyStage
  actualMoveOut?: string | null
  moveOutReason?: string
  moveOutNotes?: string
  occupancyStatus?: OccupancyStatus
  dateHistory?: TenancyDateHistoryEntry[]
  moveOutTimeline?: MoveOutTimeline | null
  pendingExtension?: TenancyExtensionRequest | null
  latestRejectedExtension?: TenancyExtensionRequest | null
  moveOutHistory?: MoveOutHistory | null
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
  conditions?: TenancyCondition[]
  requiresConditionAcceptance?: boolean
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
  readiness?: {
    roomsInspected: number
    roomsTotal: number
    inventoryItems: string
    conditionsReviewed: string
    approvedChangesReviewed: string
    meterReadings: number
    keysReviewed: number
    conditionChanges: number
    potentialDamage: number
    missingItems: number
    needsReview: number
    hasNoSpecialConditions: boolean
    handoverConditions?: unknown[]
    approvedPropertyChanges?: unknown[]
  } | null
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
  approvedChanges?: PropertyChangeRequest[]
  unapprovedChanges?: PropertyChangeRequest[]
  conditions?: TenancyCondition[]
}

export type DamageClassification =
  | 'NORMAL_WEAR_AND_TEAR'
  | 'EXISTING_DAMAGE'
  | 'TENANT_DAMAGE'
  | 'MISSING_ITEM'
  | 'REQUIRES_REVIEW'
  | 'NO_ACTION'
  | 'UNAUTHORIZED_CHANGE'

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
  tenancyConditionId?: string | null
  propertyChangeRequestId?: string | null
  title: string
  category?: string
  reason: string
  description: string
  amount: number
  currentAmount?: number
  originalAmount?: number
  resolvedAmount?: number | null
  resolutionType?: 'CANCEL' | 'MODIFY' | 'MAINTAIN' | null
  resolutionNotes?: string
  status: DeductionStatus
  createdBy: string
  reviewedBy?: string | null
  reviewedAt?: string | null
  resolvedBy?: string | null
  resolvedAt?: string | null
  submittedForReviewAt?: string | null
  requiresTenantReview?: boolean
  isRevisedDeduction?: boolean
  context?: {
    itemName?: string
    classification?: string
    moveInCondition?: string | null
    moveOutCondition?: string | null
    moveInEvidence?: Array<{ id?: string; fileUrl?: string; caption?: string }>
    moveOutEvidence?: Array<{ id?: string; fileUrl?: string; caption?: string }>
  } | null
  createdAt?: string
}

export type DeductionSummary = {
  securityDeposit: number
  totalProposedDeductions: number
  projectedRefund: number
  exceedsDeposit: boolean
}

export type SettlementStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'DISPUTED'
  | 'READY_FOR_APPROVAL'
  | 'READY_FOR_SIGNATURE'
  | 'COMPLETED'

export type SettlementFinancials = {
  securityDeposit: number
  acceptedDeductionTotal: number
  disputedDeductionTotal: number
  proposedDeductionTotal: number
  pendingReviewTotal?: number
  finalDeductionTotal: number
  projectedRefund: number
  finalRefund: number | null
  exceedsDeposit: boolean
  depositExhausted?: boolean
  additionalAmountClaimed?: number
  allResolved: boolean
  hasOpenDisputes: boolean
  hasPendingProposed: boolean
}

export type SettlementReadiness = {
  ready: boolean
  blockers: string[]
  moveOutComplete: boolean
  comparisonAvailable: boolean
  damageAssessmentComplete: boolean
}

export type SettlementRecord = {
  id: string
  tenancyId: string
  propertyId: string
  securityDeposit: number
  proposedDeductionTotal: number
  acceptedDeductionTotal: number
  disputedDeductionTotal: number
  finalDeductionTotal: number
  projectedRefund: number
  finalRefund: number | null
  status: SettlementStatus
  ownerApproved: boolean
  tenantApproved: boolean
  ownerSigned: boolean
  tenantSigned: boolean
  completedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type DisputeReason =
  | 'DAMAGE_ALREADY_EXISTED'
  | 'NORMAL_WEAR_AND_TEAR'
  | 'AMOUNT_INCORRECT'
  | 'INCORRECT_ITEM'
  | 'NOT_CAUSED_BY_TENANT'
  | 'INSUFFICIENT_EVIDENCE'
  | 'OTHER'

export type Dispute = {
  id: string
  tenancyId: string
  deductionId: string
  raisedBy: string
  reason: DisputeReason
  description: string
  evidenceUrl?: string
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CANCELLED'
  resolutionType?: 'CANCEL' | 'MODIFY' | 'MAINTAIN' | null
  originalAmount?: number
  resolvedAmount?: number | null
  resolutionNotes?: string
  ownerResponse?: string
  resolvedBy?: string | null
  resolvedAt?: string | null
  createdAt?: string
}

export type SignatureRecord = {
  id: string
  tenancyId: string
  settlementId: string
  userId: string
  role: 'OWNER' | 'TENANT'
  signatureUrl: string
  signedAt: string
}

export type HandoverReport = {
  id: string
  tenancyId: string
  settlementId: string
  propertyId: string
  type: 'FINAL_HANDOVER'
  fileUrl: string
  generatedAt: string
  generatedBy: string
  propertyName?: string
  tenantName?: string
  completedAt?: string
  snapshot?: Record<string, unknown>
}

export type SettlementTenancySummary = {
  id: string
  propertyName: string
  tenantName: string
  ownerName?: string
  deposit: number
  stage: string
  status: string
  moveIn?: string
  moveOut?: string
  actualMoveOut?: string | null
}

export type SettlementData = {
  tenancy: SettlementTenancySummary
  deductions: Deduction[]
  disputes: Dispute[]
  settlement: SettlementRecord | null
  financials: SettlementFinancials
  readiness?: SettlementReadiness
  signatures: SignatureRecord[]
  report: HandoverReport | null
  conditions?: TenancyCondition[]
  changeRequests?: PropertyChangeRequest[]
  handover?: {
    conditionsAccepted: boolean
    conditionsAcceptedAt?: string | null
    approvedChanges: PropertyChangeRequest[]
    rejectedChanges: PropertyChangeRequest[]
  }
}

export type ConditionCategory =
  | 'CLEANING'
  | 'PAINTING'
  | 'STRUCTURAL_CHANGE'
  | 'FIXTURE_CHANGE'
  | 'APPLIANCE'
  | 'INVENTORY'
  | 'KEYS_ACCESS'
  | 'GENERAL'
  | 'CUSTOM'

export type ConditionStatus = 'DRAFT' | 'ACCEPTED' | 'AMENDMENT_PENDING' | 'SUPERSEDED'

export type ComplianceStatus = 'NEEDS_REVIEW' | 'COMPLIED' | 'NOT_COMPLIED' | 'NOT_APPLICABLE'

export type TenancyCondition = {
  id: string
  tenancyId: string
  propertyId: string
  ownerId: string
  title: string
  description: string
  category: ConditionCategory
  isMandatory: boolean
  requiresTenantAcceptance: boolean
  isAmendment?: boolean
  status: ConditionStatus
  acceptedAt?: string | null
  complianceStatus: ComplianceStatus
  complianceNotes?: string
  complianceReviewedAt?: string | null
  complianceEvidence?: Array<{ fileUrl: string; caption?: string; uploadedAt?: string }>
  createdAt?: string
  updatedAt?: string
}

export type ChangeRequestType =
  | 'ADD_ITEM'
  | 'REMOVE_ITEM'
  | 'REPLACE_ITEM'
  | 'INSTALL_FIXTURE'
  | 'REMOVE_FIXTURE'
  | 'PAINT_CHANGE'
  | 'DRILLING'
  | 'STRUCTURAL_CHANGE'
  | 'APPLIANCE_INSTALLATION'
  | 'APPLIANCE_REMOVAL'
  | 'OTHER'

export type ChangeRequestStatus =
  | 'PENDING'
  | 'AWAITING_TENANT_ACCEPTANCE'
  | 'APPROVED_PENDING_TENANT_ACCEPTANCE'
  | 'AWAITING_OWNER_FINAL_APPROVAL'
  | 'AUTHORIZED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONDITIONS_DECLINED'
  | 'CANCELLED'
  | 'COMPLETED'

export type PropertyChangeCommitment = {
  id?: string
  text: string
  details?: string
}

export type PropertyChangeMessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'FILE'
  | 'APPROVAL_REQUEST'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_REJECTED'
  | 'CONDITION_PROPOSED'
  | 'CONDITION_ACCEPTED'
  | 'CHANGE_AUTHORIZED'
  | 'CHANGE_COMPLETED'
  | 'SYSTEM'

export type PropertyChangeMessage = {
  id: string
  tenancyId: string
  propertyId: string
  senderId?: string | null
  senderRole: 'OWNER' | 'TENANT' | 'SYSTEM'
  senderName?: string
  messageType: PropertyChangeMessageType
  text: string
  attachments: Array<{
    id?: string
    fileUrl: string
    mimeType?: string
    caption?: string
    uploadedAt?: string
  }>
  changeRequestId?: string | null
  request?: PropertyChangeRequest | null
  createdAt: string
}

export type ChangeRequestEvidence = {
  id?: string
  fileUrl: string
  caption?: string
  uploadedAt?: string
}

export type ChangeRequestTimelineItem = {
  action: string
  note?: string
  actorRole: 'OWNER' | 'TENANT'
  at: string
}

export type PropertyChangeRequest = {
  id: string
  tenancyId: string
  propertyId: string
  tenantId: string
  ownerId: string
  propertyName?: string
  tenantName?: string
  ownerName?: string
  roomId?: string
  roomName?: string
  inventoryItemId?: string
  changeType: ChangeRequestType
  title: string
  description: string
  reason: string
  requestedAction?: string
  beforeState?: string
  requestedState?: string
  evidence: ChangeRequestEvidence[]
  completionEvidence: ChangeRequestEvidence[]
  completionNotes?: string
  status: ChangeRequestStatus
  tenantCommitments?: PropertyChangeCommitment[]
  ownerConditionItems?: PropertyChangeCommitment[]
  ownerResponse?: string
  ownerNotes?: string
  ownerConditions?: string
  rejectionReason?: string
  tenantConditionsAccepted?: boolean
  tenantConditionsAcceptedAt?: string | null
  tenantConditionsAcceptedBy?: string | null
  finalApprovedBy?: string | null
  finalApprovedAt?: string | null
  authorizedAt?: string | null
  authorized?: boolean
  requestedAt?: string
  reviewedAt?: string | null
  completedAt?: string | null
  complianceStatus?: ComplianceStatus
  complianceNotes?: string
  timeline?: ChangeRequestTimelineItem[]
  createdAt?: string
}

export type AppNotification = {
  id: string
  userId: string
  tenancyId?: string | null
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}
