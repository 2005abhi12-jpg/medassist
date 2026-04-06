const cron = require('node-cron');
const generateReminders = require('./reminderGenerator');
const { triggerReminders, retriggerSnoozed } = require('./reminderTrigger');
const checkMissedDoses = require('./missedDoseChecker');
const logger = require('../utils/logger');

/**
 * Initialize all cron jobs.
 */
function startJobs() {
  logger.info('[Jobs] Starting cron scheduler...');

  // ─── Every minute: trigger due reminders ──────────────
  cron.schedule('* * * * *', async () => {
    await triggerReminders();
    await retriggerSnoozed();
  });
  logger.info('[Jobs] ✓ Reminder trigger — every minute');

  // ─── Every 1 minute: check for missed doses ─────────
  cron.schedule('* * * * *', async () => {
    await checkMissedDoses();
  });
  logger.info('[Jobs] ✓ Missed dose checker — every 1 minute');

  // ─── Daily at 00:05 AM: generate tomorrow's reminders ─
  cron.schedule('5 0 * * *', async () => {
    await generateReminders();
  });
  logger.info('[Jobs] ✓ Reminder generator — daily at 00:05');

  logger.info('[Jobs] All cron jobs started');
}

module.exports = { startJobs, generateReminders };
