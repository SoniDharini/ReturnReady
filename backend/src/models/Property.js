import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 0 },
    description: { type: String, trim: true, default: '' },
  },
  { _id: true },
);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    items: { type: [inventoryItemSchema], default: [] },
  },
  { _id: true },
);

const propertySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: {
      type: String,
      enum: ['apartment', 'villa', 'studio', 'house'],
      default: 'apartment',
    },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pin: { type: String, required: true, trim: true },
    rooms: { type: Number, default: 0, min: 0 },
    bathrooms: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Active'],
      default: 'Active',
    },
    roomList: { type: [roomSchema], default: [] },
    activeTenancy: { type: String, default: null },
  },
  { timestamps: true },
);

propertySchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (Array.isArray(ret.roomList)) {
      ret.roomList = ret.roomList.map((room) => ({
        id: room._id?.toString(),
        name: room.name,
        items: (room.items || []).map((item) => ({
          id: item._id?.toString(),
          name: item.name,
          quantity: item.quantity,
          description: item.description || '',
        })),
      }));
    }
    return ret;
  },
});

export const Property = mongoose.model('Property', propertySchema);
