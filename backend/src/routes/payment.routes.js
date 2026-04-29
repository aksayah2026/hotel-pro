const express = require('express');
const router = express.Router();
const {
  addPayment,
  getPaymentsByBooking,
} = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/', authenticate, addPayment);
router.get('/booking/:bookingId', authenticate, getPaymentsByBooking);

module.exports = router;
