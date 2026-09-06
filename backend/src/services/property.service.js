import fs from 'fs';
import path from 'path';
import { Property } from '../models/Property.js';
import { Tenancy } from '../models/Tenancy.js';
import { Inspection } from '../models/Inspection.js';
import { ApiError } from '../utils/ApiError.js';
import { PROPERTY_UPLOADS_DIR } from '../middleware/upload.middleware.js';
import {
  assertOwnerPropertyAccess,
  enrichPropertiesWithAvailability,
  enrichPropertyWithAvailability,
  getActiveTenancyForProperty,
} from './propertyAvailability.service.js';

function normalizeRooms(roomList = []) {
  return roomList.map((room) => ({
    name: room.name,
    type: room.type || (room.isCustom ? 'CUSTOM' : 'CUSTOM'),
    isCustom: Boolean(room.isCustom || room.type === 'CUSTOM'),
    items: room.items || [],
    ...(room.id ? { _id: room.id } : {}),
  }));
}

function deriveCounts(roomList = []) {
  const bathrooms = roomList.filter((r) => r.type === 'BATHROOM').length;
  return {
    rooms: roomList.length,
    bathrooms,
  };
}

function toPublicImageUrl(filename) {
  return `/uploads/properties/${filename}`;
}

function resolveStoredFile(imageUrl) {
  if (!imageUrl) return null;
  const filename = path.basename(imageUrl);
  const fullPath = path.join(PROPERTY_UPLOADS_DIR, filename);
  if (!fullPath.startsWith(PROPERTY_UPLOADS_DIR)) return null;
  return fullPath;
}

export async function listPropertiesForOwner(ownerId) {
  const properties = await Property.find({ ownerId }).sort({ createdAt: -1 });
  return enrichPropertiesWithAvailability(properties);
}

export async function getPropertyForOwner(ownerId, propertyId) {
  const property = await Property.findOne({ _id: propertyId, ownerId });
  if (!property) throw new ApiError(404, 'Property not found');
  return enrichPropertyWithAvailability(property);
}

export async function createPropertyForOwner(ownerId, payload) {
  const roomList = normalizeRooms(payload.roomList || []);
  const counts = deriveCounts(roomList);

  const property = await Property.create({
    ...payload,
    ownerId,
    roomList,
    images: [],
    rooms: counts.rooms,
    bathrooms: counts.bathrooms,
  });

  return property.toJSON();
}

export async function updatePropertyForOwner(ownerId, propertyId, payload) {
  const existing = await assertOwnerPropertyAccess(ownerId, propertyId);

  if (payload.name !== undefined) existing.name = payload.name;
  if (payload.type !== undefined) existing.type = payload.type;
  if (payload.address !== undefined) existing.address = payload.address;
  if (payload.city !== undefined) existing.city = payload.city;
  if (payload.state !== undefined) existing.state = payload.state;
  if (payload.pin !== undefined) existing.pin = payload.pin;
  if (payload.status !== undefined) existing.status = payload.status;

  if (payload.roomList !== undefined) {
    existing.roomList = normalizeRooms(payload.roomList);
    const counts = deriveCounts(existing.roomList);
    existing.rooms = counts.rooms;
    existing.bathrooms = counts.bathrooms;
  } else if (payload.rooms !== undefined || payload.bathrooms !== undefined) {
    if (payload.rooms !== undefined) existing.rooms = payload.rooms;
    if (payload.bathrooms !== undefined) existing.bathrooms = payload.bathrooms;
  }

  await existing.save();
  return enrichPropertyWithAvailability(existing);
}

export async function deletePropertyForOwner(ownerId, propertyId) {
  const property = await assertOwnerPropertyAccess(ownerId, propertyId);

  const activeTenancy = await getActiveTenancyForProperty(property._id);

  if (activeTenancy) {
    throw new ApiError(
      409,
      'This property is currently assigned to a Tenant. End the active tenancy first.',
    );
  }

  const hasInspections = await Inspection.exists({ propertyId: property._id });
  const hasTenancyHistory = await Tenancy.exists({ propertyId: property._id });

  if (hasInspections || hasTenancyHistory) {
    property.status = 'Archived';
    property.activeTenancy = null;
    await property.save();
    return { archived: true, property: property.toJSON() };
  }

  for (const image of property.images || []) {
    const filePath = resolveStoredFile(image.imageUrl);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Ignore cleanup failures
      }
    }
  }

  await property.deleteOne();
  return { archived: false, property: null };
}

export async function addPropertyImages(ownerId, propertyId, files = [], captions = []) {
  const property = await assertOwnerPropertyAccess(ownerId, propertyId);

  if (!files.length) {
    throw new ApiError(400, 'At least one image is required');
  }

  if (property.images.length + files.length > 40) {
    throw new ApiError(400, 'A property can have at most 40 images');
  }

  const captionList = Array.isArray(captions) ? captions : [captions].filter(Boolean);

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    property.images.push({
      imageUrl: toPublicImageUrl(file.filename),
      caption: String(captionList[i] || '').trim(),
      uploadedBy: ownerId,
      uploadedAt: new Date(),
    });
  }

  await property.save();
  return enrichPropertyWithAvailability(property);
}

export async function updatePropertyImageCaption(ownerId, propertyId, imageId, caption) {
  const property = await assertOwnerPropertyAccess(ownerId, propertyId);

  const image = property.images.id(imageId);
  if (!image) throw new ApiError(404, 'Image not found');

  image.caption = caption || '';
  await property.save();
  return enrichPropertyWithAvailability(property);
}

export async function deletePropertyImage(ownerId, propertyId, imageId) {
  const property = await assertOwnerPropertyAccess(ownerId, propertyId);

  const image = property.images.id(imageId);
  if (!image) throw new ApiError(404, 'Image not found');

  const filePath = resolveStoredFile(image.imageUrl);
  image.deleteOne();
  await property.save();

  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore cleanup failures
    }
  }

  return enrichPropertyWithAvailability(property);
}

export async function countPropertiesForOwner(ownerId) {
  return Property.countDocuments({ ownerId });
}
