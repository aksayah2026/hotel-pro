const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  getBookingById,
  createBooking,
  checkIn,
  checkOut,
  cancelBooking,
  uploadAadhaar,
  updateExtraCharges,
  addExtraCharge,
} = require('../controllers/booking.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/', authenticate, getAllBookings);
router.get('/:id', authenticate, getBookingById);
router.post('/', authenticate, createBooking);
router.patch('/:id/checkin', authenticate, checkIn);
router.patch('/:id/checkout', authenticate, checkOut);
router.patch('/:id/extra-charges', authenticate, updateExtraCharges);
router.post('/:id/extra', authenticate, addExtraCharge);
router.patch('/:id/cancel', authenticate, cancelBooking);
router.post('/aadhaar/upload', authenticate, upload.single('aadhaar'), uploadAadhaar);

module.exports = router;
