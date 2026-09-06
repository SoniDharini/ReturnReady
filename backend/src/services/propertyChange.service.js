import fs from 'fs';
import path from 'path';
import { Property } from '../models/Property.js';
import { PropertyChangeRequest } from '../models/PropertyChangeRequest.js';
import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';
import { createNotification } from './notification.service.js';
import { getTenancyForUser } from './settlementHelpers.js';
import { getTenantAccessForUser } from './tenancy.service.js';
import { UPLOADS_ROOT } from '../middleware/upload.middleware.js';

const CHANGE_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'change-requests');
fs.mkdirSync(CHANGE_UPLOADS_DIR, { recursive: true });

export function saveChangeEvidence(prefix, dataUrl) {
  if (!dataUrl?.startsWith('data:image/')) return null;
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
  fs.writeFileSync(path.join(CHANGE_UPLOADS_DIR, filename), buffer);
  return `/uploads/change-requests/${filename}`;
}

function saveDataUrl(prefix, dataUrl) {
  return saveChangeEvidence(prefix, dataUrl);
}

function assertActiveTenant(tenancy) {
  if (tenancy.stage === 'complete' || tenancy.status === 'Completed') {
    throw new ApiError(403, 'Tenant access is closed for this tenancy');
  }
}

export async function validateChangeRequestAccess(user, tenancyOrRequest) {
  const tenancyId = tenancyOrRequest.tenancyId || tenancyOrRequest._id;
  const tenancy = await getTenancyForUser(user, tenancyId.toString());
  if (user.role === 'TENANT') {
    const access = await getTenantAccessForUser(user.id);
    if (!access || access.status !== 'ACTIVE') {
      throw new ApiError(403, 'Tenant access is closed for this tenancy');
    }
    if (tenancy.tenantUserId?.toString() !== user.id) {
      throw new ApiError(403, 'Unauthorized Tenant');
    }
  }
  if (user.role === 'OWNER' && tenancy.ownerId?.toString() !== user.id) {
    throw new ApiError(403, 'Unauthorized Owner');
  }
  return tenancy;
}

function canRequestChanges(tenancy) {
  return ['active', 'move-out', 'settlement'].includes(tenancy.stage);
}

function propertyRooms(property) {
  return (property?.roomList || []).map((room) => ({
    id: room._id?.toString?.() || room.id,
    name: room.name,
    type: room.type,
  }));
}

export async function listChangeRequests(user, tenancyId) {
  const tenancy = await getTenancyForUser(user, tenancyId);
  const property = await Property.findById(tenancy.propertyId);
  const requests = await PropertyChangeRequest.find({ tenancyId }).sort({ createdAt: -1 });
  return {
    requests: requests.map((r) => r.toJSON()),
    rooms: propertyRooms(property),
    tenancy: {
      id: tenancy._id.toString(),
      propertyName: tenancy.propertyName,
      tenantName: tenancy.tenantName,
      ownerName: tenancy.ownerName,
      stage: tenancy.stage,
    },
  };
}

function withTenancyContext(request, tenancy) {
  return {
    ...request.toJSON(),
    propertyName: tenancy?.propertyName || '',
    tenantName: tenancy?.tenantName || '',
    ownerName: tenancy?.ownerName || '',
  };
}

export async function listPendingChangeRequestsForOwner(user) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can list pending requests');
  const requests = await PropertyChangeRequest.find({
    ownerId: user.id,
    status: 'PENDING',
  }).sort({ requestedAt: -1 });
  const tenancyIds = [...new Set(requests.map((r) => r.tenancyId.toString()))];
  const tenancies = await Tenancy.find({ _id: { $in: tenancyIds } });
  const tenancyMap = new Map(tenancies.map((t) => [t._id.toString(), t]));
  return requests.map((r) => withTenancyContext(r, tenancyMap.get(r.tenancyId.toString())));
}

export async function getChangeRequest(user, requestId) {
  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');
  const tenancy = await getTenancyForUser(user, request.tenancyId.toString());
  return withTenancyContext(request, tenancy);
}

