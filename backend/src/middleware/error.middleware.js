import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = {};
    for (const field of Object.values(err.errors || {})) {
      errors[field.path] = field.message;
    }
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'An account with this email already exists';
    const field = Object.keys(err.keyPattern || {})[0];
    if (field) {
      errors = { [field]: 'Already in use' };
    }
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier';
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired access token';
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Each image must be 5MB or smaller';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many images in one upload';
    } else {
      message = err.message || 'Image upload failed';
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('[API Error]', statusCode, message, err.stack);
  }

  const payload = {
    success: false,
    message,
  };

  if (message === 'ACCESS_CLOSED' && err.propertyName) {
    payload.propertyName = err.propertyName;
  }

  if (errors) {
    payload.errors = errors;
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    payload.stack = err.stack;
  }

  return res.status(statusCode).json(payload);
}
