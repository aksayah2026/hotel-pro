const express = require('express');
const router = express.Router();
const roomTypeController = require('../controllers/roomType.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.get('/', authenticate, roomTypeController.getAllRoomTypes);
router.post('/', authenticate, requireAdmin, roomTypeController.createRoomType);
router.delete('/:id', authenticate, requireAdmin, roomTypeController.deleteRoomType);

module.exports = router;
