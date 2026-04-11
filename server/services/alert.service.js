const twilio = require("twilio");
const Alert = require('../models/Alert');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

async function sendCaregiverAlert({ patient, caregiver, medication, type }) {
  let message;
  
  if (type === "MISSED") {
    message = `⚠️ ${patient.name} missed their ${medication?.name || 'medicine'} dose`;
  } else {
    message = `🆘 ${patient.name} needs help immediately`;
  }
  
  // 1. Console log (for demo)
  console.log("ALERT SENT:", message);
  
  // 2. Save to DB
  await Alert.create({
    patientId: patient._id,
    caregiverId: caregiver._id,
    message,
    type,
    createdAt: new Date()
  });

  // 3. Real-time WebSocket Alert
  if (global.io) {
    global.io.emit("caregiver_alert", {
      caregiverId: caregiver._id,
      patientId: patient._id,
      message,
      type
    });
  }

  // Keep SMS fallback (optional, nice for demo)
  if (caregiver && caregiver.phone) {
    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE,
        to: caregiver.phone,
      });
    } catch (e) {
      console.log("Twilio SMS failed (expected if keys missing):", e.message);
    }
  }
}

async function sendMissedDoseAlert({ user, medication }) {
  // Graceful fallback for older code if it's strictly called without a caregiver object
  const User = require('../models/User');
  const patient = await User.findById(typeof user === 'object' ? user._id : user);
  if (!patient || !patient.caregiverIds || patient.caregiverIds.length === 0) return;
  
  for (const caregiverId of patient.caregiverIds) {
    const caregiver = await User.findById(caregiverId);
    if (caregiver) {
      await sendCaregiverAlert({ patient, caregiver, medication, type: "MISSED" });
    }
  }
}

module.exports = {
  sendCaregiverAlert,
  sendMissedDoseAlert
};
