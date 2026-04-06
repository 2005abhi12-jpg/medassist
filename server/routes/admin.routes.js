const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const protect = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');
const audit = require('../middlewares/audit');

router.use(protect, roleGuard('admin'));

router.get('/users', adminController.getAllUsers);
router.patch('/users/:id', audit('UPDATE', 'users'), adminController.updateUser);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
