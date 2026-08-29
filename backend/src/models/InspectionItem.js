import mongoose from 'mongoose';

const ITEM_TYPES = ['ROOM', 'INVENTORY'];
const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'MISSING'];

const inspectionItemSchema = new mongoose.Schema(
  {
    inspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      required: true,
      index: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    itemType: {
      type: String,
      enum: ITEM_TYPES,
      required: true,
    },
    itemName: { type: String, required: true, trim: true },
    condition: {
      type: String,
      enum: CONDITIONS,
      default: null,
    },
    notes: { type: String, trim: true, default: '' },
    issueDescription: { type: String, trim: true, default: '' },
    isCompleted: { type: Boolean, default: false },
    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    inspectedAt: { type: Date, default: null },
    roomName: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

inspectionItemSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.inspectionId = ret.inspectionId?.toString?.() || ret.inspectionId;
    ret.propertyId = ret.propertyId?.toString?.() || ret.propertyId;
    ret.roomId = ret.roomId?.toString?.() || ret.roomId;
    ret.inventoryItemId = ret.inventoryItemId?.toString?.() || ret.inventoryItemId;
    ret.inspectedBy = ret.inspectedBy?.toString?.() || ret.inspectedBy;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const InspectionItem = mongoose.model('InspectionItem', inspectionItemSchema);
export { ITEM_TYPES, CONDITIONS };
