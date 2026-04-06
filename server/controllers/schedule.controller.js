const asyncHandler = require('../utils/asyncHandler');
const scheduleService = require('../services/schedule.service');

/**
 * POST /api/v1/schedules
 */
exports.create = asyncHandler(async (req, res) => {
  const schedule = await scheduleService.createSchedule(req.user._id, req.body);
  res.status(201).json({ success: true, data: schedule });
});

/**
 * GET /api/v1/schedules
 */
exports.getAll = asyncHandler(async (req, res) => {
  const schedules = await scheduleService.getUserSchedules(req.user._id);
  res.status(200).json({ success: true, count: schedules.length, data: schedules });
});

/**
 * GET /api/v1/schedules/:id
 */
exports.getOne = asyncHandler(async (req, res) => {
  const schedule = await scheduleService.getScheduleById(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: schedule });
});

/**
 * PATCH /api/v1/schedules/:id
 */
exports.update = asyncHandler(async (req, res) => {
  const schedule = await scheduleService.updateSchedule(req.params.id, req.user._id, req.body);
  res.status(200).json({ success: true, data: schedule });
});

/**
 * DELETE /api/v1/schedules/:id
 */
exports.deactivate = asyncHandler(async (req, res) => {
  const schedule = await scheduleService.deactivateSchedule(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: schedule });
});
