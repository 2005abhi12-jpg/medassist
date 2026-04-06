const router = require('express').Router();
const caregiverController = require('../controllers/caregiver.controller');
const protect = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');

router.use(protect, roleGuard('caregiver'));

router.get('/patients', caregiverController.getMyPatients);
router.get('/patients/:patientId/dashboard', caregiverController.getPatientDashboard);
router.get('/patients/:patientId/medications', caregiverController.getPatientMedications);
router.get('/patients/:patientId/reminders', caregiverController.getPatientReminders);

router.get('/alerts', caregiverController.getMyAlerts);
router.patch('/alerts/:id/acknowledge', caregiverController.acknowledgeAlert);

module.exports = router;
