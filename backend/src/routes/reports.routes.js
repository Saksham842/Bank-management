const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');
const { exportReport, getMonthlyReport } = require('../controllers/report.controller');

router.use(verifyToken);

router.get('/export', exportReport);
router.get('/monthly', generalLimiter, getMonthlyReport);

module.exports = router;
