const router = require('express').Router();
const { body } = require('express-validator');
const { getGoals, createGoal, updateGoal, deleteGoal, calculateSIP, calculateLumpsum, calculateGoal, projectGoal } = require('../controllers/sip.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/goals', getGoals);
router.get('/goals/:id/project', projectGoal);

router.post('/goals', [
  body('name').notEmpty(),
  body('targetAmount').isFloat({ min: 1 }),
  body('targetDate').isISO8601()
], validateFields, createGoal);

router.post('/calculate/sip', [
  body('monthlyInvestment').isFloat({ min: 0 }),
  body('tenureYears').isFloat({ min: 1 })
], validateFields, calculateSIP);

router.post('/calculate/lumpsum', [
  body('investment').isFloat({ min: 0 }),
  body('tenureYears').isFloat({ min: 1 })
], validateFields, calculateLumpsum);

router.post('/calculate/goal', [
  body('targetAmount').isFloat({ min: 1 }),
  body('targetDate').isISO8601()
], validateFields, calculateGoal);

router.put('/goals/:id', updateGoal);
router.delete('/goals/:id', deleteGoal);

module.exports = router;
