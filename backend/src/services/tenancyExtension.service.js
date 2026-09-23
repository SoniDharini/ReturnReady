import { Tenancy } from '../models/Tenancy.js';
import { TenancyExtensionRequest } from '../models/TenancyExtensionRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { getTenancyForUser } from './settlementHelpers.js';
import { getTenantAccessForUser } from './tenancy.service.js';
import { createNotification } from './notification.service.js';
import { withOptionalTransaction } from './propertyAvailability.service.js';
import {
  attachTenancyTimeline,
  canRequestExtension,
  formatCalendarDate,
  formatExtensionRequest,
  normalizeTenancyDate,
} from './tenancyDate.service.js';

function assertOwner(user, tenancy) {
  if (user.role !== 'OWNER' || tenancy.ownerId?.toString() !== user.id) {
    throw new ApiError(403, 'Only the property owner can review this request');
  }
}

function assertTenant(user, tenancy) {
  if (user.role !== 'TENANT' || tenancy.tenantUserId?.toString() !== user.id) {
    throw new ApiError(403, 'Only the assigned tenant can perform this action');
  }
}

async function requireTenancyAccess(user, tenancyId) {
  const tenancy = await getTenancyForUser(user, tenancyId);
  if (tenancy.stage === 'complete' || tenancy.status === 'Completed') {
    throw new ApiError(403, 'This tenancy is completed and is read-only');
  }
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

async function requireExtensionAccess(user, requestId) {
  const request = await TenancyExtensionRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Extension request not found');
  const tenancy = await requireTenancyAccess(user, request.tenancyId.toString());
  return { request, tenancy };
}

function validateRequestedDate(tenancy, requestedMoveOutDate) {
  const requested = normalizeTenancyDate(requestedMoveOutDate);
  const current = normalizeTenancyDate(tenancy.moveOut);
  const moveIn = normalizeTenancyDate(tenancy.moveIn);

  if (!requested) {
    throw new ApiError(400, 'Requested move-out date is invalid');
  }
  if (moveIn && requested <= moveIn) {
    throw new ApiError(400, 'Requested move-out date must be after the move-in date');
  }
  if (current && requested <= current) {
    throw new ApiError(400, 'Requested move-out date must be later than the current expected move-out date');
  }
  return requested;
}

export async function createExtensionRequest(user, tenancyId, payload) {
  if (user.role !== 'TENANT') {
    throw new ApiError(403, 'Only the tenant can request a tenancy extension');
  }

  const tenancy = await requireTenancyAccess(user, tenancyId);
  assertTenant(user, tenancy);

  const pending = await TenancyExtensionRequest.findOne({
    tenancyId: tenancy._id,
    status: 'PENDING',
  });
  if (pending) {
    throw new ApiError(409, 'An extension request is already pending for this tenancy');
  }
  if (!canRequestExtension(tenancy, null)) {
    throw new ApiError(400, 'An extension cannot be requested for this tenancy');
  }

  const requestedMoveOutDate = validateRequestedDate(tenancy, payload.requestedMoveOutDate);
  const reason = String(payload.reason || '').trim();
  if (reason.length < 3) {
    throw new ApiError(400, 'Please provide a reason for the extension request');
  }

  let request;
  try {
    request = await TenancyExtensionRequest.create({
      tenancyId: tenancy._id,
      propertyId: tenancy.propertyId,
      tenantId: tenancy.tenantUserId,
      ownerId: tenancy.ownerId,
      currentMoveOutDate: tenancy.moveOut,
      requestedMoveOutDate,
      reason,
      status: 'PENDING',
      requestedAt: new Date(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'An extension request is already pending for this tenancy');
    }
    throw error;
  }

  await createNotification({
    userId: tenancy.ownerId,
    tenancyId: tenancy._id,
    type: 'EXTENSION_REQUESTED',
    title: 'Tenancy Extension Request',
    message: `${tenancy.tenantName} requested to extend the tenancy for ${tenancy.propertyName}. Current Move-Out: ${formatCalendarDate(tenancy.moveOut)}. Requested Move-Out: ${formatCalendarDate(requestedMoveOutDate)}.`,
  });

  return {
    request: formatExtensionRequest(request),
    tenancy: await attachTenancyTimeline(tenancy),
  };
}

export async function listExtensionRequests(user, tenancyId) {
  const tenancy = await requireTenancyAccess(user, tenancyId);
  const requests = await TenancyExtensionRequest.find({ tenancyId: tenancy._id }).sort({
    createdAt: -1,
  });
  return {
    requests: requests.map((item) => formatExtensionRequest(item)),
    tenancy: await attachTenancyTimeline(tenancy),
  };
}

export async function getExtensionRequest(user, requestId) {
  const { request, tenancy } = await requireExtensionAccess(user, requestId);
  return {
    request: formatExtensionRequest(request),
    tenancy: await attachTenancyTimeline(tenancy),
  };
}

export async function approveExtensionRequest(user, requestId) {
  const { request, tenancy } = await requireExtensionAccess(user, requestId);
  assertOwner(user, tenancy);

  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Only a pending extension request can be approved');
  }

  await withOptionalTransaction(async (session) => {
    let requestQuery = TenancyExtensionRequest.findOne({
      _id: request._id,
      status: 'PENDING',
    });
    if (session) requestQuery = requestQuery.session(session);
    const lockedRequest = await requestQuery;
    if (!lockedRequest) {
      throw new ApiError(400, 'Only a pending extension request can be approved');
    }

    let tenancyQuery = Tenancy.findById(tenancy._id);
    if (session) tenancyQuery = tenancyQuery.session(session);
    const lockedTenancy = await tenancyQuery;
    if (!lockedTenancy) throw new ApiError(404, 'Tenancy not found');

    const requestedMoveOutDate = validateRequestedDate(
      lockedTenancy,
      lockedRequest.requestedMoveOutDate,
    );
    const previousDate = lockedTenancy.moveOut;

    lockedTenancy.dateHistory.push({
      field: 'moveOut',
      oldValue: previousDate || '',
      newValue: requestedMoveOutDate,
      reason: 'Tenant extension request approved',
      changedBy: user.id,
      requestedBy: lockedTenancy.tenantUserId,
      approvedBy: user.id,
      changedAt: new Date(),
    });
    lockedTenancy.moveOut = requestedMoveOutDate;
    await lockedTenancy.save(session ? { session } : undefined);

    lockedRequest.status = 'APPROVED';
    lockedRequest.ownerResponse = 'APPROVED';
    lockedRequest.reviewedAt = new Date();
    await lockedRequest.save(session ? { session } : undefined);
  });

  const freshTenancy = await Tenancy.findById(tenancy._id);
  const freshRequest = await TenancyExtensionRequest.findById(request._id);

  if (freshTenancy?.tenantUserId) {
    await createNotification({
      userId: freshTenancy.tenantUserId,
      tenancyId: freshTenancy._id,
      type: 'EXTENSION_APPROVED',
      title: 'Extension Approved',
      message: `Your tenancy extension request has been approved. New Expected Move-Out: ${formatCalendarDate(freshTenancy.moveOut)}.`,
    });
  }

  return {
    request: formatExtensionRequest(freshRequest),
    tenancy: await attachTenancyTimeline(freshTenancy),
  };
}

export async function rejectExtensionRequest(user, requestId, payload) {
  const { request, tenancy } = await requireExtensionAccess(user, requestId);
  assertOwner(user, tenancy);

  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Only a pending extension request can be rejected');
  }

  const ownerResponse = String(payload.ownerResponse || payload.reason || payload.ownerNotes || '').trim();
  if (ownerResponse.length < 3) {
    throw new ApiError(400, 'A rejection reason is required');
  }

  const previousDate = tenancy.moveOut;
  request.status = 'REJECTED';
  request.ownerResponse = ownerResponse;
  request.ownerNotes = ownerResponse;
  request.reviewedAt = new Date();
  await request.save();

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'EXTENSION_REJECTED',
      title: 'Extension Request Rejected',
      message: `Requested Move-Out: ${formatCalendarDate(request.requestedMoveOutDate)}. Current Move-Out remains: ${formatCalendarDate(previousDate)}. Reason: ${ownerResponse}`,
    });
  }

  const freshTenancy = await Tenancy.findById(tenancy._id);
  return {
    request: formatExtensionRequest(request),
    tenancy: await attachTenancyTimeline(freshTenancy),
  };
}

export async function cancelExtensionRequest(user, requestId) {
  const { request, tenancy } = await requireExtensionAccess(user, requestId);
  assertTenant(user, tenancy);

  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Only a pending extension request can be cancelled');
  }

  request.status = 'CANCELLED';
  request.cancelledAt = new Date();
  await request.save();

  return {
    request: formatExtensionRequest(request),
    tenancy: await attachTenancyTimeline(tenancy),
  };
}
