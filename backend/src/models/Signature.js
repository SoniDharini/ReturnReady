import mongoose from 'mongoose';

const signatureSchema = new mongoose.Schema(
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
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: { type: String, enum: ['OWNER', 'TENANT'], required: true },
    signatureUrl: { type: String, required: true, trim: true },
    signedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

signatureSchema.index({ settlementId: 1, role: 1 }, { unique: true });

signatureSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.settlementId = ret.settlementId?.toString?.() || ret.settlementId;
    ret.userId = ret.userId?.toString?.() || ret.userId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Signature = mongoose.model('Signature', signatureSchema);
