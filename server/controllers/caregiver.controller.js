const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Medication = require('../models/Medication');
const Reminder = require('../models/Reminder');
const Alert = require('../models/Alert');
const adherenceService = require('../services/adherence.service');
const ApiError = require('../utils/ApiError');

/**
 * Verify the caregiver has access to this patient.
 */
async function verifyPatientAccess(caregiverId, patientId) {
  const caregiver = await User.findById(caregiverId);
  if (!caregiver || !caregiver.patientIds.map(String).includes(String(patientId))) {
    throw ApiError.forbidden('You do not have access to this patient');
  }
}

/**
 * GET /api/v1/caregiver/patients/:patientId/dashboard
 */
exports.getPatientDashboard = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  await verifyPatientAccess(req.user._id, patientId);

  const [patient, stats, weeklyStats, medications] = await Promise.all([
    User.findById(patientId).select('name age phone language'),
    adherenceService.getAdherenceStats(patientId, { days: 30 }),
    adherenceService.getWeeklyStats(patientId),
    Medication.find({ userId: patientId, isActive: true }).select('name dosage form'),
  ]);

  res.status(200).json({
    success: true,
    data: { patient, stats, weeklyStats, medications },
  });
});

/**
 * GET /api/v1/caregiver/patients/:patientId/medications
 */
exports.getPatientMedications = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  await verifyPatientAccess(req.user._id, patientId);

  const medications = await Medication.find({ userId: patientId, isActive: true });
  res.status(200).json({ success: true, count: medications.length, data: medications });
});

/**
 * GET /api/v1/caregiver/patients/:patientId/reminders
 */
exports.getPatientReminders = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  await verifyPatientAccess(req.user._id, patientId);

  const reminders = await Reminder.find({ userId: patientId })
    .populate('medicationId', 'name dosage')
    .sort({ scheduledTime: -1 })
    .limit(50);

  res.status(200).json({ success: true, count: reminders.length, data: reminders });
});

/**
 * GET /api/v1/caregiver/alerts
 */
exports.getMyAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.find({ caregiverId: req.user._id })
    .populate('patientId', 'name phone')
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, count: alerts.length, data: alerts });
});

/**
 * PATCH /api/v1/caregiver/alerts/:id/acknowledge
 */
exports.acknowledgeAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findOne({ _id: req.params.id, caregiverId: req.user._id });
  if (!alert) throw ApiError.notFound('Alert not found');

  alert.isRead = true;
  alert.isAcknowledged = true;
  alert.acknowledgedAt = new Date();
  await alert.save();

  res.status(200).json({ success: true, data: alert });
});

/**
 * GET /api/v1/caregiver/patients  (list linked patients)
 */
exports.getMyPatients = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('patientIds', 'name age phone language');
  res.status(200).json({ success: true, data: user.patientIds });
});
