import crypto from 'crypto';
import mongoose from 'mongoose';

const tenancySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    propertyName: { type: String, required: true, trim: true },
    tenantName: { type: String, required: true, trim: true },
    tenantEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    tenantPhone: { type: String, trim: true, default: '' },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    moveIn: { type: String, required: true },
    moveOut: { type: String, required: true },
    rent: { type: Number, required: true, min: 0 },
    deposit: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Invitation Sent', 'Active', 'Settlement Pending', 'Completed', 'Cancelled'],
      default: 'Invitation Sent',
    },
    inviteStatus: {
      type: String,
      enum: ['Pending', 'Accepted', 'Expired', 'Cancelled'],
      default: 'Pending',
    },
    inviteToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    inviteSentAt: { type: Date, default: Date.now },
    inviteExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    tenantUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    stage: {
      type: String,
      enum: ['invitation', 'move-in', 'active', 'move-out', 'settlement', 'complete'],
      default: 'invitation',
    },
    actualMoveOut: { type: String, default: null },
    moveOutReason: { type: String, trim: true, default: '' },
    moveOutNotes: { type: String, trim: true, default: '' },
    occupancyStatus: {
      type: String,
      enum: [
        'UPCOMING',
        'CURRENTLY_STAYING',
        'PREPARING_TO_MOVE_OUT',
        'MOVED_OUT',
        'COMPLETED',
      ],
      default: 'UPCOMING',
    },
    dateHistory: [
      {
        field: { type: String, required: true },
        oldValue: { type: String, default: '' },
        newValue: { type: String, default: '' },
        reason: { type: String, default: '' },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

tenancySchema.statics.createInviteToken = function createInviteToken() {
  return crypto.randomBytes(24).toString('hex');
};

tenancySchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    ret.inviteSentAt = ret.inviteSentAt
      ? new Date(ret.inviteSentAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';
    delete ret._id;
    delete ret.__v;
    delete ret.ownerId;
    delete ret.tenantUserId;
    return ret;
  },
});

export const Tenancy = mongoose.model('Tenancy', tenancySchema);
