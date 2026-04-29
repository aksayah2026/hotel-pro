const prisma = require('../lib/prisma');

// GET /api/room-types
const getAllRoomTypes = async (req, res) => {
  try {
    const types = await prisma.roomType.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: types });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/room-types
const createRoomType = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const trimmedName = name.trim();

    const existing = await prisma.roomType.findUnique({
      where: {
        tenantId_name: {
          tenantId: req.user.tenantId,
          name: trimmedName
        }
      }
    });

    if (existing) return res.status(409).json({ success: false, message: 'Room type already exists for this tenant' });

    const type = await prisma.roomType.create({
      data: { 
        name: trimmedName,
        tenantId: req.user.tenantId
      },
    });
    res.status(201).json({ success: true, data: type });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/room-types/:id
const deleteRoomType = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it belongs to tenant
    const roomType = await prisma.roomType.findFirst({
      where: { id, tenantId: req.user.tenantId }
    });

    if (!roomType) return res.status(404).json({ success: false, message: 'Room type not found' });

    // Check if rooms use this type
    const rooms = await prisma.room.count({ where: { typeId: id, tenantId: req.user.tenantId } });
    if (rooms > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete room type currently assigned to rooms' });
    }

    await prisma.roomType.delete({ where: { id } });
    res.json({ success: true, message: 'Room type deleted successfully' });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllRoomTypes, createRoomType, deleteRoomType };
