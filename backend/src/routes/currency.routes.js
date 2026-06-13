const router = require('express').Router();
const { body } = require('express-validator');
const { getWallets, createWallet, updateWallet, deleteWallet, getRates, convert, executeConversion, getTransactions, getAnalytics } = require('../controllers/currency.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/wallets', getWallets);
router.get('/rates', getRates);
router.get('/transactions', getTransactions);
router.get('/analytics', getAnalytics);

router.post('/wallets', [
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency code must be 3 letters'),
  body('balance').optional().isFloat({ min: 0 })
], validateFields, createWallet);

router.post('/convert', [
  body('from').isLength({ min: 3, max: 3 }),
  body('to').isLength({ min: 3, max: 3 }),
  body('amount').isFloat({ min: 0 })
], validateFields, convert);

router.post('/execute', [
  body('fromCurrency').isLength({ min: 3, max: 3 }),
  body('toCurrency').isLength({ min: 3, max: 3 }),
  body('fromAmount').isFloat({ min: 0 })
], validateFields, executeConversion);

router.put('/wallets/:id', updateWallet);
router.delete('/wallets/:id', deleteWallet);

module.exports = router;
