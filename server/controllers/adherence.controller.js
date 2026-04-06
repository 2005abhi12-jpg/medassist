const asyncHandler = require('../utils/asyncHandler');
const adherenceService = require('../services/adherence.service');

/**
 * GET /api/v1/adherence
 */
exports.getLogs = asyncHandler(async (req, res) => {
  const { medicationId, from, to, status, limit } = req.query;
  const logs = await adherenceService.getAdherenceLogs(req.user._id, {
    medicationId,
    from,
    to,
    status,
    limit: parseInt(limit, 10) || 100,
  });
  res.status(200).json({ success: true, count: logs.length, data: logs });
});

/**
 * GET /api/v1/adherence/stats
 */
exports.getStats = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const stats = await adherenceService.getAdherenceStats(req.user._id, { days });
  res.status(200).json({ success: true, data: stats });
});

/**
 * GET /api/v1/adherence/stats/weekly
 */
exports.getWeeklyStats = asyncHandler(async (req, res) => {
  const stats = await adherenceService.getWeeklyStats(req.user._id);
  res.status(200).json({ success: true, data: stats });
});

/**
 * GET /api/v1/adherence/stats/by-medication
 */
exports.getStatsByMedication = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const stats = await adherenceService.getStatsByMedication(req.user._id, { days });
  res.status(200).json({ success: true, data: stats });
});
