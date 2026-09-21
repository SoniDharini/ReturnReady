import mongoose from 'mongoose';

export const EXTENSION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const tenancyExtensionRequestSchema = new mongoose.Schema(
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
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currentMoveOutDate: { type: String, required: true },
    requestedMoveOutDate: { type: String, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: EXTENSION_STATUSES,
      default: 'PENDING',
      index: true,
    },
    ownerResponse: { type: String, trim: true, default: '' },
    ownerNotes: { type: String, trim: true, default: '' },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

tenancyExtensionRequestSchema.index(
  { tenancyId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'PENDING' },
    name: 'one_pending_extension_per_tenancy',
  },
);

tenancyExtensionRequestSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    ret.tenantId = ret.tenantId?.toString?.() || ret.tenantId;
    ret.ownerId = ret.ownerId?.toString?.() || ret.ownerId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const TenancyExtensionRequest = mongoose.model(
  'TenancyExtensionRequest',
  tenancyExtensionRequestSchema,
);
