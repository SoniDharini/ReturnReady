import mongoose from 'mongoose';

const METER_TYPES = ['ELECTRICITY', 'WATER', 'GAS', 'OTHER'];

const meterReadingSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: METER_TYPES,
      required: true,
    },
    customTypeName: { type: String, trim: true, default: '' },
    reading: { type: String, required: true, trim: true },
    unit: { type: String, trim: true, default: '' },
    meterNumber: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

meterReadingSchema.set('toJSON', {
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

export const MeterReading = mongoose.model('MeterReading', meterReadingSchema);
export { METER_TYPES };
