const Medication = require('../models/Medication');
const ApiError = require('../utils/ApiError');

/**
 * Create a new medication for a user.
 */
async function createMedication(userId, data) {
  const medication = await Medication.create({ ...data, userId });
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
