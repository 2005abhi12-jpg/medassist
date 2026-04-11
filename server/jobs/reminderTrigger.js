const Reminder = require('../models/Reminder');
const User = require('../models/User');
const Medication = require('../models/Medication');
const { REMINDER_STATUS } = require('../config/constants');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

/**
 * Reminder Trigger — runs every minute.
 *
 * Finds SCHEDULED reminders whose scheduledTime has arrived
 * and triggers notifications to the user.
 */
async function triggerReminders() {
  try {
    const now = new Date();

    // Find all SCHEDULED reminders where it's time
    const dueReminders = await Reminder.find({
      status: REMINDER_STATUS.SCHEDULED,
      scheduledTime: { $lte: now },
    }).limit(100); // process in batches

    if (dueReminders.length === 0) return;

    logger.info(`[ReminderTrigger] Found ${dueReminders.length} due reminders`);

    for (const reminder of dueReminders) {
      try {
        const [user, medication] = await Promise.all([
          User.findById(reminder.userId),
          Medication.findById(reminder.medicationId),
        ]);

        if (!user || !user.isActive || !medication) {
          reminder.status = REMINDER_STATUS.MISSED;
          await reminder.save();
          continue;
        }

        const medName = medication.name;
        const dosage = medication.dosage;
        const instructions = medication.instructions || '';

        const message = `MedAssist Reminder: Time to take ${medName} (${dosage}). ${instructions}. Reply TAKEN, SNOOZE, or SKIP.`;

        // Send notification
        const result = await notificationService.sendReminder(user, message);

        // Update status to TRIGGERED
        reminder.status = REMINDER_STATUS.TRIGGERED;
        reminder.channel = user.preferences?.reminderChannel === 'voice' ? 'voice' : 'sms';
        reminder.deliveryAttempts.push({
          timestamp: new Date(),
          channel: reminder.channel,
          success: result.status !== 'failed',
          errorCode: result.error || null,
        });
        await reminder.save();

        logger.info(`[ReminderTrigger] Triggered reminder ${reminder._id} for user ${user.name}`);
      } catch (err) {
        logger.error(`[ReminderTrigger] Failed for reminder ${reminder._id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[ReminderTrigger] Error: ${err.message}`);
  }
}

/**
 * Re-trigger snoozed reminders (also runs every minute).
 *
 * Finds SNOOZED reminders that were snoozed at least 10 minutes ago.
 */
async function retriggerSnoozed() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const snoozedReminders = await Reminder.find({
      status: REMINDER_STATUS.SNOOZED,
      updatedAt: { $lte: fiveMinutesAgo },
    }).limit(50);

    for (const reminder of snoozedReminders) {
      reminder.status = REMINDER_STATUS.TRIGGERED;
      reminder.scheduledTime = new Date(); // Reset time to prevent immediate missed marker
      await reminder.save();

      const [user, medication] = await Promise.all([
        User.findById(reminder.userId),
        Medication.findById(reminder.medicationId),
      ]);

      if (user && user.isActive && medication) {
        const message = `MedAssist Reminder (Follow-up): Please take ${medication.name} (${medication.dosage}). This is reminder #${reminder.snoozeCount + 1}.`;
        await notificationService.sendReminder(user, message);
      }
    }

    if (snoozedReminders.length > 0) {
      logger.info(`[ReminderTrigger] Re-triggered ${snoozedReminders.length} snoozed reminders`);
    }
  } catch (err) {
    logger.error(`[ReminderTrigger:Snooze] Error: ${err.message}`);
  }
}

module.exports = { triggerReminders, retriggerSnoozed };
