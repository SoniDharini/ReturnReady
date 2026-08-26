import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/generateToken.js';
import { countPropertiesForOwner } from './property.service.js';
import { getTenantAccessForUser } from './tenancy.service.js';

function buildTokenPayload(user) {
  return {
    userId: user._id.toString(),
    role: user.role,
  };
}

async function issueTokens(user) {
  const payload = buildTokenPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
}

async function enrichUser(user) {
  const safe = user.toSafeObject();

  if (user.role === 'OWNER') {
    const count = await countPropertiesForOwner(user._id);
    safe.isNewOwner = count === 0;
  }

  if (user.role === 'TENANT') {
    safe.tenantAccess = await getTenantAccessForUser(user._id);
  }

  return safe;
}

export async function registerOwner({ name, email, phone, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await User.create({
    name,
    email,
    phone: phone || '',
    password,
    role: 'OWNER',
    accountStatus: 'ACTIVE',
  });

  const tokens = await issueTokens(user);

  return {
    user: await enrichUser(user),
    ...tokens,
  };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+password +refreshTokenHash');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.accountStatus !== 'ACTIVE') {
    throw new ApiError(403, 'This account is not active. Please contact support.');
  }

  const enriched = await enrichUser(user);

  if (user.role === 'TENANT') {
    if (!enriched.tenantAccess) {
      throw new ApiError(
        403,
        'Your tenant access is not active. Open your invitation link to activate access.',
      );
    }
    if (enriched.tenantAccess.status === 'CLOSED' || enriched.tenantAccess.status === 'REVOKED') {
      const error = new ApiError(403, 'ACCESS_CLOSED');
      error.propertyName = enriched.tenantAccess.propertyName;
      throw error;
    }
  }

  const tokens = await issueTokens(user);

  return {
    user: enriched,
    ...tokens,
  };
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  if (user.accountStatus !== 'ACTIVE') {
    throw new ApiError(403, 'This account is not active. Please contact support.');
  }

  return enrichUser(user);
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token is required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.userId).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!tokenMatches) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  if (user.accountStatus !== 'ACTIVE') {
    throw new ApiError(403, 'This account is not active. Please contact support.');
  }

  const tokens = await issueTokens(user);

  return {
    user: await enrichUser(user),
    ...tokens,
  };
}

export async function logoutUser(userId) {
  if (!userId) return;
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
}
