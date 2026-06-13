const router = require('express').Router();
const { body } = require('express-validator');
const { getGroups, createGroup, updateGroup, deleteGroup, getExpenses, createExpense, deleteExpense, getBalances, createSettlement, getSettlements } = require('../controllers/split.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/groups', getGroups);
router.get('/groups/:groupId/expenses', getExpenses);
router.get('/groups/:groupId/balances', getBalances);
router.get('/groups/:groupId/settlements', getSettlements);

router.post('/groups', [
  body('name').notEmpty().withMessage('Group name is required'),
  body('members').isArray({ min: 1 }).withMessage('At least one member required')
], validateFields, createGroup);

router.post('/groups/:groupId/expenses', [
  body('description').notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('paidBy').notEmpty()
], validateFields, createExpense);

router.post('/groups/:groupId/settlements', [
  body('fromMember').notEmpty(),
  body('toMember').notEmpty(),
  body('amount').isFloat({ min: 0.01 })
], validateFields, createSettlement);

router.put('/groups/:id', updateGroup);
router.delete('/groups/:id', deleteGroup);
router.delete('/expenses/:id', deleteExpense);

module.exports = router;
