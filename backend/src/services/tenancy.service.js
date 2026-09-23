import { Property } from '../models/Property.js';
import { Tenancy } from '../models/Tenancy.js';
import { User } from '../models/User.js';
import { Inspection } from '../models/Inspection.js';
import { ApiError } from '../utils/ApiError.js';
import {
  assertPropertyAvailableForTenancy,
  getActiveTenancyForProperty,
  withOptionalTransaction,
} from './propertyAvailability.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../utils/generateToken.js';
import { TenancyCondition } from '../models/TenancyCondition.js';
import { acceptConditionsForActivation } from './tenancyCondition.service.js';
import { createNotification } from './notification.service.js';
import {
  attachAccessTimeline,
  attachTenancyTimeline,
  attachTenancyTimelines,
  formatCalendarDate,
} from './tenancyDate.service.js';
import { assertInvitationUrlConfig, attachInvitationFields } from '../utils/invitationUrl.js';
import bcrypt from 'bcryptjs';

async function formatTenancy(doc) {
  return attachInvitationFields(await attachTenancyTimeline(doc), doc);
}

async function saveWithOptionalSession(doc, session) {
  if (session) return doc.save({ session });
  return doc.save();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function recordDateChange(tenancy, field, oldValue, newValue, reason, userId) {
  if (oldValue === newValue) return;
  tenancy.dateHistory.push({
    field,
    oldValue: oldValue || '',
    newValue: newValue || '',
    reason: reason || '',
    changedBy: userId,
    changedAt: new Date(),
  });
}

function validateMoveDates(moveIn, moveOut, actualMoveOut) {
  const inDate = parseDate(moveIn);
  const outDate = parseDate(moveOut);
  const actualDate = actualMoveOut ? parseDate(actualMoveOut) : null;

  if (inDate && outDate && outDate < inDate) {
    throw new ApiError(400, 'Expected move-out must be on or after move-in date');
  }
  if (inDate && actualDate && actualDate < inDate) {
    throw new ApiError(400, 'Actual move-out cannot be before move-in date');
  }
}

async function hasLockedMoveIn(tenancyId) {
  const locked = await Inspection.findOne({
    tenancyId,
    type: 'MOVE_IN',
    status: 'LOCKED',
  });
  return Boolean(locked);
}

export async function listTenanciesForOwner(ownerId) {
  const existing = await Tenancy.find({ ownerId }).sort({ createdAt: -1 });
  const { tryFinalizeTenancy } = await import('./settlement.service.js');
  for (const tenancy of existing) {
    if (tenancy.stage === 'complete' || tenancy.status === 'Completed') continue;
    if (tenancy.inviteStatus !== 'Accepted') continue;
    await tryFinalizeTenancy(tenancy._id.toString());
  }

  const tenancies = await Tenancy.find({ ownerId }).sort({ createdAt: -1 });
  const formatted = await attachTenancyTimelines(tenancies);
  return formatted.map((json, index) => attachInvitationFields(json, tenancies[index]));
}

export async function getTenancyForOwner(ownerId, tenancyId) {
  const tenancy = await Tenancy.findOne({ _id: tenancyId, ownerId });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  return await formatTenancy(tenancy);
}

export async function createTenancyInvite(owner, payload) {
  assertInvitationUrlConfig();
  try {
    const createdTenancy = await withOptionalTransaction(async (session) => {
      let propertyQuery = Property.findOne({
        _id: payload.propertyId,
        ownerId: owner.id,
      });
      if (session) propertyQuery = propertyQuery.session(session);
      const property = await propertyQuery;
      if (!property) throw new ApiError(404, 'Property not found');

      await assertPropertyAvailableForTenancy(property._id, session);

      let ownerAccountQuery = User.findOne({
        email: payload.tenantEmail,
        role: 'OWNER',
      });
      if (session) ownerAccountQuery = ownerAccountQuery.session(session);
      const existingOwnerAccount = await ownerAccountQuery;
      if (existingOwnerAccount) {
        throw new ApiError(
          409,
          'This email is already associated with an Owner account. Use a different Tenant email.',
        );
      }

      const inviteToken = Tenancy.createInviteToken();
      const tenancy = new Tenancy({
        ownerId: owner.id,
        propertyId: property._id,
        propertyName: property.name,
        tenantName: payload.tenantName,
        tenantEmail: payload.tenantEmail,
        tenantPhone: payload.tenantPhone || '',
        ownerName: owner.name,
        ownerEmail: owner.email,
        moveIn: payload.moveIn,
        moveOut: payload.moveOut,
        rent: payload.rent,
        deposit: payload.deposit,
        inviteToken,
        inviteStatus: 'Pending',
        status: 'Invitation Sent',
        stage: 'invitation',
      });
      await saveWithOptionalSession(tenancy, session);

      property.activeTenancy = payload.tenantName;
      property.status = 'Active';
      await saveWithOptionalSession(property, session);

      return tenancy;
    });

    return await formatTenancy(createdTenancy);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(
        409,
        'This property already has an active or reserved tenancy. Complete or cancel the current tenancy before assigning another Tenant.',
      );
    }
    throw error;
  }
}

