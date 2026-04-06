const { INTENTS } = require('../config/constants');
const intentService = require('./intent.service');
const reminderService = require('./reminder.service');
const adherenceService = require('./adherence.service');
const notificationService = require('./notification.service');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Voice response templates.
 */
const RESPONSES = {
  CONFIRM: '✅ Marked your medicine as taken',
  SNOOZE: '⏰ Okay, I will remind you later',
  SKIP: 'Understood. The dose has been marked as skipped.',
  SNOOZE_LIMIT: 'You\'ve reached the maximum number of snoozes. The dose has been marked as missed.',
  NEXT_DOSE: (med, time) => `💊 Your next medicine is ${med} at ${time}`,
  ADHERENCE: (rate) => `Your adherence rate this week is ${rate} percent. ${rate >= 80 ? 'Great job!' : 'Let\'s try to do better!'}`,
  EMERGENCY: 'I\'m alerting your caregiver right away. Please stay safe.',
  DRUG_INFO: 'I\'m sorry, drug information lookup is not yet available. Please ask your doctor.',
  UNKNOWN: '❓ Sorry, I didn’t understand',
  ERROR: '❌ Something went wrong. Please try again or contact support.',
};

/**
 * Process a voice transcript and execute the corresponding action.
 *
 * @param {string} transcript     Raw voice transcript
 * @param {string} userId         Authenticated user ID
 * @param {string} [reminderId]   Active reminder ID (if responding to a reminder)
 * @returns {{ intent: string, response: string, data: any }}
 */
async function processVoiceInput(transcript, userId, reminderId = null) {
  const { intent, confidence } = intentService.classifyIntent(transcript);

  logger.info(`Voice intent: ${intent} (${confidence}) — Transcript: "${transcript}"`);

  try {
    switch (intent) {
      case INTENTS.CONFIRM_DOSE: {
        if (!reminderId) {
          // Find the most recent triggered/snoozed reminder
          const upcoming = await reminderService.getUpcomingReminders(userId, 1);
          if (upcoming.length > 0) reminderId = upcoming[0]._id;
        }
        if (!reminderId) {
          return { intent, response: 'No active reminder found to confirm.', data: null };
        }
        const reminder = await reminderService.confirmDose(reminderId, userId, {
          responseMethod: 'voice',
          transcript,
        });
        return { intent, response: RESPONSES.CONFIRM, data: reminder };
      }

      case INTENTS.SNOOZE: {
        if (!reminderId) {
          const upcoming = await reminderService.getUpcomingReminders(userId, 1);
          if (upcoming.length > 0) reminderId = upcoming[0]._id;
        }
        if (!reminderId) {
          return { intent, response: 'No active reminder found to snooze.', data: null };
        }
        try {
          const reminder = await reminderService.snoozeReminder(reminderId, userId, {
            responseMethod: 'voice',
          });
          return { intent, response: RESPONSES.SNOOZE, data: reminder };
        } catch (err) {
          if (err.message.includes('Snooze limit')) {
            return { intent, response: RESPONSES.SNOOZE_LIMIT, data: null };
          }
          throw err;
        }
      }

      case INTENTS.SKIP_DOSE: {
        if (!reminderId) {
          const upcoming = await reminderService.getUpcomingReminders(userId, 1);
          if (upcoming.length > 0) reminderId = upcoming[0]._id;
        }
        if (!reminderId) {
          return { intent, response: 'No active reminder found to skip.', data: null };
        }
        const reminder = await reminderService.dismissReminder(reminderId, userId);
        return { intent, response: RESPONSES.SKIP, data: reminder };
      }

      case INTENTS.QUERY_NEXT: {
        const upcoming = await reminderService.getUpcomingReminders(userId, 1);
        if (upcoming.length === 0) {
          return { intent, response: 'You have no upcoming medications scheduled.', data: null };
        }
        const next = upcoming[0];
        const medName = next.medicationId?.name || 'your medication';
        const time = next.scheduledTime.toLocaleString();
        return { intent, response: RESPONSES.NEXT_DOSE(medName, time), data: next };
      }

      case INTENTS.ADHERENCE_SUMMARY: {
        const stats = await adherenceService.getAdherenceStats(userId, { days: 7 });
        return { intent, response: RESPONSES.ADHERENCE(stats.adherenceRate), data: stats };
      }

      case INTENTS.EMERGENCY: {
        const user = await User.findById(userId);
        if (user && user.caregiverIds && user.caregiverIds.length > 0) {
          for (const cgId of user.caregiverIds) {
            const caregiver = await User.findById(cgId);
            if (caregiver?.phone) {
              await notificationService.sendSMS(
                caregiver.phone,
                `🚨 EMERGENCY: ${user.name} requested urgent help via MedAssist. Please check on them immediately.`
              );
            }
          }
        }
        return { intent, response: RESPONSES.EMERGENCY, data: null };
      }

      case INTENTS.DRUG_INFO: {
        return { intent, response: RESPONSES.DRUG_INFO, data: null };
      }

      default:
        return { intent: INTENTS.UNKNOWN, response: RESPONSES.UNKNOWN, data: null };
    }
  } catch (err) {
    logger.error(`Voice processing error: ${err.message}`);
    return { intent, response: RESPONSES.ERROR, data: null };
  }
}

module.exports = { processVoiceInput };
