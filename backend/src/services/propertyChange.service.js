import fs from 'fs';
import path from 'path';
import { Property } from '../models/Property.js';
import {
  AUTHORIZED_CHANGE_STATUSES,
  isAwaitingTenantAcceptance,
  isAuthorizedChangeStatus,
  PropertyChangeRequest,
} from '../models/PropertyChangeRequest.js';
import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';
import { createNotification } from './notification.service.js';
import { getTenancyForUser } from './settlementHelpers.js';
import { getTenantAccessForUser } from './tenancy.service.js';
import { appendSystemMessage } from './propertyChangeChat.service.js';
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

function normalizeItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (typeof item === 'string') {
        return { text: item.trim(), details: '' };
      }
      return {
        text: String(item?.text || '').trim(),
        details: String(item?.details || '').trim(),
      };
    })
    .filter((item) => item.text.length >= 2);
}

function syncOwnerConditionsText(request) {
  const items = request.ownerConditionItems || [];
  request.ownerConditions = items
    .map((item) => item.text)
    .filter(Boolean)
    .join('\n');
}

function withTenancyContext(request, tenancy) {
  return {
    ...request.toJSON(),
    propertyName: tenancy?.propertyName || '',
    tenantName: tenancy?.tenantName || '',
    ownerName: tenancy?.ownerName || '',
  };
}

function pushTimeline(request, action, note, actorRole) {
  request.timeline.push({
    action,
    note: note || '',
    actorRole,
    at: new Date(),
  });
}

function extractOwnerConditionItems(payload = {}) {
  let items = normalizeItems(payload.ownerConditionItems || payload.conditions);
  if (!items.length && (payload.ownerConditions || '').trim()) {
    items = String(payload.ownerConditions)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text, details: '' }));
  }
  return items;
}

async function recordChatEvent(tenancy, {
  senderId,
  senderRole,
  senderName,
  messageType,
  text,
  changeRequestId,
}) {
  try {
    await appendSystemMessage({
      tenancy,
      senderId,
      senderRole,
      senderName,
      messageType,
      text,
      changeRequestId,
    });
  } catch {
    // Chat timeline is best-effort; request workflow must not fail if chat write fails.
  }
}

async function authorizeRequest(request, user, note = 'Owner authorized the property change') {
  const now = new Date();
  request.status = 'AUTHORIZED';
  request.finalApprovedBy = user.id;
  request.finalApprovedAt = now;
  request.approvedBy = user.id;
  request.authorizedAt = now;
  request.reviewedBy = request.reviewedBy || user.id;
  request.reviewedAt = request.reviewedAt || now;
  request.ownerResponse = note;
  pushTimeline(request, 'FINAL_APPROVED', note, 'OWNER');
  await request.save();
  return request;
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

export async function listPendingChangeRequestsForOwner(user) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can list pending requests');
  const requests = await PropertyChangeRequest.find({
    ownerId: user.id,
    status: { $in: ['PENDING', 'AWAITING_OWNER_FINAL_APPROVAL'] },
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
  let room = (property?.roomList || []).find(
    (item) => (item._id?.toString?.() || item.id) === payload.roomId,
  );
  if (!room && payload.roomName === 'Other') {
    room = { name: 'Other' };
  }
  if (payload.roomId && property?.roomList?.length && !room && payload.roomName !== 'Other') {
    throw new ApiError(400, 'Invalid room');
  }

  const tenantCommitments = normalizeItems(payload.tenantCommitments);
  if (!tenantCommitments.length) {
    throw new ApiError(400, 'Add at least one commitment describing what you agree to do');
  }

  const evidenceUrls = [];
  if (payload.evidenceDataUrl) {
    const url = saveDataUrl('request', payload.evidenceDataUrl);
    if (url) evidenceUrls.push(url);
  }
  if (Array.isArray(payload.evidenceDataUrls)) {
    for (const dataUrl of payload.evidenceDataUrls) {
      const url = saveDataUrl('request', dataUrl);
      if (url) evidenceUrls.push(url);
    }
  }

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
    tenantCommitments,
    evidence: evidenceUrls.map((fileUrl) => ({
      fileUrl,
      storageKey: fileUrl,
      uploadedBy: user.id,
    })),
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
    title: 'Property Change Request',
    message: `${tenancy.tenantName} requested permission to ${request.title}${
      request.roomName ? ` in the ${request.roomName}` : ''
    }.`,
  });

  await recordChatEvent(tenancy, {
    senderId: user.id,
    senderRole: 'TENANT',
    senderName: tenancy.tenantName,
    messageType: 'APPROVAL_REQUEST',
    text: `Tenant requested permission to ${request.title}${
      request.roomName ? ` in the ${request.roomName}` : ''
    }.`,
    changeRequestId: request._id,
  });

  return withTenancyContext(request, tenancy);
}

