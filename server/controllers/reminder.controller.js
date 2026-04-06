const asyncHandler = require('../utils/asyncHandler');
const reminderService = require('../services/reminder.service');

/**
 * GET /api/v1/reminders
 */
exports.getAll = asyncHandler(async (req, res) => {
  const { status, from, to, limit } = req.query;
  const reminders = await reminderService.getUserReminders(req.user._id, {
    status,
    from,
    to,
    limit: parseInt(limit, 10) || 50,
  });
  res.status(200).json({ success: true, count: reminders.length, data: reminders });
});

/**
 * GET /api/v1/reminders/upcoming
 */
exports.getUpcoming = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5;
  const reminders = await reminderService.getUpcomingReminders(req.user._id, limit);
  res.status(200).json({ success: true, count: reminders.length, data: reminders });
});

/**
 * GET /api/v1/reminders/due
 */
exports.getDue = asyncHandler(async (req, res) => {
  const Reminder = require('../models/Reminder');
  const now = new Date();
  
  const dueReminders = await Reminder.find({
    userId: req.user._id,
    status: 'SCHEDULED',
    scheduledTime: { $lte: now }
  }).populate('medicationId', 'name');

  const reminderIds = dueReminders.map(r => r._id);
  if (reminderIds.length > 0) {
    await Reminder.updateMany(
      { _id: { $in: reminderIds } },
      { $set: { status: 'TRIGGERED' } }
    );
  }

  // Update in memory for response
  dueReminders.forEach(r => r.status = 'TRIGGERED');

  res.status(200).json({ success: true, count: dueReminders.length, reminders: dueReminders, data: dueReminders });
});

/**
 * GET /api/v1/reminders/:id
 */
exports.getOne = asyncHandler(async (req, res) => {
  const reminder = await reminderService.getReminderById(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: reminder });
});

/**
 * POST /api/v1/reminders/:id/confirm
 */
exports.confirm = asyncHandler(async (req, res) => {
  const { responseMethod, transcript } = req.body;
  const reminder = await reminderService.confirmDose(req.params.id, req.user._id, {
    responseMethod,
    transcript,
  });
  if (global.io) {
    global.io.emit("reminderUpdated", reminder);
  }
  res.status(200).json({ success: true, message: 'Dose confirmed', data: reminder });
});

/**
 * POST /api/v1/reminders/:id/snooze
 */
exports.snooze = asyncHandler(async (req, res) => {
  const { responseMethod } = req.body;
  const reminder = await reminderService.snoozeReminder(req.params.id, req.user._id, {
    responseMethod,
  });
  res.status(200).json({ success: true, message: 'Reminder snoozed', data: reminder });
});

/**
 * POST /api/v1/reminders/:id/dismiss
 */
exports.dismiss = asyncHandler(async (req, res) => {
  const reminder = await reminderService.dismissReminder(req.params.id, req.user._id);
  if (global.io) {
    global.io.emit("reminderUpdated", reminder);
  }
  res.status(200).json({ success: true, message: 'Reminder dismissed', data: reminder });
});

/**
 * DELETE /api/v1/reminders/:id
 */
exports.deleteReminder = asyncHandler(async (req, res) => {
  const Reminder = require('../models/Reminder');
  const deleted = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Reminder not found' });
  }
  res.status(200).json({ success: true, data: {} });
});

/**
 * PATCH /api/v1/reminders/:id
 */
exports.updateReminder = asyncHandler(async (req, res) => {
  const { scheduledTime } = req.body;
  const Reminder = require('../models/Reminder');
  const reminder = await Reminder.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { scheduledTime },
    { new: true }
  );
  if (!reminder) {
    return res.status(404).json({ success: false, message: 'Reminder not found' });
  }
  res.status(200).json({ success: true, data: reminder });
});
