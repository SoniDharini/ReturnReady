import mongoose from 'mongoose';

export const CONDITION_CATEGORIES = [
  'CLEANING',
  'PAINTING',
  'STRUCTURAL_CHANGE',
  'FIXTURE_CHANGE',
  'APPLIANCE',
  'INVENTORY',
  'KEYS_ACCESS',
  'GENERAL',
  'CUSTOM',
];

export const CONDITION_STATUSES = ['DRAFT', 'ACCEPTED', 'AMENDMENT_PENDING', 'SUPERSEDED'];

export const COMPLIANCE_STATUSES = [
  'NEEDS_REVIEW',
  'COMPLIED',
  'NOT_COMPLIED',
  'NOT_APPLICABLE',
];

const tenancyConditionSchema = new mongoose.Schema(
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
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, default: '', maxlength: 2000 },
    category: {
      type: String,
      enum: CONDITION_CATEGORIES,
      default: 'GENERAL',
    },
    isMandatory: { type: Boolean, default: true },
    requiresTenantAcceptance: { type: Boolean, default: true },
    isAmendment: { type: Boolean, default: false },
    parentConditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TenancyCondition',
      default: null,
    },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: CONDITION_STATUSES,
      default: 'DRAFT',
    },
    acceptedAt: { type: Date, default: null },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    complianceStatus: {
      type: String,
      enum: COMPLIANCE_STATUSES,
      default: 'NEEDS_REVIEW',
    },
    complianceNotes: { type: String, trim: true, default: '' },
    complianceReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    complianceReviewedAt: { type: Date, default: null },
    complianceEvidence: {
      type: [
        {
          fileUrl: { type: String, required: true, trim: true },
          caption: { type: String, trim: true, default: '' },
          uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

tenancyConditionSchema.index({ tenancyId: 1, status: 1 });

tenancyConditionSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    ret.ownerId = ret.ownerId?.toString?.() || ret.ownerId;
    ret.parentConditionId = ret.parentConditionId?.toString?.() || ret.parentConditionId;
    ret.acceptedBy = ret.acceptedBy?.toString?.() || ret.acceptedBy;
    ret.complianceReviewedBy = ret.complianceReviewedBy?.toString?.() || ret.complianceReviewedBy;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const TenancyCondition = mongoose.model('TenancyCondition', tenancyConditionSchema);
