const asyncHandler = require('../utils/asyncHandler');
const medicationService = require('../services/medication.service');

/**
 * POST /api/v1/medications
 */
exports.create = asyncHandler(async (req, res) => {
  const medication = await medicationService.createMedication(req.user._id, req.body);
  res.status(201).json({ success: true, data: medication });
});

/**
 * GET /api/v1/medications
 */
exports.getAll = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const medications = await medicationService.getUserMedications(req.user._id, { includeInactive });
  res.status(200).json({ success: true, count: medications.length, data: medications });
});

/**
 * GET /api/v1/medications/:id
 */
exports.getOne = asyncHandler(async (req, res) => {
  const medication = await medicationService.getMedicationById(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: medication });
});

/**
 * PATCH /api/v1/medications/:id
 */
exports.update = asyncHandler(async (req, res) => {
  const medication = await medicationService.updateMedication(req.params.id, req.user._id, req.body);
  res.status(200).json({ success: true, data: medication });
});

/**
 * DELETE /api/v1/medications/:id
 */
exports.deactivate = asyncHandler(async (req, res) => {
  const medication = await medicationService.deactivateMedication(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: medication });
});

/**
 * GET /api/v1/medications/search?q=
 */
exports.search = asyncHandler(async (req, res) => {
  const results = await medicationService.searchMedications(req.query.q || '');
  res.status(200).json({ success: true, count: results.length, data: results });
});
