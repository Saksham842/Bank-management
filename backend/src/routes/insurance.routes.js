const router = require('express').Router();
const { body } = require('express-validator');
const { getAll, getById, create, update, remove, getSummary, getCoverageAnalysis } = require('../controllers/insurance.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { validateFields } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.get('/', getAll);
router.get('/summary', getSummary);
router.get('/coverage', getCoverageAnalysis);
router.get('/:id', getById);

router.post('/', [
  body('policyType').isIn(['Life', 'Term', 'Health', 'Motor', 'Home', 'Travel', 'Critical Illness', 'Disability', 'Annuity', 'Other']).withMessage('Invalid policy type'),
  body('policyName').notEmpty().withMessage('Policy name is required'),
  body('provider').notEmpty().withMessage('Provider is required'),
  body('sumAssured').isFloat({ min: 0 }).withMessage('Sum assured must be positive'),
  body('premium').isFloat({ min: 0 }).withMessage('Premium must be positive'),
  body('startDate').isISO8601().withMessage('Start date is required')
], validateFields, create);

router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
