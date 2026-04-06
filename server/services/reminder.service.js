const Reminder = require('../models/Reminder');
const AdherenceLog = require('../models/AdherenceLog');
const User = require('../models/User');
const Alert = require('../models/Alert');
const ApiError = require('../utils/ApiError');
const { REMINDER_STATUS, ADHERENCE_STATUS, ALERT_TYPE, ALERT_SEVERITY } = require('../config/constants');
const notificationService = require('./notification.service');
const logger = require('../utils/logger');

/**
 * Get reminders for a user with optional filters.
 */
async function getUserReminders(userId, { status, from, to, limit = 50 } = {}) {
  const filter = { userId };
  if (status) filter.status = status;
  if (from || to) {
    filter.scheduledTime = {};
    if (from) filter.scheduledTime.$gte = new Date(from);
    if (to) filter.scheduledTime.$lte = new Date(to);
  }

  return Reminder.find(filter)
    .populate('medicationId', 'name dosage form instructions')
    .sort({ scheduledTime: 1 })
    .limit(limit);
}

/**
 * Get the next upcoming reminders for a user.
 */
async function getUpcomingReminders(userId, limit = 5) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return Reminder.find({
    userId,
    status: { $in: [REMINDER_STATUS.SCHEDULED, REMINDER_STATUS.TRIGGERED, REMINDER_STATUS.SNOOZED, REMINDER_STATUS.TAKEN, REMINDER_STATUS.MISSED] },
    scheduledTime: { $gte: startOfToday },
  })
    .populate('medicationId', 'name dosage form instructions isActive')
    .sort({ scheduledTime: 1 })
    .limit(limit);
}

/**
 * Get a single reminder by ID.
 */
async function getReminderById(reminderId, userId) {
  const reminder = await Reminder.findOne({ _id: reminderId, userId })
    .populate('medicationId', 'name dosage form instructions');
  if (!reminder) throw ApiError.notFound('Reminder not found');
  return reminder;
}

/**
 * Confirm a dose — transition to TAKEN.
 */
async function confirmDose(reminderId, userId, { responseMethod = 'manual', transcript = null } = {}) {
  const reminder = await Reminder.findOne({ _id: reminderId, userId });
  if (!reminder) throw ApiError.notFound('Reminder not found');

  if (reminder.status === REMINDER_STATUS.TAKEN) {
    throw ApiError.badRequest('Dose already confirmed');
  }

  if (![REMINDER_STATUS.SCHEDULED, REMINDER_STATUS.TRIGGERED, REMINDER_STATUS.SNOOZED].includes(reminder.status)) {
    throw ApiError.badRequest(`Cannot confirm a reminder in "${reminder.status}" status`);
  }

  reminder.status = REMINDER_STATUS.TAKEN;
  await reminder.save();

  // Log adherence
  await AdherenceLog.create({
    userId,
    medicationId: reminder.medicationId,
    reminderId: reminder._id,
    scheduledTime: reminder.scheduledTime,
    actualTime: new Date(),
    status: ADHERENCE_STATUS.TAKEN,
    responseMethod,
    transcript,
  });

  return reminder;
}

/**
 * Snooze a reminder.
 */
async function snoozeReminder(reminderId, userId, { responseMethod = 'manual' } = {}) {
  const reminder = await Reminder.findOne({ _id: reminderId, userId });
  if (!reminder) throw ApiError.notFound('Reminder not found');

  if (![REMINDER_STATUS.TRIGGERED, REMINDER_STATUS.SNOOZED].includes(reminder.status)) {
    throw ApiError.badRequest(`Cannot snooze a reminder in "${reminder.status}" status`);
  }

  // Check snooze limit
  const user = await User.findById(userId);
  const snoozeLimit = user?.preferences?.snoozeLimit || 3;

  if (reminder.snoozeCount >= snoozeLimit) {
    // Exceeded snooze limit — mark as missed
    reminder.status = REMINDER_STATUS.MISSED;
    await reminder.save();

    await logMissedDose(reminder, userId);
    await escalateToCaregiver(reminder, userId);

    throw ApiError.badRequest('Snooze limit reached. Dose marked as missed.');
  }

  reminder.status = REMINDER_STATUS.SNOOZED;
  reminder.snoozeCount += 1;
  await reminder.save();

  // Log snooze in adherence
  await AdherenceLog.create({
    userId,
    medicationId: reminder.medicationId,
    reminderId: reminder._id,
    scheduledTime: reminder.scheduledTime,
    actualTime: new Date(),
    status: ADHERENCE_STATUS.SNOOZED,
    responseMethod,
  });

  return reminder;
}

/**
 * Dismiss / skip a reminder — mark as MISSED manually.
 */
async function dismissReminder(reminderId, userId) {
  const reminder = await Reminder.findOne({ _id: reminderId, userId });
  if (!reminder) throw ApiError.notFound('Reminder not found');

  if (reminder.status === REMINDER_STATUS.TAKEN) {
    throw ApiError.badRequest('Cannot dismiss an already-taken dose');
  }

  reminder.status = REMINDER_STATUS.MISSED;
  await reminder.save();

  await logMissedDose(reminder, userId);

  return reminder;
}

/**
 * Log a missed dose in adherence logs.
 */
async function logMissedDose(reminder, userId) {
  await AdherenceLog.create({
    userId,
    medicationId: reminder.medicationId,
    reminderId: reminder._id,
    scheduledTime: reminder.scheduledTime,
    actualTime: null,
    status: ADHERENCE_STATUS.MISSED,
    responseMethod: 'manual',
  });
}

/**
 * Escalate missed dose to caregivers.
 */
async function escalateToCaregiver(reminder, userId) {
  try {
    const patient = await User.findById(userId);
    if (!patient || !patient.caregiverIds || patient.caregiverIds.length === 0) return;

    const medication = await require('../models/Medication').findById(reminder.medicationId);
    const medName = medication ? medication.name : 'a medication';

    for (const caregiverId of patient.caregiverIds) {
      // Create alert
      await Alert.create({
        type: ALERT_TYPE.MISSED_DOSE,
        severity: ALERT_SEVERITY.HIGH,
        patientId: userId,
        caregiverId,
        reminderId: reminder._id,
        message: `${patient.name} missed their ${medName} dose scheduled at ${reminder.scheduledTime.toISOString()}.`,
      });

      // Send SMS notification
      const caregiver = await User.findById(caregiverId);
      if (caregiver && caregiver.phone) {
        await notificationService.sendSMS(
          caregiver.phone,
          `⚠️ MedAssist Alert: ${patient.name} missed their ${medName} dose. Please check on them.`
        );
      }
    }

    reminder.status = REMINDER_STATUS.ALERT_SENT;
    reminder.escalatedAt = new Date();
    await reminder.save();
  } catch (err) {
    logger.error(`Escalation failed for reminder ${reminder._id}: ${err.message}`);
  }
}

module.exports = {
  getUserReminders,
  getUpcomingReminders,
  getReminderById,
  confirmDose,
  snoozeReminder,
  dismissReminder,
  escalateToCaregiver,
  logMissedDose,
};
