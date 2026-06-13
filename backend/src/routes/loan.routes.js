const router = require('express').Router();
const { body } = require('express-validator');
const { getLoans, createLoan, updateLoan, deleteLoan, calculateEMI, generateSchedule, getLoanSummary, compareLoans } = require('../controllers/loan.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/', getLoans);
router.get('/summary', getLoanSummary);

router.post('/', [
  body('name').notEmpty(),
  body('principal').isFloat({ min: 1 }),
  body('interestRate').isFloat({ min: 0 }),
  body('tenureMonths').isFloat({ min: 1 }),
  body('startDate').isISO8601(),
  body('emiAmount').isFloat({ min: 1 })
], validateFields, createLoan);

router.post('/calculate/emi', [
  body('principal').isFloat({ min: 1 }),
  body('interestRate').isFloat({ min: 0 }),
  body('tenureMonths').isFloat({ min: 1 })
], validateFields, calculateEMI);

router.post('/calculate/schedule', [
  body('principal').isFloat({ min: 1 }),
  body('interestRate').isFloat({ min: 0 }),
  body('tenureMonths').isFloat({ min: 1 })
], validateFields, generateSchedule);

router.post('/compare', [
  body('loans').isArray({ min: 2 })
], validateFields, compareLoans);

router.put('/:id', updateLoan);
router.delete('/:id', deleteLoan);

module.exports = router;
