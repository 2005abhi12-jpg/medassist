const router = require('express').Router();
const protect = require('../middlewares/auth');
const Alert = require('../models/Alert');

router.use(protect);

router.get('/', async (req, res) => {
  const isCaregiver = req.user.role === 'caregiver';
  const query = isCaregiver ? { caregiverId: req.user._id } : { patientId: req.user._id };
  const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(10);
  res.status(200).json({ success: true, count: alerts.length, data: alerts });
});

module.exports = router;
