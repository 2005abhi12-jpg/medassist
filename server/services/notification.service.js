const env = require('../config/env');
const logger = require('../utils/logger');

let twilioClient = null;

/**
 * Lazy-initialize the Twilio client.
 * Returns null if credentials are not configured.
 */
function getTwilioClient() {
  if (twilioClient) return twilioClient;

  if (!env.twilio.accountSid || !env.twilio.authToken || env.twilio.accountSid.startsWith('AC')) {
    // Only initialize if real credentials are provided
    if (env.twilio.accountSid && !env.twilio.accountSid.startsWith('ACxx')) {
      try {
        const twilio = require('twilio');
        twilioClient = twilio(env.twilio.accountSid, env.twilio.authToken);
        return twilioClient;
      } catch (err) {
        logger.warn(`Twilio client init failed: ${err.message}`);
      }
    }
  }

  return null;
}

/**
 * Send an SMS message.
 *
 * @param {string} to    Recipient phone number (E.164 format)
 * @param {string} body  Message text
 * @returns {object}     Twilio message SID or mock response
 */
async function sendSMS(to, body) {
  const client = getTwilioClient();

  if (!client) {
    // Development mode — log instead of sending
    logger.info(`[SMS MOCK] To: ${to} | Body: ${body}`);
    return { sid: `MOCK_${Date.now()}`, status: 'mock_sent' };
  }

  try {
    const message = await client.messages.create({
      body,
      from: env.twilio.phoneNumber,
      to,
    });

    logger.info(`SMS sent to ${to}: SID=${message.sid}`);
    return { sid: message.sid, status: message.status };
  } catch (err) {
    logger.error(`SMS send failed to ${to}: ${err.message}`);
    return { sid: null, status: 'failed', error: err.message };
  }
}

/**
 * Initiate a voice call (placeholder with TwiML).
 *
 * @param {string} to       Recipient phone number
 * @param {string} message  Text to speak via TTS
 * @returns {object}        Call SID or mock response
 */
async function makeVoiceCall(to, message) {
  const client = getTwilioClient();

  if (!client) {
    logger.info(`[VOICE MOCK] To: ${to} | Message: ${message}`);
    return { sid: `MOCK_CALL_${Date.now()}`, status: 'mock_initiated' };
  }

  try {
    const call = await client.calls.create({
      twiml: `<Response><Say voice="Polly.Joanna">${escapeXml(message)}</Say><Gather input="speech" timeout="10" action="/api/v1/voice/transcription"><Say>Please respond now.</Say></Gather></Response>`,
      from: env.twilio.phoneNumber,
      to,
    });

    logger.info(`Voice call initiated to ${to}: SID=${call.sid}`);
    return { sid: call.sid, status: call.status };
  } catch (err) {
    logger.error(`Voice call failed to ${to}: ${err.message}`);
    return { sid: null, status: 'failed', error: err.message };
  }
}

/**
 * Send a reminder notification via the user's preferred channel.
 *
 * @param {object} user       User document
 * @param {string} message    Notification text
 * @returns {object}          Delivery result
 */
async function sendReminder(user, message) {
  const channel = user.preferences?.reminderChannel || 'sms';

  switch (channel) {
    case 'voice':
      return makeVoiceCall(user.phone, message);
    case 'sms':
      return sendSMS(user.phone, message);
    case 'all':
      // Try voice first, fall back to SMS
      const voiceResult = await makeVoiceCall(user.phone, message);
      if (voiceResult.status === 'failed') {
        return sendSMS(user.phone, message);
      }
      return voiceResult;
    default:
      return sendSMS(user.phone, message);
  }
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  sendSMS,
  makeVoiceCall,
  sendReminder,
};
