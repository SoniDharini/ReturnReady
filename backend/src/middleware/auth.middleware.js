import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/generateToken.js';

export async function protect(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      throw new ApiError(401, 'Invalid or expired access token');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    if (user.accountStatus !== 'ACTIVE') {
      throw new ApiError(403, 'This account is not active. Please contact support.');
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
      accountStatus: user.accountStatus,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

/** Optional auth — attaches user when token is present, otherwise continues */
export async function optionalProtect(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }
  return protect(req, _res, next);
}
