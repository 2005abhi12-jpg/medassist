const mongoose = require('mongoose');
const { REMINDER_STATUS, CHANNELS } = require('../config/constants');

const deliveryAttemptSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    channel: { type: String, enum: Object.values(CHANNELS) },
    success: { type: Boolean, default: false },
    errorCode: { type: String, default: null },
  },
  { _id: false }
);

const reminderSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    medicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medication',
      required: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(REMINDER_STATUS),
      default: REMINDER_STATUS.SCHEDULED,
    },
    snoozeCount: { type: Number, default: 0 },
    channel: {
      type: String,
      enum: Object.values(CHANNELS),
    },
    deliveryAttempts: [deliveryAttemptSchema],
    escalatedAt: { type: Date, default: null },
    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────
reminderSchema.index({ userId: 1, scheduledTime: 1 });
reminderSchema.index({ status: 1, scheduledTime: 1 });
reminderSchema.index({ scheduleId: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
