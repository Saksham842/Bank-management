const router = require('express').Router();
const { body } = require('express-validator');
const { getBudgets, setBudget, getBudgetVsActual, getBudgetRecommendations, recalculateSpent, getBudgetHistory, saveMonthlySnapshot } = require('../controllers/budget.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/', getBudgets);
router.get('/vs-actual', getBudgetVsActual);
router.get('/recommendations', getBudgetRecommendations);
router.get('/history', getBudgetHistory);

router.post(
  '/',
  [
    body('category').notEmpty().withMessage('Category is required.'),
    body('limit').isFloat({ min: 0 }).withMessage('Limit must be a positive number.'),
    body('month').matches(/^\d{4}-\d{2}$/).withMessage('Month must be in YYYY-MM format.')
  ],
  validateFields,
  setBudget
);

router.post('/recalculate', recalculateSpent);
router.post('/snapshot', saveMonthlySnapshot);

module.exports = router;
