const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/medications', require('./medication.routes'));
router.use('/schedules', require('./schedule.routes'));
router.use('/reminders', require('./reminder.routes'));
router.use('/adherence', require('./adherence.routes'));
router.use('/caregiver', require('./caregiver.routes'));
router.use('/voice', require('./voice.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
