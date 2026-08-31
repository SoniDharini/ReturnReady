import fs from 'fs';
import path from 'path';
import { AccessItem } from '../models/AccessItem.js';
import { Inspection } from '../models/Inspection.js';
import { InspectionEvidence } from '../models/InspectionEvidence.js';
import { InspectionItem } from '../models/InspectionItem.js';
import { MeterReading } from '../models/MeterReading.js';
import { Property } from '../models/Property.js';
import { Tenancy } from '../models/Tenancy.js';
import { getTenantAccessForUser } from './tenancy.service.js';
import { INSPECTION_UPLOADS_DIR } from '../middleware/upload.middleware.js';
import { ApiError } from '../utils/ApiError.js';

function toPublicImageUrl(filename) {
  return `/uploads/inspections/${filename}`;
}

function resolveStoredFile(imageUrl) {
  if (!imageUrl) return null;
  const filename = path.basename(imageUrl);
  const fullPath = path.join(INSPECTION_UPLOADS_DIR, filename);
  if (!fullPath.startsWith(INSPECTION_UPLOADS_DIR)) return null;
  return fullPath;
}

async function getTenancyForUser(user, tenancyId) {
  if (user.role === 'OWNER') {
    const tenancy = await Tenancy.findOne({ _id: tenancyId, ownerId: user.id });
    if (!tenancy) throw new ApiError(404, 'Tenancy not found');
    return tenancy;
  }

  const tenancy = await Tenancy.findOne({
    _id: tenancyId,
    tenantUserId: user.id,
    inviteStatus: 'Accepted',
  });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  return tenancy;
}

async function getInspectionForUser(user, inspectionId) {
  const inspection = await Inspection.findById(inspectionId);
  if (!inspection) throw new ApiError(404, 'Inspection not found');

  if (user.role === 'OWNER' && inspection.ownerId.toString() !== user.id) {
    throw new ApiError(403, 'You do not have permission to access this inspection');
  }

  if (user.role === 'TENANT') {
    if (!inspection.tenantId || inspection.tenantId.toString() !== user.id) {
      throw new ApiError(403, 'You do not have permission to access this inspection');
    }
  }

  return inspection;
}

async function generateInspectionItems(inspection, property) {
  const items = [];

  for (const room of property.roomList || []) {
    items.push({
      inspectionId: inspection._id,
      propertyId: property._id,
      roomId: room._id,
      itemType: 'ROOM',
      itemName: `${room.name} — Overall Condition`,
      roomName: room.name,
    });

    for (const inv of room.items || []) {
      items.push({
        inspectionId: inspection._id,
        propertyId: property._id,
        roomId: room._id,
        inventoryItemId: inv._id,
        itemType: 'INVENTORY',
        itemName: inv.name,
        roomName: room.name,
      });
    }
  }

  if (items.length > 0) {
    await InspectionItem.insertMany(items);
  }

  return items.length;
}

function groupItemsByRoom(items) {
  const rooms = new Map();
  for (const item of items) {
    const key = item.roomId;
    if (!rooms.has(key)) {
      rooms.set(key, { roomId: key, roomName: item.roomName || 'Room', items: [] });
    }
    rooms.get(key).items.push(item);
  }
  return Array.from(rooms.values());
}

function isItemComplete(item) {
  if (!item.condition) return false;
  if (['FAIR', 'DAMAGED', 'MISSING'].includes(item.condition) && !item.issueDescription?.trim()) {
    return false;
  }
  return true;
}

function canEditInspection(inspection) {
  if (['LOCKED', 'COMPLETED', 'APPROVAL_PENDING', 'SUBMITTED'].includes(inspection.status)) {
    return false;
  }
  return ['DRAFT', 'IN_PROGRESS'].includes(inspection.status);
}

function itemMatchKey(item) {
  const inv = item.inventoryItemId?.toString?.() || item.inventoryItemId || 'room';
  return `${item.roomId?.toString?.() || item.roomId}:${item.itemType}:${inv}`;
}

