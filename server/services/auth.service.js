const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * Generate access + refresh token pair.
 */
function generateTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, env.jwt.secret, {
    expiresIn: env.jwt.accessExpiresIn,
  });

  const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, env.jwt.secret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
}

/**
 * Register a new user.
 */
async function register({ name, email, phone, password, role, language, timezone }) {
  const existingEmail = await User.findOne({ email });
  if (existingEmail) throw ApiError.conflict('Email already registered');

  const existingPhone = await User.findOne({ phone });
  if (existingPhone) throw ApiError.conflict('Phone number already registered');

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash: password, // pre-save hook will hash
    role: role || 'patient',
    language: language || 'en',
    timezone: timezone || 'UTC',
  });

  const tokens = generateTokens(user._id);

  // Store refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return {
    user: user.toJSON(),
    ...tokens,
  };
}

/**
 * Login with email + password.
 */
async function login(email, password) {
  const user = await User.findOne({ email, isActive: true }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw ApiError.unauthorized('Invalid email or password');

  const tokens = generateTokens(user._id);

  user.refreshToken = tokens.refreshToken;
  await user.save();

  return {
    user: user.toJSON(),
    ...tokens,
  };
}

/**
 * Refresh the access token using a valid refresh token.
 */
async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token required');

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.jwt.secret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token', 'AUTH_TOKEN_EXPIRED');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || !user.isActive || user.refreshToken !== refreshToken) {
    throw ApiError.unauthorized('Invalid refresh token', 'AUTH_TOKEN_INVALID');
  }

  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return tokens;
}

/**
 * Logout — invalidate the refresh token.
 */
async function logout(userId) {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
}

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  generateTokens,
};