export async function cancelInvitation(ownerId, tenancyId) {
  const tenancy = await Tenancy.findOne({ _id: tenancyId, ownerId });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  if (tenancy.inviteStatus !== 'Pending') {
    throw new ApiError(400, 'Only pending invitations can be cancelled');
  }
  tenancy.inviteStatus = 'Cancelled';
  tenancy.status = 'Cancelled';
  await tenancy.save();

  const property = await Property.findById(tenancy.propertyId);
  if (property) {
    const stillActive = await getActiveTenancyForProperty(property._id);
    if (!stillActive) {
      property.activeTenancy = null;
      await property.save();
    }
  }

  return await formatTenancy(tenancy);
}

export async function resendInvitation(ownerId, tenancyId) {
  assertInvitationUrlConfig();
  const tenancy = await Tenancy.findOne({ _id: tenancyId, ownerId });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  if (tenancy.inviteStatus === 'Accepted') {
    throw new ApiError(400, 'Invitation already accepted');
  }
  tenancy.inviteToken = Tenancy.createInviteToken();
  tenancy.inviteStatus = 'Pending';
  tenancy.inviteSentAt = new Date();
  tenancy.inviteExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  tenancy.status = 'Invitation Sent';
  await tenancy.save();
  return await formatTenancy(tenancy);
}

export async function getInvitationByToken(token) {
  const tenancy = await Tenancy.findOne({ inviteToken: token });
  if (!tenancy) {
    throw new ApiError(404, 'Invitation Not Available');
  }

  if (tenancy.inviteStatus === 'Cancelled' || tenancy.inviteStatus === 'Accepted') {
    throw new ApiError(404, 'Invitation Not Available');
  }

  if (tenancy.inviteExpiresAt && tenancy.inviteExpiresAt < new Date()) {
    tenancy.inviteStatus = 'Expired';
    await tenancy.save();
    throw new ApiError(410, 'This invitation has expired');
  }

  const conditions = await TenancyCondition.find({ tenancyId: tenancy._id }).sort({
    sortOrder: 1,
    createdAt: 1,
  });

  return {
    token: tenancy.inviteToken,
    status: tenancy.inviteStatus,
    ownerName: tenancy.ownerName,
    ownerEmail: tenancy.ownerEmail,
    tenantName: tenancy.tenantName,
    tenantEmail: tenancy.tenantEmail,
    tenantPhone: tenancy.tenantPhone,
    propertyName: tenancy.propertyName,
    moveIn: tenancy.moveIn,
    moveOut: tenancy.moveOut,
    deposit: tenancy.deposit,
    tenancyId: tenancy._id.toString(),
    conditions: conditions.map((c) => c.toJSON()),
    requiresConditionAcceptance: conditions.some(
      (c) => c.isMandatory || c.requiresTenantAcceptance,
    ),
  };
}

export async function activateTenantFromInvite({ token, password, conditionsAccepted }) {
  const tenancy = await Tenancy.findOne({ inviteToken: token });
  if (!tenancy) throw new ApiError(404, 'Invitation Not Available');

  if (tenancy.inviteStatus !== 'Pending') {
    throw new ApiError(404, 'Invitation Not Available');
  }

  if (tenancy.inviteExpiresAt && tenancy.inviteExpiresAt < new Date()) {
    tenancy.inviteStatus = 'Expired';
    await tenancy.save();
    throw new ApiError(410, 'This invitation has expired');
  }

  const existing = await User.findOne({ email: tenancy.tenantEmail });
  if (existing?.role === 'OWNER') {
    throw new ApiError(
      409,
      'This email is already associated with an Owner account. ReturnReady accounts use fixed roles.',
    );
  }
  if (existing?.role === 'TENANT') {
    throw new ApiError(409, 'An account with this email already exists. Please sign in.');
  }

  const existingConditions = await TenancyCondition.find({ tenancyId: tenancy._id });
  const requiresAcceptance = existingConditions.some(
    (c) => c.isMandatory || c.requiresTenantAcceptance,
  );
  if (requiresAcceptance && conditionsAccepted !== true) {
    throw new ApiError(400, 'You must accept the property handover conditions to continue.');
  }

  const user = await User.create({
    name: tenancy.tenantName,
    email: tenancy.tenantEmail,
    phone: tenancy.tenantPhone || '',
    password,
    role: 'TENANT',
    accountStatus: 'ACTIVE',
  });

  tenancy.inviteStatus = 'Accepted';
  tenancy.status = 'Active';
  tenancy.stage = 'move-in';
  tenancy.tenantUserId = user._id;
  if (existingConditions.length) {
    await acceptConditionsForActivation(tenancy, user._id);
  }
  await tenancy.save();

  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save({ validateBeforeSave: false });

  const safeUser = {
    ...user.toSafeObject(),
    tenantAccess: await getTenantAccessForUser(user._id),
  };

  return { user: safeUser, accessToken, refreshToken };
}