export async function createInspection(user, tenancyId, { type = 'MOVE_IN' }) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can start inspections');
  }

  const tenancy = await getTenancyForUser(user, tenancyId);

  if (tenancy.inviteStatus !== 'Accepted') {
    throw new ApiError(400, 'Tenant must accept the invitation before starting inspection');
  }

  const existing = await Inspection.findOne({ tenancyId, type });
  if (existing) {
    throw new ApiError(409, `A ${type.replace('_', '-').toLowerCase()} inspection already exists for this tenancy`);
  }

  if (type === 'MOVE_OUT') {
    const moveIn = await Inspection.findOne({ tenancyId, type: 'MOVE_IN', status: 'LOCKED' });
    if (!moveIn) {
      throw new ApiError(400, 'Move-in inspection must be locked before starting move-out');
    }
    if (tenancy.stage !== 'active' && tenancy.stage !== 'move-out') {
      throw new ApiError(400, 'Tenancy must be active before starting move-out inspection');
    }
  }

  const property = await Property.findById(tenancy.propertyId);
  if (!property) throw new ApiError(404, 'Property not found');

  const inspection = await Inspection.create({
    tenancyId: tenancy._id,
    propertyId: property._id,
    ownerId: tenancy.ownerId,
    tenantId: tenancy.tenantUserId,
    propertyName: property.name,
    type,
    status: 'IN_PROGRESS',
    startedBy: user.id,
    startedAt: new Date(),
    currentStepIndex: 0,
  });

  await generateInspectionItems(inspection, property);

  if (type === 'MOVE_OUT') {
    tenancy.stage = 'move-out';
    await tenancy.save();
  }

  return getInspectionDetail(user, inspection._id.toString());
}

export async function listInspectionsForTenancy(user, tenancyId) {
  await getTenancyForUser(user, tenancyId);
  const inspections = await Inspection.find({ tenancyId }).sort({ createdAt: -1 });
  return inspections.map((doc) => doc.toJSON());
}

export async function getInspectionDetail(user, inspectionId) {
  const inspection = await getInspectionForUser(user, inspectionId);
  const items = await InspectionItem.find({ inspectionId }).sort({ createdAt: 1 });
  const evidence = await InspectionEvidence.find({ inspectionId }).sort({ uploadedAt: -1 });
  const meters = await MeterReading.find({ inspectionId }).sort({ createdAt: 1 });
  const accessItems = await AccessItem.find({ inspectionId }).sort({ createdAt: 1 });

  const itemsJson = items.map((i) => i.toJSON());
  const rooms = groupItemsByRoom(itemsJson);

  const completedItems = itemsJson.filter(isItemComplete).length;

  let baseline = null;
  if (inspection.type === 'MOVE_OUT') {
    const moveIn = await Inspection.findOne({
      tenancyId: inspection.tenancyId,
      type: 'MOVE_IN',
      status: 'LOCKED',
    });
    if (moveIn) {
      const moveInItems = await InspectionItem.find({ inspectionId: moveIn._id });
      const moveInEvidence = await InspectionEvidence.find({ inspectionId: moveIn._id });
      const baselineMap = new Map(moveInItems.map((i) => [itemMatchKey(i), i.toJSON()]));
      const evidenceByItem = new Map();
      for (const ev of moveInEvidence) {
        const key = ev.inspectionItemId.toString();
        if (!evidenceByItem.has(key)) evidenceByItem.set(key, []);
        evidenceByItem.get(key).push(ev.toJSON());
      }
      baseline = {
        items: moveInItems.map((i) => i.toJSON()),
        itemsByKey: Object.fromEntries(baselineMap),
        evidenceByItem: Object.fromEntries(evidenceByItem),
      };
    }
  }

  return {
    inspection: inspection.toJSON(),
    items: itemsJson,
    rooms,
    evidence: evidence.map((e) => e.toJSON()),
    meters: meters.map((m) => m.toJSON()),
    accessItems: accessItems.map((a) => a.toJSON()),
    baseline,
    progress: {
      totalItems: itemsJson.length,
      completedItems,
      percent: itemsJson.length ? Math.round((completedItems / itemsJson.length) * 100) : 0,
      totalRooms: rooms.length,
      evidenceCount: evidence.length,
      meterCount: meters.length,
      accessItemCount: accessItems.length,
    },
  };
}

export async function updateInspection(user, inspectionId, payload) {
  const inspection = await getInspectionForUser(user, inspectionId);

  if (!canEditInspection(inspection)) {
    throw new ApiError(400, 'This inspection can no longer be edited');
  }

  if (payload.currentStepIndex !== undefined) {
    inspection.currentStepIndex = payload.currentStepIndex;
  }
  if (payload.status !== undefined) {
    inspection.status = payload.status;
  }

  await inspection.save();
  return getInspectionDetail(user, inspectionId);
}

export async function updateInspectionItem(user, itemId, payload) {
  const item = await InspectionItem.findById(itemId);
  if (!item) throw new ApiError(404, 'Inspection item not found');

  const inspection = await getInspectionForUser(user, item.inspectionId.toString());

  if (!canEditInspection(inspection)) {
    throw new ApiError(400, 'This inspection can no longer be edited');
  }

  if (payload.condition !== undefined) item.condition = payload.condition;
  if (payload.notes !== undefined) item.notes = payload.notes;
  if (payload.issueDescription !== undefined) item.issueDescription = payload.issueDescription;

  item.isCompleted = isItemComplete(item);
  if (item.isCompleted) {
    item.inspectedBy = user.id;
    item.inspectedAt = new Date();
  }

  await item.save();
  return item.toJSON();
}

