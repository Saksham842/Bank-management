const express = require('express');
const router = express.Router();
const recurringController = require('../controllers/recurring.controller');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', recurringController.getSubscriptions);
router.post('/', recurringController.createSubscription);
router.put('/:id', recurringController.updateSubscription);
router.delete('/:id', recurringController.deleteSubscription);
router.post('/:id/mark-paid', recurringController.markBillingPaid);
router.get('/detect', recurringController.detectRecurring);
router.get('/upcoming', recurringController.getUpcomingPayments);
router.get('/stats', recurringController.getRecurringStats);

module.exports = router;
