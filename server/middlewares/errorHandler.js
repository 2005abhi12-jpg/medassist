const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Global error handler — catches all errors forwarded by next(err) or thrown in async handlers.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';

  // ─── Mongoose validation error ────────────────
  if (err.name === 'ValidationError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('. ');
  }

  // ─── Mongoose duplicate key ───────────────────
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists.`;
  }

  // ─── Mongoose bad ObjectId ────────────────────
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ID format: ${err.value}`;
  }

  // ─── JWT errors (catch-all) ───────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'AUTH_TOKEN_INVALID';
    message = 'Invalid token';
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error(err);
  } else {
    logger.warn(`${statusCode} ${code}: ${message} — ${req.method} ${req.originalUrl}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      status: statusCode,
      ...(env.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
