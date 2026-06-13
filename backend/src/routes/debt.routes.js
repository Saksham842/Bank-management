const router = require('express').Router();
const { body } = require('express-validator');
const { getAll, getById, create, update, remove, getSummary, getPayoffPlan } = require('../controllers/debt.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/', getAll);
router.get('/summary', getSummary);
router.get('/:id', getById);

router.post('/', [
  body('creditor').notEmpty().withMessage('Creditor name is required'),
  body('type').isIn(['Credit Card', 'Personal Loan', 'Home Loan', 'Car Loan', 'Education Loan', 'Medical Debt', 'Student Loan', 'Business Loan', 'Other']).withMessage('Invalid debt type'),
  body('totalBalance').isFloat({ min: 0 }).withMessage('Balance must be positive'),
  body('interestRate').isFloat({ min: 0, max: 100 }).withMessage('Interest rate must be between 0-100')
], validateFields, create);

router.post('/payoff-plan', [
  body('strategy').optional().isIn(['avalanche', 'snowball'])
], validateFields, getPayoffPlan);

router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
