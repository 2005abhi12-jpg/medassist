const Reminder = require('../models/Reminder');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const { REMINDER_STATUS } = require('../config/constants');
const { localTimeToUTC } = require('../utils/timezone');
const logger = require('../utils/logger');

/**
 * Reminder Generator — runs nightly (e.g. 00:05 AM).
 *
 * For each active schedule, generate Reminder documents for the next day.
 * Ensures no duplicate reminders are created (idempotent).
 */
async function generateReminders() {
  const jobStart = Date.now();
  logger.info('[ReminderGenerator] Starting...');

  try {
    const schedules = await Schedule.find({ isActive: true }).populate({
      path: 'userId',
      select: 'timezone isActive',
    });

    let created = 0;
    let skipped = 0;

    for (const schedule of schedules) {
      // Skip if user is inactive
      if (!schedule.userId || !schedule.userId.isActive) {
        skipped++;
        continue;
      }

      const userTimezone = schedule.userId.timezone || 'UTC';
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if tomorrow is a scheduled day (for weekly/custom recurrence)
      const dayOfWeek = tomorrow.getDay(); // 0=Sun
      if (schedule.recurrence !== 'daily' && !schedule.daysOfWeek.includes(dayOfWeek)) {
        skipped++;
        continue;
      }

      for (const time of schedule.times) {
        const scheduledTimeUTC = localTimeToUTC(time, userTimezone, tomorrow);

        // Check for existing reminder to prevent duplicates
        const existing = await Reminder.findOne({
          scheduleId: schedule._id,
          scheduledTime: scheduledTimeUTC,
        });

        if (existing) {
          skipped++;
          continue;
        }

        await Reminder.create({
          scheduleId: schedule._id,
          userId: schedule.userId._id,
          medicationId: schedule.medicationId,
          scheduledTime: scheduledTimeUTC,
          status: REMINDER_STATUS.SCHEDULED,
        });

        created++;
      }
    }

    const duration = Date.now() - jobStart;
    logger.info(`[ReminderGenerator] Done in ${duration}ms — Created: ${created}, Skipped: ${skipped}`);
  } catch (err) {
    logger.error(`[ReminderGenerator] Error: ${err.message}`, { stack: err.stack });
  }
}

module.exports = generateReminders;
