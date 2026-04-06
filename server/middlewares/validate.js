const ApiError = require('../utils/ApiError');

/**
 * Simple request body validator middleware.
 * Checks that required fields exist and are non-empty.
 *
 * Usage:  router.post('/meds', validate('name', 'dosage', 'startDate'), handler);
 *
 * @param {...string} requiredFields
 */
const validate = (...requiredFields) => {
  return (req, _res, next) => {
    const missing = [];

    for (const field of requiredFields) {
      const value = req.body[field];
      if (value === undefined || value === null || value === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return next(
        ApiError.badRequest(
          `Missing required fields: ${missing.join(', ')}`,
          'VALIDATION_ERROR'
        )
      );
    }

    next();
  };
};

module.exports = validate;
