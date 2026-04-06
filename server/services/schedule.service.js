const Schedule = require('../models/Schedule');
const Medication = require('../models/Medication');
const Reminder = require('../models/Reminder');
const ApiError = require('../utils/ApiError');
const { REMINDER_STATUS } = require('../config/constants');
const { localTimeToUTC } = require('../utils/timezone');
const User = require('../models/User');

/**
 * Create a schedule for a medication.
 */
async function createSchedule(userId, data) {
  // Verify the medication belongs to this user
  const medication = await Medication.findOne({ _id: data.medicationId, userId, isActive: true });
  if (!medication) throw ApiError.notFound('Medication not found or inactive');

  const schedule = await Schedule.create({ ...data, userId });

  // 🚀 DEMO FEATURE: Immediately generate reminders for TODAY
  // This ensures new medications show up on the dashboard instantly
  try {
    const user = await User.findById(userId);
    const tz = user?.timezone || 'UTC';
    const today = new Date();

    for (const time of schedule.times) {
      const scheduledTimeUTC = localTimeToUTC(time, tz, today);
      const isPast = scheduledTimeUTC <= new Date();
      console.log(`[ScheduleService] Creating initial reminder for ${time} (${scheduledTimeUTC.toISOString()}) [isPast: ${isPast}]`);
      
      await Reminder.create({
        scheduleId: schedule._id,
        userId,
        medicationId: schedule.medicationId || data.medicationId,
        scheduledTime: scheduledTimeUTC,
        status: isPast ? REMINDER_STATUS.TRIGGERED : REMINDER_STATUS.SCHEDULED,
      });
    }
  } catch (err) {
    console.error('Failed to pre-generate reminders:', err.message);
    // don't fail the schedule creation though
  }

  return schedule;
}

/**
 * Get all active schedules for a user.
 */
async function getUserSchedules(userId) {
  return Schedule.find({ userId, isActive: true })
    .populate('medicationId', 'name dosage form instructions')
    .sort({ createdAt: -1 });
}

/**
 * Get a single schedule by ID.
 */
async function getScheduleById(scheduleId, userId) {
  const schedule = await Schedule.findOne({ _id: scheduleId, userId })
    .populate('medicationId', 'name dosage form instructions');
  if (!schedule) throw ApiError.notFound('Schedule not found');
  return schedule;
}

/**
 * Update a schedule.
 */
async function updateSchedule(scheduleId, userId, updates) {
  const schedule = await Schedule.findOneAndUpdate(
    { _id: scheduleId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!schedule) throw ApiError.notFound('Schedule not found');
  return schedule;
}

/**
 * Deactivate a schedule.
 */
async function deactivateSchedule(scheduleId, userId) {
  const schedule = await Schedule.findOneAndUpdate(
    { _id: scheduleId, userId },
    { isActive: false },
    { new: true }
  );
  if (!schedule) throw ApiError.notFound('Schedule not found');
  return schedule;
}

/**
 * Get all active schedules (used by cron jobs).
 */
async function getAllActiveSchedules() {
  return Schedule.find({ isActive: true }).populate({
    path: 'userId',
    select: 'timezone preferences',
  });
}

module.exports = {
  createSchedule,
  getUserSchedules,
  getScheduleById,
  updateSchedule,
  deactivateSchedule,
  getAllActiveSchedules,
};
