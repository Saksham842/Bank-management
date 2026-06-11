const router = require('express').Router();
const { body } = require('express-validator');
const { register, login, refreshToken, logout, enable2FA, verify2FA, disable2FA } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Provide a valid email address.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
  ],
  validateFields,
  register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Provide a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  validateFields,
  login
);

router.post('/refresh', refreshToken);
router.post('/logout', logout);

// MFA routes
router.post('/2fa/enable', verifyToken, enable2FA);
router.post('/2fa/verify', verifyToken, [
  body('token').notEmpty().withMessage('MFA token is required.')
], validateFields, verify2FA);
router.post('/2fa/disable', verifyToken, disable2FA);

module.exports = router;
