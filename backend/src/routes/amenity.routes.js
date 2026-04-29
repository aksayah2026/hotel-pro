const express = require('express');
const router = express.Router();
const amenityController = require('../controllers/amenity.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.get('/', authenticate, amenityController.getAllAmenities);
router.post('/', authenticate, requireAdmin, amenityController.createAmenity);
router.delete('/:id', authenticate, requireAdmin, amenityController.deleteAmenity);

module.exports = router;
