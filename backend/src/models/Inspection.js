import mongoose from 'mongoose';

const INSPECTION_TYPES = ['MOVE_IN', 'MOVE_OUT'];
const INSPECTION_STATUSES = [
  'DRAFT',
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVAL_PENDING',
  'LOCKED',
  'COMPLETED',
];

const inspectionSchema = new mongoose.Schema(
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
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    propertyName: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: INSPECTION_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: INSPECTION_STATUSES,
      default: 'IN_PROGRESS',
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startedAt: { type: Date, default: Date.now },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    submittedAt: { type: Date, default: null },
    ownerApproved: { type: Boolean, default: false },
    ownerApprovedAt: { type: Date, default: null },
    ownerApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tenantApproved: { type: Boolean, default: false },
    tenantApprovedAt: { type: Date, default: null },
    tenantApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lockedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    currentStepIndex: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

inspectionSchema.index({ tenancyId: 1, type: 1 }, { unique: true });

inspectionSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    ret.ownerId = ret.ownerId?.toString?.() || ret.ownerId;
    ret.tenantId = ret.tenantId?.toString?.() || ret.tenantId;
    ret.startedBy = ret.startedBy?.toString?.() || ret.startedBy;
    ret.submittedBy = ret.submittedBy?.toString?.() || ret.submittedBy;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Inspection = mongoose.model('Inspection', inspectionSchema);
export { INSPECTION_TYPES, INSPECTION_STATUSES };
