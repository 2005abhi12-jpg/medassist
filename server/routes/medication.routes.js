const router = require('express').Router();
const medController = require('../controllers/medication.controller');
const protect = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');
const validate = require('../middlewares/validate');
const audit = require('../middlewares/audit');

router.use(protect);

router.get('/search', medController.search);

router
  .route('/')
  .post(
    roleGuard('patient'),
    validate('name', 'dosage', 'startDate'),
    audit('CREATE', 'medications'),
    medController.create
  )
  .get(medController.getAll);

router
  .route('/:id')
  .get(medController.getOne)
  .patch(roleGuard('patient'), audit('UPDATE', 'medications'), medController.update)
  .delete(roleGuard('patient'), audit('DELETE', 'medications'), medController.deactivate);

module.exports = router;
