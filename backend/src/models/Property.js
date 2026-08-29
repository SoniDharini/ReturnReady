import mongoose from 'mongoose';

const ROOM_TYPES = [
  'BEDROOM',
  'BATHROOM',
  'LIVING_ROOM',
  'KITCHEN',
  'BALCONY',
  'DINING_ROOM',
  'CUSTOM',
];

const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'pg', 'office', 'studio', 'other'];

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
    type: {
      type: String,
      enum: ROOM_TYPES,
      default: 'CUSTOM',
    },
    isCustom: { type: Boolean, default: false },
    items: { type: [inventoryItemSchema], default: [] },
  },
  { _id: true },
);

const propertyImageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    caption: { type: String, trim: true, default: '' },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: { type: Date, default: Date.now },
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
      enum: PROPERTY_TYPES,
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
    images: { type: [propertyImageSchema], default: [] },
    activeTenancy: { type: String, default: null },
  },
  { timestamps: true },
);

function mapRoom(room) {
  return {
    id: room._id?.toString(),
    name: room.name,
    type: room.type || 'CUSTOM',
    isCustom: Boolean(room.isCustom || room.type === 'CUSTOM'),
    items: (room.items || []).map((item) => ({
      id: item._id?.toString(),
      name: item.name,
      quantity: item.quantity,
      description: item.description || '',
    })),
  };
}

function mapImage(image) {
  return {
    id: image._id?.toString(),
    imageUrl: image.imageUrl,
    caption: image.caption || '',
    uploadedBy: image.uploadedBy?.toString?.() || image.uploadedBy,
    uploadedAt: image.uploadedAt,
  };
}

propertySchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (Array.isArray(ret.roomList)) {
      ret.roomList = ret.roomList.map(mapRoom);
    }
    if (Array.isArray(ret.images)) {
      ret.images = ret.images.map(mapImage);
    }
    return ret;
  },
});

export const Property = mongoose.model('Property', propertySchema);
export { ROOM_TYPES, PROPERTY_TYPES };
