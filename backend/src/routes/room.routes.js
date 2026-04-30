const express = require('express');
const router = express.Router();
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
  getAvailableRooms,
} = require('../controllers/room.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.get('/', authenticate, getAllRooms);
router.get('/available', authenticate, getAvailableRooms);
router.get('/:id', authenticate, getRoomById);
router.post('/', authenticate, requireAdmin, createRoom);
router.put('/:id', authenticate, requireAdmin, updateRoom);
router.patch('/:id/status', authenticate, updateRoomStatus);
router.delete('/:id', authenticate, requireAdmin, deleteRoom);

module.exports = router;
