const express = require('express');
const router = express.Router();
const amenityController = require('../controllers/amenity.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.get('/', authenticate, amenityController.getAllAmenities);
router.post('/', authenticate, requireAdmin, amenityController.createAmenity);
router.delete('/:id', authenticate, requireAdmin, amenityController.deleteAmenity);

module.exports = router;
