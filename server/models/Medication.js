const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: { type: String, trim: true },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    form: {
      type: String,
      enum: ['tablet', 'capsule', 'liquid', 'injection', 'inhaler', 'patch', 'drops', 'other'],
      default: 'tablet',
    },
    instructions: { type: String, trim: true },
    sideEffects: [String],
    interactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medication' }],
    prescribedBy: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound index: quickly find active meds for a user
medicationSchema.index({ userId: 1, isActive: 1 });
medicationSchema.index({ name: 'text', genericName: 'text' });

module.exports = mongoose.model('Medication', medicationSchema);
