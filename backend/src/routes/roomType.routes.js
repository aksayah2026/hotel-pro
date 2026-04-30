const express = require('express');
const router = express.Router();
const roomTypeController = require('../controllers/roomType.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.get('/', authenticate, roomTypeController.getAllRoomTypes);
router.post('/', authenticate, requireAdmin, roomTypeController.createRoomType);
router.delete('/:id', authenticate, requireAdmin, roomTypeController.deleteRoomType);

module.exports = router;
