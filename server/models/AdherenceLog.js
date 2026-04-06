const mongoose = require('mongoose');
const { ADHERENCE_STATUS } = require('../config/constants');

const adherenceLogSchema = new mongoose.Schema(
  {
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
    reminderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reminder',
    },
    scheduledTime: { type: Date, required: true },
    actualTime: { type: Date, default: null }, // null if MISSED
    status: {
      type: String,
      enum: Object.values(ADHERENCE_STATUS),
      required: true,
    },
    responseMethod: {
      type: String,
      enum: ['voice', 'sms', 'manual'],
      default: 'manual',
    },
    transcript: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

adherenceLogSchema.index({ userId: 1, createdAt: -1 });
adherenceLogSchema.index({ userId: 1, medicationId: 1, createdAt: -1 });
adherenceLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AdherenceLog', adherenceLogSchema);