export async function createChangeRequest(user, tenancyId, payload) {
  if (user.role !== 'TENANT') {
    throw new ApiError(403, 'Only tenants can request property changes');
  }

  const tenancy = await Tenancy.findOne({
    _id: tenancyId,
    tenantUserId: user.id,
    inviteStatus: 'Accepted',
  });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  assertActiveTenant(tenancy);

  if (!canRequestChanges(tenancy)) {
    throw new ApiError(400, 'Property change requests are available after Move-In is complete');
  }

  const property = await Property.findById(tenancy.propertyId);
  const room = (property?.roomList || []).find(
    (item) => (item._id?.toString?.() || item.id) === payload.roomId,
  );
  if (payload.roomId && property?.roomList?.length && !room) {
    throw new ApiError(400, 'Invalid room');
  }
  if (payload.inventoryItemId) {
    const foundItem = (property?.roomList || []).some((item) =>
      (item.items || []).some(
        (inventory) => (inventory._id?.toString?.() || inventory.id) === payload.inventoryItemId,
      ),
    );
    if (!foundItem) throw new ApiError(400, 'Invalid inventory item');
  }

  const evidenceUrl = saveDataUrl('request', payload.evidenceDataUrl);
  const request = await PropertyChangeRequest.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId,
    tenantId: user.id,
    ownerId: tenancy.ownerId,
    roomId: payload.roomId || '',
    roomName: room?.name || payload.roomName || '',
    inventoryItemId: payload.inventoryItemId || '',
    changeType: payload.changeType || 'OTHER',
    title: payload.title.trim(),
    description: payload.description || '',
    reason: payload.reason || '',
    requestedAction: payload.requestedAction || payload.title,
    beforeState: payload.beforeState || '',
    requestedState: payload.requestedState || '',
    evidence: evidenceUrl
      ? [{ fileUrl: evidenceUrl, storageKey: evidenceUrl, uploadedBy: user.id }]
      : [],
    status: 'PENDING',
    timeline: [
      {
        action: 'REQUESTED',
        note: payload.title.trim(),
        actorRole: 'TENANT',
        at: new Date(),
      },
    ],
  });

  await createNotification({
    userId: tenancy.ownerId,
    tenancyId: tenancy._id,
    type: 'PROPERTY_CHANGE_REQUESTED',
    title: 'Property Change Approval Required',
    message: `${tenancy.tenantName} requested approval to ${request.title}${
      request.roomName ? ` in ${request.roomName}` : ''
    }.`,
  });

  const { appendSystemMessage } = await import('./propertyChangeChat.service.js');
  await appendSystemMessage({
    tenancy,
    senderId: user.id,
    senderRole: 'TENANT',
    senderName: tenancy.tenantName,
    messageType: 'APPROVAL_REQUEST',
    text: request.description || request.title,
    changeRequestId: request._id,
  });

  return request.toJSON();
}

export async function approveChangeRequest(user, requestId, payload = {}) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can approve change requests');

  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');

  const tenancy = await Tenancy.findOne({ _id: request.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');
  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Only pending requests can be approved');
  }

  const hasConditions = Boolean((payload.ownerConditions || '').trim());
  request.reviewedBy = user.id;
  request.approvedBy = user.id;
  request.reviewedAt = new Date();
  request.ownerNotes = payload.ownerNotes || '';
  request.ownerConditions = payload.ownerConditions || '';
  request.status = hasConditions ? 'APPROVED_PENDING_TENANT_ACCEPTANCE' : 'APPROVED';
  request.tenantConditionsAccepted = !hasConditions;
  request.authorizedAt = hasConditions ? null : new Date();
  request.ownerResponse = hasConditions
    ? `Approved with conditions: ${payload.ownerConditions}`
    : 'Approved';
  request.timeline.push({
    action: hasConditions ? 'CONDITIONALLY_APPROVED' : 'APPROVED',
    note: payload.ownerConditions || payload.ownerNotes || 'Approved',
    actorRole: 'OWNER',
    at: new Date(),
  });
  await request.save();

  const { appendSystemMessage } = await import('./propertyChangeChat.service.js');
  await appendSystemMessage({
    tenancy,
    senderId: user.id,
    senderRole: 'OWNER',
    senderName: tenancy.ownerName,
    messageType: hasConditions ? 'CONDITION_PROPOSED' : 'APPROVAL_GRANTED',
    text: hasConditions
      ? payload.ownerConditions
      : `${tenancy.ownerName} approved this property change.`,
    changeRequestId: request._id,
  });
  if (!hasConditions) {
    await appendSystemMessage({
      tenancy,
      senderId: user.id,
      senderRole: 'OWNER',
      senderName: tenancy.ownerName,
      messageType: 'CHANGE_AUTHORIZED',
      text: 'This property change is now authorized.',
      changeRequestId: request._id,
    });
  }

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'PROPERTY_CHANGE_APPROVED',
      title: hasConditions ? 'Action Required' : 'Property Change Approved',
      message: hasConditions
        ? `Your property change was conditionally approved. Review and accept the Owner's conditions.`
        : 'You may proceed with the approved change.',
    });
  }

  return request.toJSON();
}

