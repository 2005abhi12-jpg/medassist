/**
 * Seed script — populates the database with test data.
 *
 * Usage:  node utils/seed.js
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Medication = require('../models/Medication');
const Schedule = require('../models/Schedule');

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB');

  // Clean existing data
  await User.deleteMany({});
  await Medication.deleteMany({});
  await Schedule.deleteMany({});

  // ─── Create a patient ────────────────────────────
  const patient = await User.create({
    name: 'Raj Kumar',
    email: 'raj@example.com',
    phone: '+919876543210',
    passwordHash: 'password123', // will be hashed by pre-save hook
    role: 'patient',
    age: 72,
    language: 'en',
    timezone: 'Asia/Kolkata',
    consentGiven: true,
    preferences: {
      reminderChannel: 'sms',
      voiceGender: 'female',
      snoozeLimit: 3,
      escalationDelayMinutes: 15,
    },
  });
  console.log(`✓ Patient created: ${patient.name} (${patient._id})`);

  // ─── Create a caregiver ──────────────────────────
  const caregiver = await User.create({
    name: 'Priya Kumar',
    email: 'priya@example.com',
    phone: '+919876543211',
    passwordHash: 'password123',
    role: 'caregiver',
    age: 45,
    language: 'en',
    timezone: 'Asia/Kolkata',
    patientIds: [patient._id],
  });
  console.log(`✓ Caregiver created: ${caregiver.name} (${caregiver._id})`);

  // Link caregiver to patient
  patient.caregiverIds = [caregiver._id];
  await patient.save();

  // ─── Create an admin ─────────────────────────────
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@medassist.com',
    phone: '+919876543212',
    passwordHash: 'admin123',
    role: 'admin',
    language: 'en',
    timezone: 'UTC',
  });
  console.log(`✓ Admin created: ${admin.name} (${admin._id})`);

  // ─── Create medications ──────────────────────────
  const med1 = await Medication.create({
    userId: patient._id,
    name: 'Metformin',
    genericName: 'metformin hydrochloride',
    dosage: '500mg',
    form: 'tablet',
    instructions: 'Take after meals',
    startDate: new Date(),
    prescribedBy: 'Dr. Sharma',
  });

  const med2 = await Medication.create({
    userId: patient._id,
    name: 'Amlodipine',
    genericName: 'amlodipine besylate',
    dosage: '5mg',
    form: 'tablet',
    instructions: 'Take in the morning',
    startDate: new Date(),
    prescribedBy: 'Dr. Patel',
  });

  console.log(`✓ Medications created: ${med1.name}, ${med2.name}`);

  // ─── Create schedules ────────────────────────────
  await Schedule.create({
    medicationId: med1._id,
    userId: patient._id,
    times: ['08:00', '20:00'],
    recurrence: 'daily',
  });

  await Schedule.create({
    medicationId: med2._id,
    userId: patient._id,
    times: ['09:00'],
    recurrence: 'daily',
  });

  console.log('✓ Schedules created');

  console.log('\n🎉 Seed complete!');
  console.log('\nTest credentials:');
  console.log('  Patient:   raj@example.com / password123');
  console.log('  Caregiver: priya@example.com / password123');
  console.log('  Admin:     admin@medassist.com / admin123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
