const router = require('express').Router();
const reminderController = require('../controllers/reminder.controller');
const protect = require('../middlewares/auth');
const audit = require('../middlewares/audit');

router.use(protect);

router.get('/upcoming', reminderController.getUpcoming);
router.get('/due', reminderController.getDue);
router.get('/:id', reminderController.getOne);

router.post('/:id/confirm', audit('UPDATE', 'reminders'), reminderController.confirm);
router.post('/:id/snooze', audit('UPDATE', 'reminders'), reminderController.snooze);
router.post('/:id/dismiss', audit('UPDATE', 'reminders'), reminderController.dismiss);
router.patch('/:id', audit('UPDATE', 'reminders'), reminderController.updateReminder);
router.delete('/:id', audit('DELETE', 'reminders'), reminderController.deleteReminder);

module.exports = router;
