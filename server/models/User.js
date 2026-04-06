const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, CHANNELS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by default
    },
    age: { type: Number, min: 0, max: 150 },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },

    // Patient ↔ Caregiver links
    caregiverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    patientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    caregiverPhone: { type: String, trim: true },

    preferences: {
      reminderChannel: {
        type: String,
        enum: [...Object.values(CHANNELS), 'all'],
        default: 'all',
      },
      voiceGender: { type: String, enum: ['male', 'female'], default: 'female' },
      snoozeLimit: { type: Number, default: 3, min: 1, max: 10 },
      escalationDelayMinutes: { type: Number, default: 15, min: 5, max: 60 },
    },

    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },

    consentGiven: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    refreshToken: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ caregiverIds: 1 });

// ─── Pre-save: hash password ────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ─── Instance method: compare password ──────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
