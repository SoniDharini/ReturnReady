import mongoose from 'mongoose';

const inspectionEvidenceSchema = new mongoose.Schema(
  {
    inspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      required: true,
      index: true,
    },
    inspectionItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InspectionItem',
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    imageUrl: { type: String, required: true, trim: true },
    storageKey: { type: String, trim: true, default: '' },
    caption: { type: String, trim: true, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

inspectionEvidenceSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.inspectionId = ret.inspectionId?.toString?.() || ret.inspectionId;
    ret.inspectionItemId = ret.inspectionItemId?.toString?.() || ret.inspectionItemId;
    ret.roomId = ret.roomId?.toString?.() || ret.roomId;
    ret.uploadedBy = ret.uploadedBy?.toString?.() || ret.uploadedBy;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const InspectionEvidence = mongoose.model('InspectionEvidence', inspectionEvidenceSchema);
