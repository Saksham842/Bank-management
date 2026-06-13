const router = require('express').Router();
const { body } = require('express-validator');
const { getProfile, saveProfile, calculate, getDeductionSuggestions } = require('../controllers/tax.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/profile', getProfile);

router.post('/profile', [
  body('financialYear').optional().matches(/^\d{4}-\d{2}$/).withMessage('Format: YYYY-YY')
], validateFields, saveProfile);

router.post('/calculate', [
  body('grossIncome').isFloat({ min: 0 }).withMessage('Gross income must be positive')
], validateFields, calculate);

router.post('/suggestions', getDeductionSuggestions);

module.exports = router;
