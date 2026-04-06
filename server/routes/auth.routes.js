const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const protect = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const audit = require('../middlewares/audit');
const { authLimiter } = require('../middlewares/rateLimiter');

router.post(
  '/register',
  authLimiter,
  validate('name', 'email', 'phone', 'password'),
  audit('CREATE', 'users'),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate('email', 'password'),
  authController.login
);

router.post(
  '/refresh',
  validate('refreshToken'),
  authController.refresh
);

router.post(
  '/logout',
  protect,
  authController.logout
);

module.exports = router;
