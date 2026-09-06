import mongoose from 'mongoose';

const tenancyConditionAcceptanceSchema = new mongoose.Schema(
  {
    tenancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    conditionVersion: { type: Number, required: true, min: 1 },
    acceptedConditionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TenancyCondition',
      },
    ],
    acceptedAt: { type: Date, default: Date.now },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isAmendmentAcknowledgement: { type: Boolean, default: false },
  },
  { timestamps: true },
);

tenancyConditionAcceptanceSchema.index({ tenancyId: 1, conditionVersion: 1 }, { unique: true });

tenancyConditionAcceptanceSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.tenantId = ret.tenantId?.toString?.() || ret.tenantId;
    ret.acceptedBy = ret.acceptedBy?.toString?.() || ret.acceptedBy;
    ret.acceptedConditionIds = (ret.acceptedConditionIds || []).map((id) => id?.toString?.() || id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const TenancyConditionAcceptance = mongoose.model(
  'TenancyConditionAcceptance',
  tenancyConditionAcceptanceSchema,
);
