const router = require('express').Router();
const scheduleController = require('../controllers/schedule.controller');
const protect = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');
const validate = require('../middlewares/validate');
const audit = require('../middlewares/audit');

router.use(protect);

router
  .route('/')
  .post(
    roleGuard('patient'),
    validate('medicationId', 'times'),
    audit('CREATE', 'schedules'),
    scheduleController.create
  )
  .get(scheduleController.getAll);

router
  .route('/:id')
  .get(scheduleController.getOne)
  .patch(roleGuard('patient'), audit('UPDATE', 'schedules'), scheduleController.update)
  .delete(roleGuard('patient'), audit('DELETE', 'schedules'), scheduleController.deactivate);

module.exports = router;
