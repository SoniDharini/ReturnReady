import mongoose from 'mongoose';

const SETTLEMENT_STATUSES = [
  'DRAFT',
  'UNDER_REVIEW',
  'DISPUTED',
  'READY_FOR_APPROVAL',
  'READY_FOR_SIGNATURE',
  'COMPLETED',
];

const settlementSchema = new mongoose.Schema(
  {
    tenancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true,
      unique: true,
      index: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    securityDeposit: { type: Number, required: true, min: 0 },
    proposedDeductionTotal: { type: Number, default: 0, min: 0 },
    acceptedDeductionTotal: { type: Number, default: 0, min: 0 },
    disputedDeductionTotal: { type: Number, default: 0, min: 0 },
    finalDeductionTotal: { type: Number, default: 0, min: 0 },
    projectedRefund: { type: Number, default: 0, min: 0 },
    finalRefund: { type: Number, default: null },
    status: {
      type: String,
      enum: SETTLEMENT_STATUSES,
      default: 'DRAFT',
    },
    ownerApproved: { type: Boolean, default: false },
    ownerApprovedAt: { type: Date, default: null },
    tenantApproved: { type: Boolean, default: false },
    tenantApprovedAt: { type: Date, default: null },
    ownerSigned: { type: Boolean, default: false },
    tenantSigned: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

settlementSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Settlement = mongoose.model('Settlement', settlementSchema);
export { SETTLEMENT_STATUSES };
