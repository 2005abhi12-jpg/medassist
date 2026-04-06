const router = require('express').Router();
const adherenceController = require('../controllers/adherence.controller');
const protect = require('../middlewares/auth');

router.use(protect);

router.get('/', adherenceController.getLogs);
router.get('/stats', adherenceController.getStats);
router.get('/stats/weekly', adherenceController.getWeeklyStats);
router.get('/stats/by-medication', adherenceController.getStatsByMedication);

module.exports = router;
