const mongoose = require('mongoose');
const { RECURRENCE } = require('../config/constants');

const scheduleSchema = new mongoose.Schema(
  {
    medicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medication',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    times: {
      type: [String], // ["08:00", "20:00"] in user-local timezone
      required: true,
      validate: {
        validator: (arr) => arr.length > 0 && arr.every((t) => /^\d{2}:\d{2}$/.test(t)),
        message: 'Each time must be in HH:MM format and at least one time is required.',
      },
    },
    recurrence: {
      type: String,
      enum: Object.values(RECURRENCE),
      default: RECURRENCE.DAILY,
    },
    daysOfWeek: {
      type: [Number], // 0=Sun … 6=Sat
      default: [0, 1, 2, 3, 4, 5, 6],
      validate: {
        validator: (arr) => arr.every((d) => d >= 0 && d <= 6),
        message: 'daysOfWeek must contain values 0-6.',
      },
    },
    windowMinutes: { type: Number, default: 5, min: 2, max: 120 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

scheduleSchema.index({ userId: 1, isActive: 1 });
scheduleSchema.index({ medicationId: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
