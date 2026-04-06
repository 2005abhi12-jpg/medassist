const mongoose = require('mongoose');
const { ALERT_TYPE, ALERT_SEVERITY } = require('../config/constants');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(ALERT_TYPE),
      required: true,
    },
    severity: {
      type: String,
      enum: Object.values(ALERT_SEVERITY),
      default: ALERT_SEVERITY.MEDIUM,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reminderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reminder',
      default: null,
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    isAcknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

alertSchema.index({ caregiverId: 1, isRead: 1, createdAt: -1 });
alertSchema.index({ patientId: 1, type: 1 });

module.exports = mongoose.model('Alert', alertSchema);
