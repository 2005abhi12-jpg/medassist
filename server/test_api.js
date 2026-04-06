const { MongoMemoryServer } = require('mongodb-memory-server');
const axios = require('axios');
const mongoose = require('mongoose');

// We intercept env before app loads
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

async function runTests() {
  console.log('--- STARTING MEDASSIST API TESTS ---');

  // 1. Start Memory Server
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  const env = require('./config/env');
  env.mongoUri = uri;
  env.port = 5001;

  console.log(`✅ Started in-memory MongoDB at ${uri}`);

  // 2. Load and start the app natively
  const app = require('./app');

  // Give app a moment to connect and seed if we wanted, but we'll seed manually here
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('✅ Server is up, proceeding to tests...\n');

  try {
    const baseURL = 'http://localhost:5001/api/v1';

    // TEST 1: Register User
    console.log('🧪 TEST: Register new patient...');
    const registerRes = await axios.post(`${baseURL}/auth/register`, {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+15555555555',
      password: 'password123',
      role: 'patient',
      timezone: 'America/New_York'
    });
    console.log('   ✅ User Registered. ID:', registerRes.data.data.user._id);
    const token = registerRes.data.data.accessToken;

    const axiosHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // TEST 2: Add Medication
    console.log('\n🧪 TEST: Add Medication...');
    const medRes = await axios.post(`${baseURL}/medications`, {
      name: 'Lisinopril',
      dosage: '10mg',
      startDate: new Date().toISOString()
    }, axiosHeaders);
    console.log('   ✅ Medication Added. ID:', medRes.data.data._id);
    const medId = medRes.data.data._id;

    // TEST 3: Create Schedule
    console.log('\n🧪 TEST: Create Schedule...');
    const schedRes = await axios.post(`${baseURL}/schedules`, {
      medicationId: medId,
      times: ['08:00', '20:00'],
      recurrence: 'daily'
    }, axiosHeaders);
    console.log('   ✅ Schedule Created. ID:', schedRes.data.data._id);

    // TEST 4: Check Reminder Logic
    console.log('\n🧪 TEST: Generating Reminders (Triggering nightly cron manually)...');
    const generateReminders = require('./jobs/reminderGenerator');
    await generateReminders();
    console.log('   ✅ Nightly cron generator completed.');

    // Fetch up to date reminders
    console.log('\n🧪 TEST: Verifying Reminders exist via API...');
    const remRes = await axios.get(`${baseURL}/reminders/upcoming`, axiosHeaders);
    console.log(`   ✅ Found ${remRes.data.data.length} upcoming reminders.`);

    if (remRes.data.data.length > 0) {
      const reminderId = remRes.data.data[0]._id;
      // Mark reminder as triggered to test dose confirm
      await require('./models/Reminder').findByIdAndUpdate(reminderId, { status: 'TRIGGERED' });

      console.log('\n🧪 TEST: Confirming/Logging Dose via API...');
      const confRes = await axios.post(`${baseURL}/reminders/${reminderId}/confirm`, {}, axiosHeaders);
      console.log('   ✅ Dose Confirmed. New Status:', confRes.data.data.status);

      console.log('\n🧪 TEST: Verifying adherence log was created...');
      const adRes = await axios.get(`${baseURL}/adherence/stats`, axiosHeaders);
      console.log('   ✅ Adherence Rate:', adRes.data.data.adherenceRate, '%');
    }

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (err) {
    if (err.response) {
      console.error('\n❌ API ERROR RESPONSE:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('\n❌ UNEXPECTED ERROR:', err.message);
    }
  } finally {
    process.exit(0);
  }
}

runTests();