function isTenancyClosed(tenancy) {
  return tenancy.stage === 'complete' || tenancy.status === 'Completed';
}

function summarizeCompletedTenancy(tenancy) {
  return {
    tenancyId: tenancy._id.toString(),
    propertyId: tenancy.propertyId?.toString?.() || tenancy.propertyId,
    propertyName: tenancy.propertyName,
    ownerName: tenancy.ownerName,
    moveIn: tenancy.moveIn,
    moveOut: tenancy.moveOut,
    actualMoveOut: tenancy.actualMoveOut,
    stage: tenancy.stage,
    status: tenancy.status,
    completedAt: tenancy.completedAt || null,
    readOnly: true,
  };
}

export async function getTenantAccessForUser(userId) {
  const tenancies = await Tenancy.find({
    tenantUserId: userId,
    inviteStatus: 'Accepted',
  }).sort({ updatedAt: -1 });

  if (!tenancies.length) return null;

  const open = tenancies.find((tenancy) => !isTenancyClosed(tenancy) && tenancy.status !== 'Cancelled');
  const completed = tenancies.filter((tenancy) => isTenancyClosed(tenancy));
  const tenancy = open || completed[0] || tenancies[0];
  const closed = !open && isTenancyClosed(tenancy);

  const base = {
    status: closed ? 'CLOSED' : 'ACTIVE',
    readOnly: closed,
    tenancyId: tenancy._id.toString(),
    inviteId: tenancy.inviteToken,
    propertyName: tenancy.propertyName,
    ownerName: tenancy.ownerName,
    moveIn: tenancy.moveIn,
    moveOut: tenancy.moveOut,
    actualMoveOut: tenancy.actualMoveOut,
    moveOutReason: tenancy.moveOutReason,
    moveOutNotes: closed ? undefined : tenancy.moveOutNotes,
    occupancyStatus: tenancy.occupancyStatus,
    stage: tenancy.stage,
    deposit: tenancy.deposit,
    completedAt: tenancy.completedAt || null,
    completedTenancies: completed.map(summarizeCompletedTenancy),
  };

  return attachAccessTimeline(tenancy, base);
}

export async function listPropertyTenancyHistory(ownerId, propertyId) {
  const property = await Property.findById(propertyId);
  if (!property) throw new ApiError(404, 'Property not found');
  if (property.ownerId.toString() !== ownerId.toString()) {
    throw new ApiError(403, 'You do not have permission to view this property.');
  }

  const { Report } = await import('../models/Report.js');
  const { Settlement } = await import('../models/Settlement.js');

  const tenancies = await Tenancy.find({ propertyId, ownerId }).sort({ createdAt: -1 });
  const tenancyIds = tenancies.map((tenancy) => tenancy._id);
  const [reports, settlements] = await Promise.all([
    Report.find({ tenancyId: { $in: tenancyIds }, type: 'FINAL_HANDOVER' }),
    Settlement.find({ tenancyId: { $in: tenancyIds } }),
  ]);

  const current = tenancies.find((tenancy) => !isTenancyClosed(tenancy) && tenancy.status !== 'Cancelled');
  const previous = tenancies.filter((tenancy) => isTenancyClosed(tenancy) || tenancy.status === 'Cancelled');

  const mapTenancy = (tenancy) => {
    const report = reports.find((item) => item.tenancyId.toString() === tenancy._id.toString());
    const settlement = settlements.find((item) => item.tenancyId.toString() === tenancy._id.toString());
    return {
      id: tenancy._id.toString(),
      tenantName: tenancy.tenantName,
      propertyName: tenancy.propertyName,
      moveIn: tenancy.moveIn,
      moveOut: tenancy.moveOut,
      actualMoveOut: tenancy.actualMoveOut,
      status: tenancy.status,
      stage: tenancy.stage,
      completedAt: tenancy.completedAt || null,
      settlementStatus: settlement?.status || null,
      finalRefund: settlement?.finalRefund ?? null,
      reportId: report?._id?.toString() || null,
      reportUrl: report?.fileUrl || null,
    };
  };

  return {
    current: current ? mapTenancy(current) : null,
    previous: previous.map(mapTenancy),
  };
}

