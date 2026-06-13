const express = require('express');
const router = express.Router();
const networthController = require('../controllers/networth.controller');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/assets', networthController.getAssets);
router.post('/assets', networthController.createAsset);
router.put('/assets/:id', networthController.updateAsset);
router.delete('/assets/:id', networthController.deleteAsset);
router.get('/', networthController.getNetWorth);
router.post('/liabilities', networthController.updateLiabilities);
router.get('/history', networthController.getHistory);
router.get('/goal', networthController.getGoal);

module.exports = router;
