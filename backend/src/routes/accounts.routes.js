const router = require('express').Router();
const { body } = require('express-validator');
const { getAccounts, createAccount, getAccountById, updateAccount, deleteAccount } = require('../controllers/account.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/', getAccounts);

router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Account name is required.'),
    body('balance').optional().isNumeric().withMessage('Initial balance must be a number.'),
    body('currency').optional().isString().withMessage('Currency must be a string.'),
    body('type').optional().isIn(['savings', 'checking', 'business']).withMessage('Invalid account type.')
  ],
  validateFields,
  createAccount
);

router.get('/:id', getAccountById);

router.put(
  '/:id',
  [
    body('name').optional().notEmpty().withMessage('Account name cannot be empty.'),
    body('currency').optional().isString().withMessage('Currency must be a string.'),
    body('type').optional().isIn(['savings', 'checking', 'business']).withMessage('Invalid account type.')
  ],
  validateFields,
  updateAccount
);

router.delete('/:id', deleteAccount);

module.exports = router;
