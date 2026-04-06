const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Audit logging middleware.
 * Logs every mutating request (POST, PATCH, PUT, DELETE) by authenticated users.
 *
 * Usage:  router.post('/meds', protect, audit('CREATE', 'medications'), handler);
 *
 * @param {string} action  CREATE | READ | UPDATE | DELETE | LOGIN | EXPORT
 * @param {string} resource  e.g. "medications", "users"
 */
const audit = (action, resource) => {
  return async (req, _res, next) => {
    // Fire-and-forget — don't block the request
    try {
      const logEntry = {
        actorId: req.user ? req.user._id : null,
        action,
        resource,
        resourceId: req.params.id || null,
        details: {
          method: req.method,
          path: req.originalUrl,
          body: sanitizeBody(req.body),
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      };

      // Don't await — async fire-and-forget
      AuditLog.create(logEntry).catch((err) => {
        logger.error(`Audit log failed: ${err.message}`);
      });
    } catch (err) {
      logger.error(`Audit middleware error: ${err.message}`);
    }

    next();
  };
};

/**
 * Strip sensitive fields from request body before logging.
 */
function sanitizeBody(body) {
  if (!body) return {};
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken'];
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) sanitized[field] = '[REDACTED]';
  });
  return sanitized;
}

module.exports = audit;
