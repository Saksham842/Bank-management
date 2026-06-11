const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolio.controller');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', portfolioController.getHoldings);
router.get('/summary', portfolioController.getSummary);
router.post('/buy', portfolioController.buyStock);
router.post('/sell', portfolioController.sellStock);
router.get('/transactions', portfolioController.getTransactions);
router.put('/price', portfolioController.updatePrice);
router.get('/allocation', portfolioController.getAllocation);
router.get('/rebalance', portfolioController.getRebalanceSuggestions);
router.get('/performance', portfolioController.getPerformance);
router.get('/analyze', portfolioController.getAnalysis);

module.exports = router;
