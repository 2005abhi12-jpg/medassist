const asyncHandler = require('../utils/asyncHandler');
const voiceService = require('../services/voice.service');
const ApiError = require('../utils/ApiError');
const { askAI } = require("../services/ai.service");

/**
 * POST /api/v1/voice/intent
 *
 * Accept a voice transcript, classify the intent, and execute the action.
 *
 * Body: { transcript: string, reminderId?: string }
 */
exports.processIntent = asyncHandler(async (req, res) => {
  const { transcript } = req.body;

  if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
    throw ApiError.badRequest('Transcript is required');
  }

  const text = transcript.toLowerCase();
  
  const Reminder = require('../models/Reminder');
  const reminderService = require('../services/reminder.service');

  const reminder = await Reminder.findOne({
    userId: req.user._id,
    status: { $in: ["TRIGGERED", "SCHEDULED"] }
  })
    .sort({ scheduledTime: 1 })
    .populate('medicationId');

  // NEXT DOSE
  if (text.includes("next")) {
    if (!reminder) {
      return res.json({ data: { response: "⚠️ You have no upcoming medications" } });
    }
    const medName = reminder.medicationId?.name || "your medicine";
    const timeStr = new Date(reminder.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return res.json({ data: { response: `💊 Your next medicine is ${medName} at ${timeStr}` } });
  }

  // CREATE REMINDER
  if (text.includes("create") || text.includes("add")) {
    return res.json({
      data: { response: "🛠️ Please use the app to add a new medication" }
    });
  }

  // MISSED DOSE
  if (text.includes("missed")) {
    if (reminder && reminder.status === "TRIGGERED") {
      reminder.status = "MISSED";
      await reminder.save();
    }
    return res.json({
      data: { response: "⚠️ Okay, marking your dose as missed" }
    });
  }

  // EMERGENCY HELP
  if (text.includes("help") || text.includes("emergency")) {
    const alertService = require('../services/alert.service');
    const User = require('../models/User');
    const caregivers = await User.find({ _id: { $in: req.user.caregiverIds } });
    
    for (const caregiver of caregivers) {
      await alertService.sendCaregiverAlert({
        patient: req.user,
        caregiver,
        type: "HELP"
      });
    }

    return res.json({
      data: { response: "🆘 Alert sent to your caregiver" }
    });
  }

  // AI QUESTION ANSWERING — detect questions BEFORE the "no reminder" guard
  const isQuestion = text.includes("what") || text.includes("how") || text.includes("why") ||
    text.includes("side effect") || text.includes("tell") || text.includes("can") ||
    text.includes("should") || text.includes("when") || text.includes("does") ||
    text.includes("is") || text.includes("explain") || text.includes("describe") ||
    text.includes("?");

  if (isQuestion) {
    try {
      const medName = reminder?.medicationId?.name || "Unknown";
      const questionWithContext = `User is asking about their medicine.\nMedicine: ${medName}\n\nQuestion: ${transcript}`;
      const answer = await askAI(questionWithContext);
      return res.json({ data: { response: answer } });
    } catch (err) {
      console.error("AI Service Error:", err.message);
      return res.json({ data: { response: "❓ I didn't understand. Please try again." } });
    }
  }

  if (!reminder) {
    return res.json({
      data: { response: "⚠️ No active medication to mark as taken" }
    });
  }

  // CONFIRM
  if (text.includes("took") || text.includes("done")) {
    if (reminder.status !== "TRIGGERED") {
      return res.json({
        data: { response: "⏰ It's not time yet for this medicine" }
      });
    }

    // mark taken
    await reminderService.confirmDose(reminder._id, req.user._id, { responseMethod: 'voice', transcript });
    return res.json({ data: { response: "✅ Marked your medicine as taken" } });
  }

  // SNOOZE
  if (text.includes("later") || text.includes("remind")) {
    if (reminder.status !== "TRIGGERED") {
      return res.json({
        data: { response: "⏰ No active reminder to snooze" }
      });
    }
    
    // mark snoozed
    await reminderService.snoozeReminder(reminder._id, req.user._id, { responseMethod: 'voice' });
    return res.json({
      data: { response: "⏰ Okay, I will remind you later" }
    });
  }

  // FALLBACK
  return res.json({ data: { response: "❓ I didn't understand. Try asking about your medicine or say 'took it' to confirm a dose." } });
});

/**
 * POST /api/v1/voice/incoming
 *
 * Twilio voice webhook — returns TwiML for incoming calls.
 * This is a placeholder that generates a greeting.
 */
exports.incomingCall = asyncHandler(async (req, res) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Welcome to MedAssist. I can help you manage your medications.
    Say "took it" to confirm your dose,
    "later" to snooze,
    or "what's next" to hear your upcoming medications.
  </Say>
  <Gather input="speech" timeout="10" action="/api/v1/voice/transcription" method="POST">
    <Say voice="Polly.Joanna">Please speak now.</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't hear anything. Goodbye.</Say>
</Response>`;

  res.type('text/xml').send(twiml);
});

/**
 * POST /api/v1/voice/transcription
 *
 * Twilio sends the speech transcription here.
 * We classify the intent and respond with TwiML.
 */
exports.transcription = asyncHandler(async (req, res) => {
  const transcript = req.body.SpeechResult || '';

  // For Twilio webhooks, we need the user's phone to look up their account
  const callerPhone = req.body.From || '';

  // Look up user by phone
  const User = require('../models/User');
  const user = await User.findOne({ phone: callerPhone, isActive: true });

  if (!user) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I couldn't find your account. Please register on our app first. Goodbye.</Say>
</Response>`;
    return res.type('text/xml').send(twiml);
  }

  const result = await voiceService.processVoiceInput(transcript, user._id);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(result.response)}</Say>
</Response>`;

  res.type('text/xml').send(twiml);
});

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