export async function rejectChangeRequest(user, requestId, payload = {}) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can reject change requests');

  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');

  const tenancy = await Tenancy.findOne({ _id: request.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');
  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Only pending requests can be rejected');
  }

  const reason = (payload.reason || payload.ownerNotes || '').trim();
  if (!reason) {
    throw new ApiError(400, 'A rejection reason is required');
  }
  request.status = 'REJECTED';
  request.reviewedBy = user.id;
  request.rejectedBy = user.id;
  request.reviewedAt = new Date();
  request.ownerNotes = reason;
  request.ownerResponse = reason || 'Not approved';
  request.timeline.push({
    action: 'REJECTED',
    note: reason || 'Not approved',
    actorRole: 'OWNER',
    at: new Date(),
  });
  await request.save();

  const { appendSystemMessage } = await import('./propertyChangeChat.service.js');
  await appendSystemMessage({
    tenancy,
    senderId: user.id,
    senderRole: 'OWNER',
    senderName: tenancy.ownerName,
    messageType: 'APPROVAL_REJECTED',
    text: reason,
    changeRequestId: request._id,
  });

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'PROPERTY_CHANGE_REJECTED',
      title: 'Property Change Rejected',
      message: `Your request was not approved. Reason: ${reason}`,
    });
  }

  return request.toJSON();
}

export async function acceptOwnerConditions(user, requestId) {
  if (user.role !== 'TENANT') {
    throw new ApiError(403, 'Only tenants can accept owner conditions');
  }

  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');

  const tenancy = await Tenancy.findOne({
    _id: request.tenancyId,
    tenantUserId: user.id,
    inviteStatus: 'Accepted',
  });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');
  assertActiveTenant(tenancy);

  if (request.status === 'REJECTED') {
    throw new ApiError(400, 'Rejected request cannot be authorized');
  }
  if (request.status !== 'APPROVED_PENDING_TENANT_ACCEPTANCE') {
    throw new ApiError(400, 'This request is not waiting for condition acceptance');
  }

  request.tenantConditionsAccepted = true;
  request.tenantConditionsAcceptedAt = new Date();
  request.authorizedAt = new Date();
  request.status = 'APPROVED';
  request.timeline.push({
    action: 'CONDITIONS_ACCEPTED',
    note: 'Tenant accepted owner conditions',
    actorRole: 'TENANT',
    at: new Date(),
  });
  await request.save();

  const { appendSystemMessage } = await import('./propertyChangeChat.service.js');
  await appendSystemMessage({
    tenancy,
    senderId: user.id,
    senderRole: 'TENANT',
    senderName: tenancy.tenantName,
    messageType: 'CONDITION_ACCEPTED',
    text: `${tenancy.tenantName} accepted the Owner's conditions.`,
    changeRequestId: request._id,
  });
  await appendSystemMessage({
    tenancy,
    senderId: user.id,
    senderRole: 'TENANT',
    senderName: tenancy.tenantName,
    messageType: 'CHANGE_AUTHORIZED',
    text: 'This property change is now authorized.',
    changeRequestId: request._id,
  });

  await createNotification({
    userId: tenancy.ownerId,
    tenancyId: tenancy._id,
    type: 'PROPERTY_CHANGE_CONDITIONS_ACCEPTED',
    title: 'Conditions Accepted',
    message: `${tenancy.tenantName} accepted the conditions for the approved property change.`,
  });

  return request.toJSON();
}

