/**
 * Development starter — spins up an in-memory MongoDB,
 * seeds a test user, then boots the Express server.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

async function boot() {
  console.log('⏳ Starting in-memory MongoDB...');
  // Force older MongoDB version to avoid macOS libc++.1.dylib compatibility issues
  process.env.MONGOMS_VERSION = '6.0.4';
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Inject URI into the env config BEFORE anything else loads
  const env = require('./config/env');
  env.mongoUri = uri;
  env.port = 5000;

  console.log(`✅ In-memory MongoDB ready at ${uri}`);

  // Now load and start the app (which connects to DB + starts crons)
  require('./app');

  // Wait for the server to boot, then seed a test user
  await new Promise((r) => setTimeout(r, 2000));

  const User = require('./models/User');
  const Medication = require('./models/Medication');
  const Schedule = require('./models/Schedule');
  const Reminder = require('./models/Reminder');

  // Create test patient
  const existing = await User.findOne({ email: 'raj@example.com' });
  if (!existing) {
    const patient = await User.create({
      name: 'Raj Kumar',
      email: 'raj@example.com',
      phone: '+919876543210',
      passwordHash: 'password123',
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

    const med = await Medication.create({
      userId: patient._id,
      name: 'Metformin',
      dosage: '500mg',
      instructions: 'Take after meals',
      startDate: new Date(),
    });

    await Schedule.create({
      medicationId: med._id,
      userId: patient._id,
      times: ['08:00', '20:00'],
      recurrence: 'daily',
    });

    // Seed reminders so UI never looks empty
    const scheduleId = (await Schedule.findOne({ userId: patient._id }))._id;
    
    // 1 TRIGGERED reminder (due now)
    const localNow = new Date();
    await Reminder.create({
      scheduleId,
      userId: patient._id,
      medicationId: med._id,
      scheduledTime: localNow,
      status: 'TRIGGERED',
    });

    // 1 SCHEDULED reminder (due later)
    const later = new Date();
    later.setHours(later.getHours() + 4); 
    await Reminder.create({
      scheduleId,
      userId: patient._id,
      medicationId: med._id,
      scheduledTime: later,
      status: 'SCHEDULED',
    });

    const caregiver = await User.create({
      name: 'Dr. Sarah (Caregiver)',
      email: 'caregiver@example.com',
      phone: '+18005550199',
      passwordHash: 'password123',
      role: 'caregiver',
      patientIds: [patient._id],
    });

    patient.caregiverIds = [caregiver._id];
    await patient.save();

    console.log('🌱 Seeded test user: raj@example.com / password123');
    console.log('🌱 Seeded caregiver: caregiver@example.com / password123');
  }

  console.log('\n🎯 Backend is READY at http://localhost:5000');
  console.log('   Health check: http://localhost:5000/health');
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  process.exit(1);
});
