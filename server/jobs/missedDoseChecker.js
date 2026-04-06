const Reminder = require('../models/Reminder');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const AdherenceLog = require('../models/AdherenceLog');
const { REMINDER_STATUS, ADHERENCE_STATUS } = require('../config/constants');
const alertService = require('../services/alert.service');
const logger = require('../utils/logger');

/**
 * Missed Dose Checker — runs every 5 minutes.
 *
 * Finds TRIGGERED reminders that have exceeded their response window
 * and marks them as MISSED, then escalates to caregivers.
 */
async function checkMissedDoses() {
  try {
    const now = new Date();

    // Find triggered reminders, avoiding duplicates
    const triggeredReminders = await Reminder.find({
      status: REMINDER_STATUS.TRIGGERED,
      processed: { $ne: true }
    })
      .populate('userId medicationId')
      .limit(100);

    if (triggeredReminders.length === 0) return;

    // Performance Issue (IMPORTANT) Fix: Fetch all schedules first
    const scheduleMap = {};
    const schedules = await Schedule.find({
      _id: { $in: triggeredReminders.map(r => r.scheduleId) }
    });

    schedules.forEach(s => {
      scheduleMap[s._id.toString()] = s;
    });

    let missedCount = 0;

    for (const reminder of triggeredReminders) {
      if (!reminder.scheduleId) {
         logger.warn(`Reminder ${reminder._id} lacks a scheduleId! Skipping.`);
         continue;
      }
      
      const schedule = scheduleMap[reminder.scheduleId.toString()];
      if (!schedule) {
         logger.warn(`Could not deeply map scheduleId ${reminder.scheduleId} for reminder ${reminder._id}`);
         continue;
      }

      const windowMinutes = 1; // Strict 1 minute timeout overriding native schema default
      const deadline = new Date(reminder.scheduledTime.getTime() + windowMinutes * 60 * 1000);

      logger.info(`Evaluating reminder ${reminder._id} at now: ${now.toISOString()} against deadline: ${deadline.toISOString()}`);

      if (now > deadline) {
        // Mark as missed
        reminder.status = REMINDER_STATUS.MISSED;
        
        // Log in adherence
        await AdherenceLog.create({
          userId: reminder.userId,
          medicationId: reminder.medicationId,
          reminderId: reminder._id,
          scheduledTime: reminder.scheduledTime,
          actualTime: null,
          status: ADHERENCE_STATUS.MISSED,
          responseMethod: 'manual',
        });

        // Add this after marking MISSED
        const patient = reminder.userId;
        const caregivers = await User.find({ _id: { $in: patient.caregiverIds } });

        for (const caregiver of caregivers) {
          await alertService.sendCaregiverAlert({
            patient: patient,
            caregiver,
            medication: reminder.medicationId,
            type: "MISSED"
          });
        }

        missedCount++;
      }

      // Avoid Duplicate Processing - After processing
      reminder.processed = true;
      await reminder.save();
    }

    if (missedCount > 0) {
      logger.info(`[MissedDoseChecker] Marked ${missedCount} reminders as MISSED`);
    }
  } catch (err) {
    // Missing Error Logging Context Fix
    logger.error("MissedDoseChecker Error:", err);
  }
}

module.exports = checkMissedDoses;
