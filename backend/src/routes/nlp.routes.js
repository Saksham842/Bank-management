const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { naturalSearch, extractFromText, categorizeLocal } = require('../controllers/nlp.controller');

router.use(verifyToken);
router.use(generalLimiter);

router.post('/search', naturalSearch);
router.post('/extract', extractFromText);
router.post('/categorize-local', categorizeLocal);

module.exports = router;