/**
 * Owner proposes conditions (not final approval).
 * Tenant must explicitly accept these conditions before the change is authorized.
 */
export async function sendOwnerConditions(user, requestId, payload = {}) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can send conditions');

  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');

  const tenancy = await Tenancy.findOne({ _id: request.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');
  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Conditions can only be sent for requests awaiting owner review');
  }

  const items = extractOwnerConditionItems(payload);
  if (!items.length) {
    throw new ApiError(400, 'Add at least one owner condition before sending to the Tenant');
  }

  request.ownerConditionItems = items;
  syncOwnerConditionsText(request);
  request.ownerNotes = payload.ownerNotes || '';
  request.reviewedBy = user.id;
  request.reviewedAt = new Date();
  request.status = 'AWAITING_TENANT_ACCEPTANCE';
  request.tenantConditionsAccepted = false;
  request.tenantConditionsAcceptedAt = null;
  request.tenantConditionsAcceptedBy = null;
  request.authorizedAt = null;
  request.finalApprovedAt = null;
  request.finalApprovedBy = null;
  request.approvedBy = null;
  request.ownerResponse = `Approved with conditions (${items.length})`;
  pushTimeline(
    request,
    'CONDITIONS_PROPOSED',
    `Owner approved with ${items.length} condition(s)`,
    'OWNER',
  );
  await request.save();

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'PROPERTY_CHANGE_CONDITIONS_PROPOSED',
      title: 'Your property change request has been approved with conditions',
      message: `Please review and accept the Owner's conditions for "${request.title}" before the change is authorized.`,
    });
  }

  await recordChatEvent(tenancy, {
    senderId: user.id,
    senderRole: 'OWNER',
    senderName: tenancy.ownerName,
    messageType: 'CONDITION_PROPOSED',
    text: `Owner approved "${request.title}" with conditions:\n${items
      .map((item, index) => `${index + 1}. ${item.text}`)
      .join('\n')}`,
    changeRequestId: request._id,
  });

  return withTenancyContext(request, tenancy);
}

/** Approve without additional owner conditions → immediately AUTHORIZED */
export async function approveWithoutConditions(user, requestId, payload = {}) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can approve change requests');

  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');

  const tenancy = await Tenancy.findOne({ _id: request.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');
  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Only pending requests can be approved directly');
  }

  request.ownerNotes = payload.ownerNotes || '';
  request.ownerConditionItems = [];
  request.ownerConditions = '';
  request.tenantConditionsAccepted = true;
  request.tenantConditionsAcceptedAt = new Date();
  pushTimeline(request, 'APPROVED_WITHOUT_CONDITIONS', 'Owner approved without extra conditions', 'OWNER');
  await authorizeRequest(request, user, 'Owner approved without additional conditions');

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'PROPERTY_CHANGE_AUTHORIZED',
      title: 'Property Change Approved',
      message: `Your request "${request.title}"${
        request.roomName ? ` in the ${request.roomName}` : ''
      } was approved. You may proceed.`,
    });
  }

  await recordChatEvent(tenancy, {
    senderId: user.id,
    senderRole: 'OWNER',
    senderName: tenancy.ownerName,
    messageType: 'APPROVAL_GRANTED',
    text: `Owner approved "${request.title}" without additional conditions.`,
    changeRequestId: request._id,
  });

  return withTenancyContext(request, tenancy);
}

/**
 * Owner decision entrypoint:
 * - with conditions → AWAITING_TENANT_ACCEPTANCE
 * - without conditions → AUTHORIZED
 */
export async function approveChangeRequest(user, requestId, payload = {}) {
  const items = extractOwnerConditionItems(payload);
  if (items.length) {
    return sendOwnerConditions(user, requestId, payload);
  }
  return approveWithoutConditions(user, requestId, payload);
}

