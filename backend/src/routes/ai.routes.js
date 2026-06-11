const router = require('express').Router();
const { analyzeSpending, analyzeSpendingStream, decodeMerchant, scanReceipt, importPdf } = require('../controllers/ai.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimit.middleware');

router.use(verifyToken);
router.use(generalLimiter);

router.post('/analyze', analyzeSpending);
router.post('/analyze-stream', analyzeSpendingStream);

// Feature 3: Plain-English merchant attribution
router.post('/decode-merchant', decodeMerchant);

// Feature 6: Receipt scan (Gemini Vision)
router.post('/scan-receipt', scanReceipt);

// Feature 2: PDF bank statement import
router.post('/import-pdf', importPdf);

module.exports = router;
