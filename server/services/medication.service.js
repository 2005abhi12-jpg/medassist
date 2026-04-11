const Medication = require('../models/Medication');
const ApiError = require('../utils/ApiError');

const Schedule = require('../models/Schedule');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { localTimeToUTC } = require('../utils/timezone');
const { REMINDER_STATUS } = require('../config/constants');

/**
 * Create a new medication for a user.
 */
async function createMedication(userId, data) {
  const { time, ...medData } = data;
  const medication = await Medication.create({ ...medData, userId });
  
  if (time) {
    const schedule = await Schedule.create({
      medicationId: medication._id,
      userId,
      times: [time],
      recurrence: 'daily'
    });
    
    const user = await User.findById(userId);
    const timezone = user && user.timezone ? user.timezone : 'UTC';
    
    let scheduledTimeUTC = localTimeToUTC(time, timezone);
    
    // If time is already past today, maybe schedule for tomorrow? But the user wants them in "Today's reminder", so we'll just create it for today.
    // Ensure the date is today's date in local time, which localTimeToUTC already uses by default.
    await Reminder.create({
      scheduleId: schedule._id,
      userId,
      medicationId: medication._id,
      scheduledTime: scheduledTimeUTC,
      status: REMINDER_STATUS.SCHEDULED,
    });
  }
  
  return medication;
}

/**
 * Get all active medications for a user.
 */
async function getUserMedications(userId, { includeInactive = false } = {}) {
  const filter = { userId };
  if (!includeInactive) filter.isActive = true;
  return Medication.find(filter).sort({ createdAt: -1 });
}

/**
 * Get a single medication by ID (ownership check).
 */
async function getMedicationById(medicationId, userId) {
  const medication = await Medication.findOne({ _id: medicationId, userId });
  if (!medication) throw ApiError.notFound('Medication not found');
  return medication;
}

/**
 * Update a medication.
 */
async function updateMedication(medicationId, userId, updates) {
  const medication = await Medication.findOneAndUpdate(
    { _id: medicationId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!medication) throw ApiError.notFound('Medication not found');
  return medication;
}

/**
 * Soft-delete a medication.
 */
async function deactivateMedication(medicationId, userId) {
  const medication = await Medication.findOneAndUpdate(
    { _id: medicationId, userId },
    { isActive: false },
    { new: true }
  );
  if (!medication) throw ApiError.notFound('Medication not found');
  return medication;
}

/**
 * Search medications by name (text search).
 */
async function searchMedications(query) {
  return Medication.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
}

module.exports = {
  createMedication,
  getUserMedications,
  getMedicationById,
  updateMedication,
  deactivateMedication,
  searchMedications,
};