export async function rejectChangeRequest(user, requestId, payload = {}) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can reject change requests');

  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');

  const tenancy = await Tenancy.findOne({ _id: request.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');

  const rejectable = ['PENDING', 'AWAITING_OWNER_FINAL_APPROVAL'];
  if (!rejectable.includes(request.status)) {
    throw new ApiError(400, 'This request cannot be rejected in its current status');
  }

  const reason = (payload.reason || payload.ownerNotes || '').trim();
  if (!reason) {
    throw new ApiError(400, 'A rejection reason is required');
  }

  request.status = 'REJECTED';
  request.reviewedBy = user.id;
  request.rejectedBy = user.id;
  request.reviewedAt = new Date();
  request.rejectionReason = reason;
  request.ownerNotes = reason;
  request.ownerResponse = reason;
  pushTimeline(request, 'REJECTED', reason, 'OWNER');
  await request.save();

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'PROPERTY_CHANGE_REJECTED',
      title: 'Property Change Rejected',
      message: `Your property change request "${request.title}" has been rejected. Reason: ${reason}`,
    });
  }

  await recordChatEvent(tenancy, {
    senderId: user.id,
    senderRole: 'OWNER',
    senderName: tenancy.ownerName,
    messageType: 'APPROVAL_REJECTED',
    text: `Owner rejected "${request.title}". Reason: ${reason}`,
    changeRequestId: request._id,
  });

  return withTenancyContext(request, tenancy);
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

  if (request.status === 'REJECTED' || request.status === 'CONDITIONS_DECLINED') {
    throw new ApiError(400, 'This request can no longer be accepted');
  }
  if (!isAwaitingTenantAcceptance(request.status)) {
    throw new ApiError(400, 'This request is not waiting for condition acceptance');
  }

  request.tenantConditionsAccepted = true;
  request.tenantConditionsAcceptedAt = new Date();
  request.tenantConditionsAcceptedBy = user.id;
  pushTimeline(request, 'CONDITIONS_ACCEPTED', 'Tenant accepted all owner conditions', 'TENANT');

  // Owner already approved with conditions; Tenant acceptance completes the agreement.
  const now = new Date();
  request.status = 'AUTHORIZED';
  request.authorizedAt = now;
  request.finalApprovedAt = now;
  request.finalApprovedBy = request.reviewedBy || request.ownerId;
  request.approvedBy = request.reviewedBy || request.ownerId;
  request.ownerResponse = 'Final agreement recorded after Tenant accepted conditions';
  pushTimeline(request, 'FINAL_APPROVED', 'Owner approval + Tenant condition acceptance', 'TENANT');
  await request.save();

  await createNotification({
    userId: tenancy.ownerId,
    tenancyId: tenancy._id,
    type: 'PROPERTY_CHANGE_CONDITIONS_ACCEPTED',
    title: 'Conditions Accepted — Change Approved',
    message: `${tenancy.tenantName} accepted the conditions for "${request.title}". The property change is now officially approved.`,
  });

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'PROPERTY_CHANGE_AUTHORIZED',
      title: 'Property Change Officially Approved',
      message: `Your request "${request.title}"${
        request.roomName ? ` in the ${request.roomName}` : ''
      } is now approved. You may proceed according to the agreed conditions.`,
    });
  }

  await recordChatEvent(tenancy, {
    senderId: user.id,
    senderRole: 'TENANT',
    senderName: tenancy.tenantName,
    messageType: 'CONDITION_ACCEPTED',
    text: `Tenant accepted the Owner conditions for "${request.title}".`,
    changeRequestId: request._id,
  });
  await recordChatEvent(tenancy, {
    senderId: request.reviewedBy || tenancy.ownerId,
    senderRole: 'OWNER',
    senderName: tenancy.ownerName,
    messageType: 'CHANGE_AUTHORIZED',
    text: `Property change request "${request.title}" is officially approved.`,
    changeRequestId: request._id,
  });

  return withTenancyContext(request, tenancy);
}

