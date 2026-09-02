import mongoose from 'mongoose';

const DISPUTE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED'];
const DISPUTE_REASONS = [
  'DAMAGE_ALREADY_EXISTED',
  'NORMAL_WEAR_AND_TEAR',
  'AMOUNT_INCORRECT',
  'INCORRECT_ITEM',
  'NOT_CAUSED_BY_TENANT',
  'INSUFFICIENT_EVIDENCE',
  'OTHER',
];
const RESOLUTION_TYPES = ['CANCEL', 'MODIFY', 'MAINTAIN'];

const disputeSchema = new mongoose.Schema(
  {
    tenancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true,
      index: true,
    },
    deductionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deduction',
      required: true,
      unique: true,
      index: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: { type: String, enum: DISPUTE_REASONS, required: true },
    description: { type: String, trim: true, default: '' },
    evidenceUrl: { type: String, trim: true, default: '' },
    status: { type: String, enum: DISPUTE_STATUSES, default: 'OPEN' },
    ownerResponse: { type: String, trim: true, default: '' },
    resolutionType: { type: String, enum: RESOLUTION_TYPES, default: null },
    originalAmount: { type: Number, default: 0 },
    resolvedAmount: { type: Number, default: null },
    resolutionNotes: { type: String, trim: true, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

disputeSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.deductionId = ret.deductionId?.toString?.() || ret.deductionId;
    ret.raisedBy = ret.raisedBy?.toString?.() || ret.raisedBy;
    ret.resolvedBy = ret.resolvedBy?.toString?.() || ret.resolvedBy;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Dispute = mongoose.model('Dispute', disputeSchema);
export { DISPUTE_STATUSES, DISPUTE_REASONS, RESOLUTION_TYPES };
