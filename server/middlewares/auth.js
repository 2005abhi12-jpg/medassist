const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

/**
 * Protect routes — verifies Bearer JWT and attaches req.user.
 */
const protect = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token missing or malformed', 'AUTH_TOKEN_MISSING');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired', 'AUTH_TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid access token', 'AUTH_TOKEN_INVALID');
  }

  const user = await User.findById(decoded.id).select('-passwordHash -refreshToken');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User not found or deactivated', 'AUTH_USER_NOT_FOUND');
  }

  req.user = user;
  next();
});

module.exports = protect;
