import mongoose from 'mongoose';

const DEDUCTION_STATUSES = ['PROPOSED', 'ACCEPTED', 'DISPUTED', 'RESOLVED', 'CANCELLED'];

const deductionSchema = new mongoose.Schema(
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
    damageAssessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DamageAssessment',
      default: null,
    },
    inspectionItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: '' },
    reason: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    amount: { type: Number, required: true, min: 0 },
    originalAmount: { type: Number, default: null },
    resolvedAmount: { type: Number, default: null },
    status: {
      type: String,
      enum: DEDUCTION_STATUSES,
      default: 'PROPOSED',
    },
    resolutionType: { type: String, trim: true, default: null },
    resolutionNotes: { type: String, trim: true, default: '' },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: { type: Date, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    submittedForReviewAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

deductionSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    ret.createdBy = ret.createdBy?.toString?.() || ret.createdBy;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Deduction = mongoose.model('Deduction', deductionSchema);
export { DEDUCTION_STATUSES };
