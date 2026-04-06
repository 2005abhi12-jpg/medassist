const ApiError = require('../utils/ApiError');

/**
 * Role-based access control middleware.
 *
 * Usage:  router.get('/admin', protect, roleGuard('admin'), handler);
 *         router.get('/both', protect, roleGuard('patient', 'caregiver'), handler);
 *
 * @param  {...string} allowedRoles
 */
const roleGuard = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};

module.exports = roleGuard;
