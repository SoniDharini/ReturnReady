import { Property } from '../models/Property.js';
import { ApiError } from '../utils/ApiError.js';

export async function listPropertiesForOwner(ownerId) {
  const properties = await Property.find({ ownerId }).sort({ createdAt: -1 });
  return properties.map((p) => p.toJSON());
}

export async function getPropertyForOwner(ownerId, propertyId) {
  const property = await Property.findOne({ _id: propertyId, ownerId });
  if (!property) throw new ApiError(404, 'Property not found');
  return property.toJSON();
}

export async function createPropertyForOwner(ownerId, payload) {
  const property = await Property.create({
    ...payload,
    ownerId,
    rooms: payload.rooms ?? payload.roomList?.length ?? 0,
  });
  return property.toJSON();
}

export async function updatePropertyForOwner(ownerId, propertyId, payload) {
  const property = await Property.findOneAndUpdate(
    { _id: propertyId, ownerId },
    { $set: payload },
    { new: true, runValidators: true },
  );
  if (!property) throw new ApiError(404, 'Property not found');
  return property.toJSON();
}

export async function deletePropertyForOwner(ownerId, propertyId) {
  const property = await Property.findOneAndDelete({ _id: propertyId, ownerId });
  if (!property) throw new ApiError(404, 'Property not found');
  return true;
}

export async function countPropertiesForOwner(ownerId) {
  return Property.countDocuments({ ownerId });
}
