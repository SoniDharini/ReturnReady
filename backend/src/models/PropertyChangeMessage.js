import mongoose from 'mongoose';

export const CHANGE_MESSAGE_TYPES = [
  'TEXT',
  'IMAGE',
  'FILE',
  'APPROVAL_REQUEST',
  'APPROVAL_GRANTED',
  'APPROVAL_REJECTED',
  'CONDITION_PROPOSED',
  'CONDITION_ACCEPTED',
  'CHANGE_AUTHORIZED',
  'CHANGE_COMPLETED',
  'SYSTEM',
];

const attachmentSchema = new mongoose.Schema(
  {
    fileUrl: { type: String, required: true, trim: true },
    storageKey: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: 'image/png' },
    caption: { type: String, trim: true, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const propertyChangeMessageSchema = new mongoose.Schema(
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
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    senderRole: {
      type: String,
      enum: ['OWNER', 'TENANT', 'SYSTEM'],
      required: true,
    },
    senderName: { type: String, trim: true, default: '' },
    messageType: {
      type: String,
      enum: CHANGE_MESSAGE_TYPES,
      default: 'TEXT',
    },
    text: { type: String, trim: true, default: '', maxlength: 4000 },
    attachments: { type: [attachmentSchema], default: [] },
    changeRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PropertyChangeRequest',
      default: null,
    },
    isImmutable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

propertyChangeMessageSchema.index({ tenancyId: 1, createdAt: 1 });

propertyChangeMessageSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    ret.senderId = ret.senderId?.toString?.() || ret.senderId || null;
    ret.changeRequestId = ret.changeRequestId?.toString?.() || ret.changeRequestId || null;
    if (Array.isArray(ret.attachments)) {
      ret.attachments = ret.attachments.map((item) => ({
        id: item._id?.toString?.() || item.id,
        fileUrl: item.fileUrl,
        storageKey: item.storageKey,
        mimeType: item.mimeType,
        caption: item.caption,
        uploadedBy: item.uploadedBy?.toString?.() || item.uploadedBy,
        uploadedAt: item.uploadedAt,
      }));
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const PropertyChangeMessage = mongoose.model(
  'PropertyChangeMessage',
  propertyChangeMessageSchema,
);