export async function addEvidence(user, itemId, file, caption = '') {
  const item = await InspectionItem.findById(itemId);
  if (!item) throw new ApiError(404, 'Inspection item not found');

  const inspection = await getInspectionForUser(user, item.inspectionId.toString());

  if (!canEditInspection(inspection)) {
    throw new ApiError(400, 'This inspection can no longer be edited');
  }

  if (!file) throw new ApiError(400, 'Image file is required');

  const evidence = await InspectionEvidence.create({
    inspectionId: inspection._id,
    inspectionItemId: item._id,
    roomId: item.roomId,
    uploadedBy: user.id,
    imageUrl: toPublicImageUrl(file.filename),
    storageKey: file.filename,
    caption: caption || '',
    uploadedAt: new Date(),
  });

  return evidence.toJSON();
}

export async function deleteEvidence(user, evidenceId) {
  const evidence = await InspectionEvidence.findById(evidenceId);
  if (!evidence) throw new ApiError(404, 'Evidence not found');

  await getInspectionForUser(user, evidence.inspectionId.toString());

  const filePath = resolveStoredFile(evidence.imageUrl);
  await evidence.deleteOne();

  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  }

  return true;
}

export async function addMeterReading(user, inspectionId, payload) {
  const inspection = await getInspectionForUser(user, inspectionId);

  if (!canEditInspection(inspection)) {
    throw new ApiError(400, 'This inspection can no longer be edited');
  }

  const meter = await MeterReading.create({
    inspectionId: inspection._id,
    tenancyId: inspection.tenancyId,
    propertyId: inspection.propertyId,
    type: payload.type,
    customTypeName: payload.customTypeName || '',
    reading: payload.reading,
    unit: payload.unit || '',
    meterNumber: payload.meterNumber || '',
    notes: payload.notes || '',
    recordedBy: user.id,
    recordedAt: new Date(),
  });

  return meter.toJSON();
}

export async function updateMeterReading(user, meterId, payload, file) {
  const meter = await MeterReading.findById(meterId);
  if (!meter) throw new ApiError(404, 'Meter reading not found');

  const inspection = await getInspectionForUser(user, meter.inspectionId.toString());

  if (!canEditInspection(inspection)) {
    throw new ApiError(400, 'This inspection can no longer be edited');
  }

  if (payload.type !== undefined) meter.type = payload.type;
  if (payload.customTypeName !== undefined) meter.customTypeName = payload.customTypeName;
  if (payload.reading !== undefined) meter.reading = payload.reading;
  if (payload.unit !== undefined) meter.unit = payload.unit;
  if (payload.meterNumber !== undefined) meter.meterNumber = payload.meterNumber;
  if (payload.notes !== undefined) meter.notes = payload.notes;

  if (file) {
    if (meter.imageUrl) {
      const oldPath = resolveStoredFile(meter.imageUrl);
      if (oldPath && fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          // ignore
        }
      }
    }
    meter.imageUrl = toPublicImageUrl(file.filename);
  }

  await meter.save();
  return meter.toJSON();
}

export async function deleteMeterReading(user, meterId) {
  const meter = await MeterReading.findById(meterId);
  if (!meter) throw new ApiError(404, 'Meter reading not found');

  await getInspectionForUser(user, meter.inspectionId.toString());

  if (meter.imageUrl) {
    const filePath = resolveStoredFile(meter.imageUrl);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
    }
  }

  await meter.deleteOne();
  return true;
}

export async function addAccessItem(user, inspectionId, payload) {
  const inspection = await getInspectionForUser(user, inspectionId);

  if (!canEditInspection(inspection)) {
    throw new ApiError(400, 'This inspection can no longer be edited');
  }

  const item = await AccessItem.create({
    inspectionId: inspection._id,
    tenancyId: inspection.tenancyId,
    propertyId: inspection.propertyId,
    name: payload.name,
    quantity: payload.quantity,
    notes: payload.notes || '',
    recordedBy: user.id,
  });

  return item.toJSON();
}

