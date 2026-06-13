const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecast.controller');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', forecastController.getForecast);
router.post('/what-if', forecastController.runWhatIf);
router.post('/monte-carlo', forecastController.runMonteCarlo);
router.get('/scenarios', forecastController.getScenarios);
router.post('/scenarios', forecastController.saveScenario);
router.delete('/scenarios/:id', forecastController.deleteScenario);
router.get('/fire', forecastController.getFinancialIndependence);

module.exports = router;