export async function updateTenancyForOwner(ownerId, tenancyId, payload) {
  const tenancy = await Tenancy.findOne({ _id: tenancyId, ownerId });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  if (isTenancyClosed(tenancy)) {
    throw new ApiError(403, 'This tenancy is completed and is read-only');
  }

  const lockedMoveIn = await hasLockedMoveIn(tenancy._id);

  if (payload.moveIn !== undefined) {
    if (lockedMoveIn && payload.moveIn !== tenancy.moveIn && !payload.changeReason?.trim()) {
      throw new ApiError(400, 'A reason is required to change move-in date after inspection is locked');
    }
    recordDateChange(
      tenancy,
      'moveIn',
      tenancy.moveIn,
      payload.moveIn,
      payload.changeReason,
      ownerId,
    );
    tenancy.moveIn = payload.moveIn;
  }

  if (payload.moveOut !== undefined) {
    recordDateChange(
      tenancy,
      'moveOut',
      tenancy.moveOut,
      payload.moveOut,
      payload.changeReason,
      ownerId,
    );
    tenancy.moveOut = payload.moveOut;
  }

  if (payload.actualMoveOut !== undefined) {
    recordDateChange(
      tenancy,
      'actualMoveOut',
      tenancy.actualMoveOut,
      payload.actualMoveOut,
      payload.changeReason || payload.moveOutReason,
      ownerId,
    );
    tenancy.actualMoveOut = payload.actualMoveOut;
  }

  if (payload.moveOutReason !== undefined) tenancy.moveOutReason = payload.moveOutReason;
  if (payload.moveOutNotes !== undefined) tenancy.moveOutNotes = payload.moveOutNotes;
  if (payload.tenantPhone !== undefined) tenancy.tenantPhone = payload.tenantPhone;

  if (payload.occupancyStatus !== undefined) {
    tenancy.occupancyStatus = payload.occupancyStatus;
    if (payload.occupancyStatus === 'MOVED_OUT' && tenancy.stage === 'active') {
      tenancy.stage = 'move-out';
    }
  }

  validateMoveDates(tenancy.moveIn, tenancy.moveOut, tenancy.actualMoveOut);

  await tenancy.save();
  return await formatTenancy(tenancy);
}

export async function startMoveOutForOwner(ownerId, tenancyId, payload) {
  const tenancy = await Tenancy.findOne({ _id: tenancyId, ownerId });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');

  if (tenancy.inviteStatus !== 'Accepted') {
    throw new ApiError(400, 'Tenant must accept the invitation before starting move-out');
  }

  if (!['active', 'move-out'].includes(tenancy.stage)) {
    throw new ApiError(400, 'Move-out can only be started for an active tenancy');
  }

  const lockedMoveIn = await hasLockedMoveIn(tenancy._id);
  if (!lockedMoveIn) {
    throw new ApiError(400, 'Move-in inspection must be locked before starting move-out');
  }

  const completedMoveOut = await Inspection.findOne({
    tenancyId: tenancy._id,
    type: 'MOVE_OUT',
    status: 'COMPLETED',
  });
  if (completedMoveOut) {
    throw new ApiError(409, 'A completed Move-Out inspection already exists for this tenancy');
  }

  validateMoveDates(tenancy.moveIn, tenancy.moveOut, payload.actualMoveOut);

  recordDateChange(
    tenancy,
    'actualMoveOut',
    tenancy.actualMoveOut,
    payload.actualMoveOut,
    payload.moveOutReason,
    ownerId,
  );

  tenancy.actualMoveOut = payload.actualMoveOut;
  tenancy.moveOutReason = payload.moveOutReason;
  tenancy.moveOutNotes = payload.moveOutNotes || '';
  tenancy.occupancyStatus = 'PREPARING_TO_MOVE_OUT';
  tenancy.stage = 'move-out';

  await tenancy.save();

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'MOVE_OUT_STARTED',
      title: 'Move-Out Started',
      message: `Move-Out has started for ${tenancy.propertyName}. Expected: ${formatCalendarDate(tenancy.moveOut)}. Actual: ${formatCalendarDate(tenancy.actualMoveOut)}.`,
    });
  }

  return await formatTenancy(tenancy);
}
