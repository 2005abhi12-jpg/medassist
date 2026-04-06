const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

/**
 * POST /api/v1/auth/register
 */
exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role, language, timezone } = req.body;

  const result = await authService.register({
    name,
    email,
    phone,
    password,
    role,
    language,
    timezone,
  });

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

/**
 * POST /api/v1/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

/**
 * POST /api/v1/auth/refresh
 */
exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const tokens = await authService.refreshAccessToken(refreshToken);

  res.status(200).json({
    success: true,
    data: tokens,
  });
});

/**
 * POST /api/v1/auth/logout
 */
exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});
