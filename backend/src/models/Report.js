import mongoose from 'mongoose';

const REPORT_TYPES = ['FINAL_HANDOVER'];

const reportSchema = new mongoose.Schema(
  {
    tenancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true,
      index: true,
    },
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settlement',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    type: { type: String, enum: REPORT_TYPES, default: 'FINAL_HANDOVER' },
    fileUrl: { type: String, required: true, trim: true },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    generatedAt: { type: Date, default: Date.now },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

reportSchema.index({ tenancyId: 1, type: 1 }, { unique: true });

reportSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.settlementId = ret.settlementId?.toString?.() || ret.settlementId;
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    ret.generatedBy = ret.generatedBy?.toString?.() || ret.generatedBy;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Report = mongoose.model('Report', reportSchema);
export { REPORT_TYPES };
