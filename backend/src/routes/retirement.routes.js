const router = require('express').Router();
const { body } = require('express-validator');
const {
  getPlans, getPlan, createPlan, updatePlan, deletePlan,
  getPensionAccounts, createPensionAccount, updatePensionAccount, deletePensionAccount,
  getProjection, getReadinessScore, getMonteCarlo, getOptimize
} = require('../controllers/retirement.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/plans', getPlans);
router.get('/plans/:id', getPlan);
router.get('/plans/:id/projection', getProjection);
router.get('/plans/:id/readiness', getReadinessScore);
router.get('/plans/:id/monte-carlo', getMonteCarlo);
router.get('/optimize', getOptimize);

router.post('/plans', [
  body('name').notEmpty().withMessage('Plan name is required'),
  body('targetCorpus').isFloat({ min: 0 }).withMessage('Target corpus must be a positive number'),
  body('currentAge').isInt({ min: 18, max: 80 }).withMessage('Current age must be between 18 and 80'),
  body('retirementAge').isInt({ min: 30, max: 80 }).withMessage('Retirement age must be between 30 and 80')
], validateFields, createPlan);

router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

router.get('/accounts', getPensionAccounts);
router.post('/accounts', [
  body('accountType').isIn(['EPF', 'PPF', 'NPS', 'Superannuation', '401k', 'IRA', 'Pension', 'Annuity', 'Other']).withMessage('Invalid account type')
], validateFields, createPensionAccount);
router.put('/accounts/:id', updatePensionAccount);
router.delete('/accounts/:id', deletePensionAccount);

module.exports = router;
