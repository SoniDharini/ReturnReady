import mongoose from 'mongoose';

const RESOLUTION_STATUSES = [
  'OPEN',
  'REPAIR_PENDING',
  'REPAIRED_PENDING_VERIFICATION',
  'RESOLVED',
  'NOT_REQUIRED',
];

const REPAIR_REQUIRED_CLASSIFICATIONS = [
  'TENANT_DAMAGE',
  'MISSING_ITEM',
  'UNAUTHORIZED_CHANGE',
  'REQUIRES_REVIEW',
];

const CLASSIFICATIONS = [
  'NORMAL_WEAR_AND_TEAR',
  'EXISTING_DAMAGE',
  'TENANT_DAMAGE',
  'MISSING_ITEM',
  'REQUIRES_REVIEW',
  'NO_ACTION',
  'UNAUTHORIZED_CHANGE',
];

const damageAssessmentSchema = new mongoose.Schema(
  {
    tenancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true,
      index: true,
    },
    moveInInspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      required: true,
    },
    moveOutInspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      required: true,
    },
    roomId: { type: mongoose.Schema.Types.ObjectId, required: true },
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    moveInItemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    moveOutItemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    itemName: { type: String, required: true, trim: true },
    comparisonResult: { type: String, trim: true, default: '' },
    classification: {
      type: String,
      enum: CLASSIFICATIONS,
      required: true,
    },
    description: { type: String, trim: true, default: '' },
    deductionRequired: { type: Boolean, default: false },
    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assessedAt: { type: Date, default: Date.now },
    resolutionStatus: {
      type: String,
      enum: RESOLUTION_STATUSES,
      default: 'OPEN',
    },
    tenantRepairNotes: { type: String, trim: true, default: '' },
    tenantRepairEvidenceUrl: { type: String, trim: true, default: '' },
    tenantRepairSubmittedAt: { type: Date, default: null },
    resolutionNotes: { type: String, trim: true, default: '' },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

damageAssessmentSchema.index(
  { tenancyId: 1, moveOutItemId: 1 },
  { unique: true, sparse: true },
);

damageAssessmentSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.assessedBy = ret.assessedBy?.toString?.() || ret.assessedBy;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const DamageAssessment = mongoose.model('DamageAssessment', damageAssessmentSchema);
export { CLASSIFICATIONS, RESOLUTION_STATUSES, REPAIR_REQUIRED_CLASSIFICATIONS };
