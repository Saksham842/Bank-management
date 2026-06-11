const router = require('express').Router();
const { body } = require('express-validator');
const { getTransactions, getTransactionStats, createTransaction, updateTransaction, deleteTransaction } = require('../controllers/transaction.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/', getTransactions);
router.get('/stats', getTransactionStats);

router.post(
  '/',
  [
    body('accountId').notEmpty().withMessage('AccountId is required.'),
    body('type').isIn(['DEBIT', 'CREDIT']).withMessage('Type must be DEBIT or CREDIT.'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number.'),
    body('category').optional().isString(),
    body('description').optional().isString(),
    body('date').optional().isISO8601().withMessage('Provide a valid date format.'),
    body('isRecurring').optional().isBoolean().withMessage('isRecurring must be a boolean.'),
    body('recurringFreq').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid recurring frequency.'),
    body('tags').optional().isArray().withMessage('Tags must be an array.')
  ],
  validateFields,
  createTransaction
);

router.put(
  '/:id',
  [
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number.'),
    body('type').optional().isIn(['DEBIT', 'CREDIT']).withMessage('Type must be DEBIT or CREDIT.'),
    body('date').optional().isISO8601().withMessage('Provide a valid date format.'),
    body('isRecurring').optional().isBoolean().withMessage('isRecurring must be a boolean.')
  ],
  validateFields,
  updateTransaction
);

router.delete('/:id', deleteTransaction);

module.exports = router;