export async function completeChangeRequest(user, requestId, payload = {}) {
  if (user.role !== 'TENANT') {
    throw new ApiError(403, 'Only tenants can mark an approved change as complete');
  }

  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');

  const tenancy = await Tenancy.findOne({
    _id: request.tenancyId,
    tenantUserId: user.id,
    inviteStatus: 'Accepted',
  });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');
  assertActiveTenant(tenancy);

  if (request.status === 'REJECTED') {
    throw new ApiError(400, 'Rejected request cannot be completed');
  }
  if (request.status !== 'APPROVED') {
    throw new ApiError(400, 'Only approved requests can be marked complete');
  }

  const evidenceUrl = saveDataUrl('complete', payload.evidenceDataUrl);
  request.status = 'COMPLETED';
  request.completedAt = new Date();
  if (evidenceUrl) {
    request.completionEvidence.push({
      fileUrl: evidenceUrl,
      storageKey: evidenceUrl,
      uploadedBy: user.id,
    });
  }
  request.timeline.push({
    action: 'COMPLETED',
    note: payload.note || 'Change marked complete',
    actorRole: 'TENANT',
    at: new Date(),
  });
  await request.save();

  const { appendSystemMessage } = await import('./propertyChangeChat.service.js');
  await appendSystemMessage({
    tenancy,
    senderId: user.id,
    senderRole: 'TENANT',
    senderName: tenancy.tenantName,
    messageType: 'CHANGE_COMPLETED',
    text: payload.note || `${tenancy.tenantName} marked the approved property change as completed.`,
    changeRequestId: request._id,
    attachments: evidenceUrl
      ? [{ fileUrl: evidenceUrl, storageKey: evidenceUrl, uploadedBy: user.id, uploadedAt: new Date() }]
      : [],
  });

  await createNotification({
    userId: tenancy.ownerId,
    tenancyId: tenancy._id,
    type: 'PROPERTY_CHANGE_COMPLETED',
    title: 'Approved Property Change Completed',
    message: `${tenancy.tenantName} marked ${request.title} as completed.`,
  });

  return request.toJSON();
}

export async function cancelChangeRequest(user, requestId) {
  if (user.role !== 'TENANT') {
    throw new ApiError(403, 'Only tenants can cancel their change requests');
  }

  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');

  const tenancy = await Tenancy.findOne({
    _id: request.tenancyId,
    tenantUserId: user.id,
    inviteStatus: 'Accepted',
  });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');
  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Only pending requests can be cancelled');
  }

  request.status = 'CANCELLED';
  request.timeline.push({
    action: 'CANCELLED',
    note: 'Cancelled by tenant',
    actorRole: 'TENANT',
    at: new Date(),
  });
  await request.save();
  return request.toJSON();
}

export const getChangeRequests = listChangeRequests;
export const getChangeRequestById = getChangeRequest;
export const completeApprovedChange = completeChangeRequest;

export async function getApprovedChangesForMoveOut(user, tenancyId) {
  await validateChangeRequestAccess(user, { tenancyId });
  const requests = await PropertyChangeRequest.find({
    tenancyId,
    status: { $in: ['APPROVED', 'COMPLETED'] },
  }).sort({ reviewedAt: 1 });
  return requests.map((r) => r.toJSON());
}

export async function reviewChangeCompliance(user, requestId, payload = {}) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can review change compliance');
  }
  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');
  const tenancy = await Tenancy.findOne({ _id: request.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'Unauthorized Owner');
  if (!['APPROVED', 'COMPLETED'].includes(request.status)) {
    throw new ApiError(400, 'Only approved changes can be reviewed for compliance');
  }

  request.complianceStatus = payload.complianceStatus;
  request.complianceNotes = payload.complianceNotes || '';
  request.complianceReviewedBy = user.id;
  request.complianceReviewedAt = new Date();
  if (payload.moveOutInspectionId) request.moveOutInspectionId = payload.moveOutInspectionId;
  if (payload.evidenceDataUrl) {
    const fileUrl = saveDataUrl('compliance', payload.evidenceDataUrl);
    if (fileUrl) {
      request.complianceEvidence.push({
        fileUrl,
        storageKey: fileUrl,
        uploadedBy: user.id,
      });
    }
  }
  await request.save();
  return request.toJSON();
}
