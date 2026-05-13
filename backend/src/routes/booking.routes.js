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
const multer = require('multer');

router.post('/aadhaar/upload', authenticate, (req, res, next) => {
  upload.single('aadhaar')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'Image size exceeds the limit (max 10MB)' });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ success: false, message: err.message || 'Invalid upload request' });
    }
    next();
  });
}, uploadAadhaar);

module.exports = router;
