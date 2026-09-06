import fs from 'fs';
import path from 'path';
import { Property } from '../models/Property.js';
import { PropertyChangeMessage } from '../models/PropertyChangeMessage.js';
import { PropertyChangeRequest } from '../models/PropertyChangeRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { UPLOADS_ROOT } from '../middleware/upload.middleware.js';
import { getTenancyForUser } from './settlementHelpers.js';
import { getTenantAccessForUser } from './tenancy.service.js';

const CHAT_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'change-requests');
fs.mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });

function saveChatAttachment(dataUrl) {
  if (!dataUrl?.startsWith('data:image/')) return null;
  const mime = dataUrl.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const filename = `chat-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
  fs.writeFileSync(path.join(CHAT_UPLOADS_DIR, filename), buffer);
  return {
    fileUrl: `/uploads/change-requests/${filename}`,
    storageKey: `/uploads/change-requests/${filename}`,
    mimeType: mime,
  };
}

export async function appendSystemMessage({
  tenancy,
  senderId,
  senderRole,
  senderName,
  messageType,
  text,
  changeRequestId,
  attachments = [],
}) {
  const message = await PropertyChangeMessage.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId,
    senderId: senderId || null,
    senderRole: senderRole || 'SYSTEM',
    senderName: senderName || '',
    messageType,
    text: text || '',
    changeRequestId: changeRequestId || null,
    attachments,
    isImmutable: true,
  });
  return message.toJSON();
}

export async function getPropertyChangeChat(user, tenancyId) {
  const tenancy = await getTenancyForUser(user, tenancyId);
  const property = await Property.findById(tenancy.propertyId);
  const [messages, requests] = await Promise.all([
    PropertyChangeMessage.find({ tenancyId }).sort({ createdAt: 1 }),
    PropertyChangeRequest.find({ tenancyId }).sort({ createdAt: 1 }),
  ]);
  const requestMap = new Map(requests.map((r) => [r._id.toString(), r.toJSON()]));

  return {
    tenancy: {
      id: tenancy._id.toString(),
      propertyName: tenancy.propertyName,
      tenantName: tenancy.tenantName,
      ownerName: tenancy.ownerName,
      stage: tenancy.stage,
    },
    rooms: (property?.roomList || []).map((room) => ({
      id: room._id?.toString?.() || room.id,
      name: room.name,
    })),
    messages: messages.map((message) => ({
      ...message.toJSON(),
      request: message.changeRequestId
        ? requestMap.get(message.changeRequestId.toString()) || null
        : null,
    })),
    requests: requests.map((r) => r.toJSON()),
  };
}

export async function sendPropertyChangeMessage(user, tenancyId, payload = {}) {
  const tenancy = await getTenancyForUser(user, tenancyId);
  if (user.role === 'TENANT') {
    const access = await getTenantAccessForUser(user.id);
    if (!access || access.status !== 'ACTIVE') {
      throw new ApiError(403, 'Tenant access is closed for this tenancy');
    }
  }
  if (tenancy.stage === 'complete' || tenancy.status === 'Completed') {
    throw new ApiError(403, 'This conversation is closed for new messages');
  }

  const text = (payload.text || '').trim();
  const attachment = payload.evidenceDataUrl ? saveChatAttachment(payload.evidenceDataUrl) : null;
  if (!text && !attachment) {
    throw new ApiError(400, 'Enter a message or attach a photo.');
  }

  const senderName = user.role === 'OWNER' ? tenancy.ownerName : tenancy.tenantName;
  const message = await PropertyChangeMessage.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId,
    senderId: user.id,
    senderRole: user.role,
    senderName,
    messageType: attachment && !text ? 'IMAGE' : 'TEXT',
    text,
    attachments: attachment
      ? [{ ...attachment, uploadedBy: user.id, uploadedAt: new Date() }]
      : [],
    isImmutable: true,
  });

  return message.toJSON();
}
