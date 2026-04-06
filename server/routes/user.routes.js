const router = require('express').Router();
const userController = require('../controllers/user.controller');
const protect = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');

router.use(protect); // All user routes require auth

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.delete('/me', userController.deleteMe);

// Caregiver linking (patient only)
router.get('/me/caregivers', roleGuard('patient'), userController.getMyCaregivers);
router.post('/me/caregivers', roleGuard('patient'), userController.linkCaregiver);
router.delete('/me/caregivers/:id', roleGuard('patient'), userController.unlinkCaregiver);

module.exports = router;
