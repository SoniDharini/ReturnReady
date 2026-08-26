import { ApiError } from '../utils/ApiError.js';

export function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to access this resource'));
    }

    return next();
  };
}

export const requireOwner = authorizeRoles('OWNER');
export const requireTenant = authorizeRoles('TENANT');
