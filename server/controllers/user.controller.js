const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/v1/users/me
 */
exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

/**
 * PATCH /api/v1/users/me
 */
exports.updateMe = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'phone', 'language', 'timezone', 'age', 'dateOfBirth', 'gender', 'preferences', 'emergencyContact', 'consentGiven'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });

  res.status(200).json({ success: true, data: user });
});

/**
 * DELETE /api/v1/users/me  (soft delete)
 */
exports.deleteMe = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  res.status(200).json({ success: true, message: 'Account deactivated' });
});

/**
 * GET /api/v1/users/me/caregivers
 */
exports.getMyCaregivers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('caregiverIds', 'name email phone');
  res.status(200).json({ success: true, data: user.caregiverIds });
});

/**
 * POST /api/v1/users/me/caregivers
 */
exports.linkCaregiver = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;

  const filter = {};
  if (email) filter.email = email;
  else if (phone) filter.phone = phone;
  else throw ApiError.badRequest('Provide caregiver email or phone');

  const caregiver = await User.findOne({ ...filter, role: 'caregiver', isActive: true });
  if (!caregiver) throw ApiError.notFound('Caregiver not found');

  // Add to patient's caregiverIds
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { caregiverIds: caregiver._id },
  });

  // Add patient to caregiver's patientIds
  await User.findByIdAndUpdate(caregiver._id, {
    $addToSet: { patientIds: req.user._id },
  });

  res.status(200).json({ success: true, message: 'Caregiver linked', data: { caregiverId: caregiver._id } });
});

/**
 * DELETE /api/v1/users/me/caregivers/:id
 */
exports.unlinkCaregiver = asyncHandler(async (req, res) => {
  const caregiverId = req.params.id;

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { caregiverIds: caregiverId },
  });

  await User.findByIdAndUpdate(caregiverId, {
    $pull: { patientIds: req.user._id },
  });

  res.status(200).json({ success: true, message: 'Caregiver unlinked' });
});