export async function declineOwnerConditions(user, requestId, payload = {}) {
  if (user.role !== 'TENANT') {
    throw new ApiError(403, 'Only tenants can decline owner conditions');
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

  if (!isAwaitingTenantAcceptance(request.status)) {
    throw new ApiError(400, 'This request is not waiting for condition acceptance');
  }

  const note = (payload.reason || payload.note || '').trim();
  request.status = 'CONDITIONS_DECLINED';
  request.tenantConditionsAccepted = false;
  request.ownerResponse = note || 'Tenant declined owner conditions';
  pushTimeline(request, 'CONDITIONS_DECLINED', note || 'Tenant declined owner conditions', 'TENANT');
  await request.save();

  await createNotification({
    userId: tenancy.ownerId,
    tenancyId: tenancy._id,
    type: 'PROPERTY_CHANGE_CONDITIONS_DECLINED',
    title: 'Owner Conditions Declined',
    message: `${tenancy.tenantName} declined the conditions for "${request.title}". The change remains unauthorized.`,
  });

  await recordChatEvent(tenancy, {
    senderId: user.id,
    senderRole: 'TENANT',
    senderName: tenancy.tenantName,
    messageType: 'SYSTEM',
    text: `Tenant declined the Owner conditions for "${request.title}".${
      note ? ` Reason: ${note}` : ''
    }`,
    changeRequestId: request._id,
  });

  return withTenancyContext(request, tenancy);
}

export async function finalApproveChangeRequest(user, requestId) {
  if (user.role !== 'OWNER') {
    throw new ApiError(403, 'Only owners can give final approval');
  }

  const request = await PropertyChangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Change request not found');

  const tenancy = await Tenancy.findOne({ _id: request.tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(403, 'You do not have permission');

  if (isAuthorizedChangeStatus(request.status) && request.status !== 'COMPLETED') {
    return withTenancyContext(request, tenancy);
  }

  if (request.status !== 'AWAITING_OWNER_FINAL_APPROVAL') {
    throw new ApiError(400, 'Final approval is only available after the Tenant accepts conditions');
  }
  if (!request.tenantConditionsAccepted) {
    throw new ApiError(400, 'Tenant must accept owner conditions before final approval');
  }

  await authorizeRequest(request, user, 'Final approval granted');

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'PROPERTY_CHANGE_AUTHORIZED',
      title: 'Property Change Approved',
      message: `Your request to ${request.title}${
        request.roomName ? ` in the ${request.roomName}` : ''
      } has received final Owner approval. You may proceed according to the agreed conditions.`,
    });
  }

  await recordChatEvent(tenancy, {
    senderId: user.id,
    senderRole: 'OWNER',
    senderName: tenancy.ownerName,
    messageType: 'CHANGE_AUTHORIZED',
    text: `Owner gave final approval for "${request.title}".`,
    changeRequestId: request._id,
  });

  return withTenancyContext(request, tenancy);
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

  if (request.status !== 'AUTHORIZED' && request.status !== 'APPROVED') {
    throw new ApiError(400, 'Only authorized requests can be marked complete');
  }

  const evidenceUrl = saveDataUrl('complete', payload.evidenceDataUrl);
  request.status = 'COMPLETED';
  request.completedAt = new Date();
  request.completionNotes = payload.note || payload.completionNotes || '';
  if (evidenceUrl) {
    request.completionEvidence.push({
      fileUrl: evidenceUrl,
      storageKey: evidenceUrl,
      uploadedBy: user.id,
    });
  }
  pushTimeline(request, 'COMPLETED', request.completionNotes || 'Change marked complete', 'TENANT');
  await request.save();

  await createNotification({
    userId: tenancy.ownerId,
    tenancyId: tenancy._id,
    type: 'PROPERTY_CHANGE_COMPLETED',
    title: 'Property Change Completed',
    message: `${tenancy.tenantName} marked the approved ${request.title} as completed.`,
  });

  return withTenancyContext(request, tenancy);
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
  pushTimeline(request, 'CANCELLED', 'Cancelled by tenant', 'TENANT');
  await request.save();
  return withTenancyContext(request, tenancy);
}

export const getChangeRequests = listChangeRequests;
export const getChangeRequestById = getChangeRequest;
export const completeApprovedChange = completeChangeRequest;

export async function getApprovedChangesForMoveOut(user, tenancyId) {
  await validateChangeRequestAccess(user, { tenancyId });
  const requests = await PropertyChangeRequest.find({
    tenancyId,
    status: { $in: AUTHORIZED_CHANGE_STATUSES },
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
  if (!isAuthorizedChangeStatus(request.status)) {
    throw new ApiError(400, 'Only authorized changes can be reviewed for compliance');
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
  return withTenancyContext(request, tenancy);
}
