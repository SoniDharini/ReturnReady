import mongoose from 'mongoose';

export const CHANGE_TYPES = [
  'ADD_ITEM',
  'REMOVE_ITEM',
  'REPLACE_ITEM',
  'INSTALL_FIXTURE',
  'REMOVE_FIXTURE',
  'PAINT_CHANGE',
  'DRILLING',
  'STRUCTURAL_CHANGE',
  'APPLIANCE_INSTALLATION',
  'APPLIANCE_REMOVAL',
  'OTHER',
];

/** Canonical + legacy statuses kept for existing records */
export const CHANGE_REQUEST_STATUSES = [
  'PENDING',
  'AWAITING_TENANT_ACCEPTANCE',
  'APPROVED_PENDING_TENANT_ACCEPTANCE', // legacy alias of AWAITING_TENANT_ACCEPTANCE
  'AWAITING_OWNER_FINAL_APPROVAL',
  'AUTHORIZED',
  'APPROVED', // legacy alias of AUTHORIZED
  'REJECTED',
  'CONDITIONS_DECLINED',
  'CANCELLED',
  'COMPLETED',
];

export const AUTHORIZED_CHANGE_STATUSES = ['AUTHORIZED', 'APPROVED', 'COMPLETED'];

export const AWAITING_TENANT_ACCEPTANCE_STATUSES = [
  'AWAITING_TENANT_ACCEPTANCE',
  'APPROVED_PENDING_TENANT_ACCEPTANCE',
];

export const OWNER_ACTION_REQUIRED_STATUSES = ['PENDING', 'AWAITING_OWNER_FINAL_APPROVAL'];

export function isAuthorizedChangeStatus(status) {
  return AUTHORIZED_CHANGE_STATUSES.includes(status);
}

export function isAwaitingTenantAcceptance(status) {
  return AWAITING_TENANT_ACCEPTANCE_STATUSES.includes(status);
}

const evidenceSchema = new mongoose.Schema(
  {
    fileUrl: { type: String, required: true, trim: true },
    storageKey: { type: String, trim: true, default: '' },
    caption: { type: String, trim: true, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const commitmentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    details: { type: String, trim: true, default: '', maxlength: 1000 },
  },
  { _id: true },
);

const ownerConditionItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    details: { type: String, trim: true, default: '', maxlength: 1000 },
  },
  { _id: true },
);

const timelineSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: '' },
    actorRole: { type: String, enum: ['OWNER', 'TENANT'], required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const propertyChangeRequestSchema = new mongoose.Schema(
  {
    tenancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true,
      index: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: { type: String, trim: true, default: '' },
    roomName: { type: String, trim: true, default: '' },
    inventoryItemId: { type: String, trim: true, default: '' },
    changeType: {
      type: String,
      enum: CHANGE_TYPES,
      default: 'OTHER',
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, default: '', maxlength: 2000 },
    reason: { type: String, trim: true, default: '', maxlength: 2000 },
    requestedAction: { type: String, trim: true, default: '' },
    beforeState: { type: String, trim: true, default: '' },
    requestedState: { type: String, trim: true, default: '' },
    tenantCommitments: { type: [commitmentSchema], default: [] },
    ownerConditionItems: { type: [ownerConditionItemSchema], default: [] },
    evidence: { type: [evidenceSchema], default: [] },
    completionEvidence: { type: [evidenceSchema], default: [] },
    completionNotes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: CHANGE_REQUEST_STATUSES,
      default: 'PENDING',
      index: true,
    },
    ownerResponse: { type: String, trim: true, default: '' },
    ownerNotes: { type: String, trim: true, default: '' },
    /** Legacy free-text conditions; kept in sync from ownerConditionItems */
    ownerConditions: { type: String, trim: true, default: '' },
    rejectionReason: { type: String, trim: true, default: '' },
    tenantConditionsAccepted: { type: Boolean, default: false },
    tenantConditionsAcceptedAt: { type: Date, default: null },
    tenantConditionsAcceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalApprovedAt: { type: Date, default: null },
    authorizedAt: { type: Date, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    moveOutInspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      default: null,
    },
    complianceStatus: {
      type: String,
      enum: ['NEEDS_REVIEW', 'COMPLIED', 'NOT_COMPLIED', 'NOT_APPLICABLE'],
      default: 'NEEDS_REVIEW',
    },
    complianceNotes: { type: String, trim: true, default: '' },
    complianceEvidence: { type: [evidenceSchema], default: [] },
    complianceReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    complianceReviewedAt: { type: Date, default: null },
    timeline: { type: [timelineSchema], default: [] },
  },
  { timestamps: true },
);

propertyChangeRequestSchema.index({ tenancyId: 1, status: 1 });
propertyChangeRequestSchema.index({ ownerId: 1, status: 1 });
propertyChangeRequestSchema.index({ tenantId: 1, status: 1 });

function mapEvidence(list = []) {
  return list.map((item) => ({
    id: item._id?.toString?.() || item.id,
    fileUrl: item.fileUrl,
    caption: item.caption,
    uploadedAt: item.uploadedAt,
  }));
}

function mapCommitments(list = []) {
  return list.map((item) => ({
    id: item._id?.toString?.() || item.id,
    text: item.text,
    details: item.details || '',
  }));
}

propertyChangeRequestSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    ret.tenantId = ret.tenantId?.toString?.() || ret.tenantId;
    ret.ownerId = ret.ownerId?.toString?.() || ret.ownerId;
    ret.reviewedBy = ret.reviewedBy?.toString?.() || ret.reviewedBy;
    ret.approvedBy = ret.approvedBy?.toString?.() || ret.approvedBy;
    ret.rejectedBy = ret.rejectedBy?.toString?.() || ret.rejectedBy;
    ret.finalApprovedBy = ret.finalApprovedBy?.toString?.() || ret.finalApprovedBy;
    ret.tenantConditionsAcceptedBy =
      ret.tenantConditionsAcceptedBy?.toString?.() || ret.tenantConditionsAcceptedBy;
    ret.complianceReviewedBy = ret.complianceReviewedBy?.toString?.() || ret.complianceReviewedBy;
    ret.evidence = mapEvidence(ret.evidence);
    ret.completionEvidence = mapEvidence(ret.completionEvidence);
    ret.complianceEvidence = mapEvidence(ret.complianceEvidence);
    ret.tenantCommitments = mapCommitments(ret.tenantCommitments);
    ret.ownerConditionItems = mapCommitments(ret.ownerConditionItems);
    if (
      (!ret.ownerConditionItems || ret.ownerConditionItems.length === 0) &&
      ret.ownerConditions
    ) {
      ret.ownerConditionItems = String(ret.ownerConditions)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ text, details: '' }));
    }
    ret.authorized = isAuthorizedChangeStatus(ret.status);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const PropertyChangeRequest = mongoose.model(
  'PropertyChangeRequest',
  propertyChangeRequestSchema,
);
