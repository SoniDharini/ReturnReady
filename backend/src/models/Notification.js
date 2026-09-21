import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tenancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenancy',
      default: null,
      index: true,
    },
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true, default: '' },
    targetMoveOutDate: { type: String, trim: true, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index(
  { tenancyId: 1, userId: 1, type: 1, targetMoveOutDate: 1 },
  { name: 'move_out_reminder_dedupe' },
);

notificationSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.userId = ret.userId?.toString?.() || ret.userId;
    ret.tenancyId = ret.tenancyId?.toString?.() || ret.tenancyId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Notification = mongoose.model('Notification', notificationSchema);
