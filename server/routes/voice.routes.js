const router = require('express').Router();
const voiceController = require('../controllers/voice.controller');
const protect = require('../middlewares/auth');

// Authenticated intent processing endpoint
router.post('/intent', protect, voiceController.processIntent);

// Twilio webhooks (no JWT auth — validated by Twilio signature in production)
router.post('/incoming', voiceController.incomingCall);
router.post('/transcription', voiceController.transcription);

module.exports = router;
