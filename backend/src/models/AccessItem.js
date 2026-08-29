import mongoose from 'mongoose';

const accessItemSchema = new mongoose.Schema(
  {
    inspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      required: true,
      index: true,
    },
    tenancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    notes: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

accessItemSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.inspectionId = ret.inspectionId?.toString?.() || ret.inspectionId;
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    ret.recordedBy = ret.recordedBy?.toString?.() || ret.recordedBy;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const AccessItem = mongoose.model('AccessItem', accessItemSchema);
