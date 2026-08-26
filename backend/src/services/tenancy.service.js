import { Property } from '../models/Property.js';
import { Tenancy } from '../models/Tenancy.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../utils/generateToken.js';
import bcrypt from 'bcryptjs';

function formatTenancy(doc) {
  return doc.toJSON();
}

export async function listTenanciesForOwner(ownerId) {
  const tenancies = await Tenancy.find({ ownerId }).sort({ createdAt: -1 });
  return tenancies.map(formatTenancy);
}

export async function getTenancyForOwner(ownerId, tenancyId) {
  const tenancy = await Tenancy.findOne({ _id: tenancyId, ownerId });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');
  return formatTenancy(tenancy);
}

export async function createTenancyInvite(owner, payload) {
  const property = await Property.findOne({ _id: payload.propertyId, ownerId: owner.id });
  if (!property) throw new ApiError(404, 'Property not found');

  const existingOwnerAccount = await User.findOne({
    email: payload.tenantEmail,
    role: 'OWNER',
  });
  if (existingOwnerAccount) {
    throw new ApiError(
      409,
      'This email is already associated with an Owner account. Use a different Tenant email.',
    );
  }

  const inviteToken = Tenancy.createInviteToken();

  const tenancy = await Tenancy.create({
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

  property.activeTenancy = payload.tenantName;
  property.status = 'Active';
  await property.save();

  return formatTenancy(tenancy);
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
  return formatTenancy(tenancy);
}

export async function resendInvitation(ownerId, tenancyId) {
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
  return formatTenancy(tenancy);
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
  };
}

export async function activateTenantFromInvite({ token, password }) {
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
  await tenancy.save();

  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save({ validateBeforeSave: false });

  const safeUser = {
    ...user.toSafeObject(),
    tenantAccess: {
      status: 'ACTIVE',
      tenancyId: tenancy._id.toString(),
      inviteId: tenancy.inviteToken,
      propertyName: tenancy.propertyName,
      ownerName: tenancy.ownerName,
      moveIn: tenancy.moveIn,
      moveOut: tenancy.moveOut,
      deposit: tenancy.deposit,
    },
  };

  return { user: safeUser, accessToken, refreshToken };
}

export async function getTenantAccessForUser(userId) {
  const tenancy = await Tenancy.findOne({
    tenantUserId: userId,
    inviteStatus: 'Accepted',
  }).sort({ updatedAt: -1 });

  if (!tenancy) return null;

  if (tenancy.stage === 'complete' || tenancy.status === 'Completed') {
    return {
      status: 'CLOSED',
      tenancyId: tenancy._id.toString(),
      inviteId: tenancy.inviteToken,
      propertyName: tenancy.propertyName,
      ownerName: tenancy.ownerName,
      moveIn: tenancy.moveIn,
      moveOut: tenancy.moveOut,
      deposit: tenancy.deposit,
    };
  }

  return {
    status: 'ACTIVE',
    tenancyId: tenancy._id.toString(),
    inviteId: tenancy.inviteToken,
    propertyName: tenancy.propertyName,
    ownerName: tenancy.ownerName,
    moveIn: tenancy.moveIn,
    moveOut: tenancy.moveOut,
    deposit: tenancy.deposit,
  };
}