export async function updateAccessItem(user, itemId, payload) {
  const item = await AccessItem.findById(itemId);
  if (!item) throw new ApiError(404, 'Access item not found');

  const inspection = await getInspectionForUser(user, item.inspectionId.toString());

  if (!canEditInspection(inspection)) {
    throw new ApiError(400, 'This inspection can no longer be edited');
  }

  if (payload.name !== undefined) item.name = payload.name;
  if (payload.quantity !== undefined) item.quantity = payload.quantity;
  if (payload.notes !== undefined) item.notes = payload.notes;

  await item.save();
  return item.toJSON();
}

export async function deleteAccessItem(user, itemId) {
  const item = await AccessItem.findById(itemId);
  if (!item) throw new ApiError(404, 'Access item not found');

  await getInspectionForUser(user, item.inspectionId.toString());
  await item.deleteOne();
  return true;
}

export async function getInspectionReview(user, inspectionId) {
  const detail = await getInspectionDetail(user, inspectionId);
  const issues = detail.items.filter(
    (item) => item.condition && ['FAIR', 'DAMAGED', 'MISSING'].includes(item.condition),
  );

  const incomplete = detail.items.filter((item) => !isItemComplete(item));

  const roomCompletion = detail.rooms.map((room) => {
    const roomItems = room.items;
    const done = roomItems.filter(isItemComplete).length;
    return {
      roomId: room.roomId,
      roomName: room.roomName,
      total: roomItems.length,
      completed: done,
      isComplete: done === roomItems.length && roomItems.length > 0,
    };
  });

  return {
    ...detail,
    issues,
    incomplete,
    roomCompletion,
    canSubmit: incomplete.length === 0 && detail.items.length > 0,
  };
}

export async function submitInspection(user, inspectionId) {
  const review = await getInspectionReview(user, inspectionId);

  if (!review.canSubmit) {
    throw new ApiError(400, 'Please complete all required inspection items before submitting', {
      incomplete: `${review.incomplete.length} item(s) need attention`,
    });
  }

  const inspection = await Inspection.findById(inspectionId);
  inspection.status =
    inspection.type === 'MOVE_OUT' ? 'COMPLETED' : 'APPROVAL_PENDING';
  inspection.submittedBy = user.id;
  inspection.submittedAt = new Date();
  if (inspection.type === 'MOVE_OUT') {
    inspection.completedAt = new Date();
  }
  await inspection.save();

  return getInspectionDetail(user, inspectionId);
}

export async function approveInspection(user, inspectionId) {
  const inspection = await getInspectionForUser(user, inspectionId);

  if (inspection.type !== 'MOVE_IN') {
    throw new ApiError(400, 'Only move-in inspections require mutual approval');
  }

  if (inspection.status !== 'APPROVAL_PENDING') {
    throw new ApiError(400, 'This inspection is not awaiting approval');
  }

  if (user.role === 'OWNER') {
    if (inspection.ownerId.toString() !== user.id) {
      throw new ApiError(403, 'You do not have permission to approve this inspection');
    }
    if (inspection.ownerApproved) {
      throw new ApiError(400, 'Owner has already approved this inspection');
    }
    inspection.ownerApproved = true;
    inspection.ownerApprovedAt = new Date();
    inspection.ownerApprovedBy = user.id;
  } else if (user.role === 'TENANT') {
    const access = await getTenantAccessForUser(user.id);
    if (!access || access.status !== 'ACTIVE') {
      throw new ApiError(403, 'Tenant access is not active');
    }
    if (!inspection.tenantId || inspection.tenantId.toString() !== user.id) {
      throw new ApiError(403, 'You do not have permission to approve this inspection');
    }
    if (inspection.tenantApproved) {
      throw new ApiError(400, 'Tenant has already approved this inspection');
    }
    inspection.tenantApproved = true;
    inspection.tenantApprovedAt = new Date();
    inspection.tenantApprovedBy = user.id;
  } else {
    throw new ApiError(403, 'You do not have permission to approve this inspection');
  }

  if (inspection.ownerApproved && inspection.tenantApproved) {
    inspection.status = 'LOCKED';
    inspection.lockedAt = new Date();
    inspection.completedAt = new Date();

    const tenancy = await Tenancy.findById(inspection.tenancyId);
    if (tenancy) {
      tenancy.stage = 'active';
      tenancy.status = 'Active';
      tenancy.occupancyStatus = 'CURRENTLY_STAYING';
      await tenancy.save();
    }
  }

  await inspection.save();
  return getInspectionDetail(user, inspectionId);
}

export async function listInspectionsForUser(user) {
  let query = {};
  if (user.role === 'OWNER') {
    query = { ownerId: user.id };
  } else {
    query = { tenantId: user.id };
  }

  const inspections = await Inspection.find(query).sort({ updatedAt: -1 });
  return inspections.map((doc) => doc.toJSON());
}
