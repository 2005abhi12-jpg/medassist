const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Global rate limiter — applies to all API routes.
 */
const globalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      status: 429,
    },
  },
});

/**
 * Stricter limiter for auth endpoints (prevent brute force).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Try again in 15 minutes.',
      status: 429,
    },
  },
});

module.exports = { globalLimiter, authLimiter };
