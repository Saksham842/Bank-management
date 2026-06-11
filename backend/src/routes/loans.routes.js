const express = require('express');
const router = express.Router();
const loansController = require('../controllers/loans.controller');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', loansController.getLoans);
router.get('/summary', loansController.getSummary);
router.post('/', loansController.createLoan);
router.put('/:id', loansController.updateLoan);
router.delete('/:id', loansController.deleteLoan);
router.get('/:id/amortization', loansController.getAmortization);
router.post('/:id/pay-emi', loansController.payEmi);
router.post('/:id/simulate-prepayment', loansController.simulatePrepayment);

module.exports = router;
