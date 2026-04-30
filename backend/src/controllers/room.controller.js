const prisma = require('../lib/prisma');

// GET /api/rooms
const getAllRooms = async (req, res) => {
  try {
    const { status, type, floor } = req.query;
    const where = { 
      isActive: true,
      tenantId: req.user.tenantId 
    };
    if (status) where.status = status;
    if (type) where.typeId = type;
    if (floor) where.floor = parseInt(floor);

    const rooms = await prisma.room.findMany({
      where,
      include: { 
        roomType: true,
        amenities: true 
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/rooms/available?checkIn=&checkOut=
const getAvailableRooms = async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;
    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'checkIn and checkOut dates required' });
    }

    const checkInDate  = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ success: false, message: 'checkOut must be after checkIn' });
    }

    const conflictingBookingRooms = await prisma.bookingRoom.findMany({
      where: {
        booking: {
          tenantId: req.user.tenantId,
          status: { in: ['BOOKED', 'CHECKED_IN'] },
          checkInDate: { lt: checkOutDate },
          checkOutDate: { gt: checkInDate },
        },
      },
      select: { roomId: true },
    });

    const occupiedRoomIds = conflictingBookingRooms.map((br) => br.roomId);

    const availableRooms = await prisma.room.findMany({
      where: {
        tenantId: req.user.tenantId,
        isActive: true,
        status: { not: 'MAINTENANCE' },
        id: { notIn: occupiedRoomIds },
      },
      include: { 
        roomType: true,
        amenities: true 
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    res.json({ success: true, data: availableRooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/rooms/:id
const getRoomById = async (req, res) => {
  try {
    const room = await prisma.room.findFirst({ 
      where: { 
        id: req.params.id,
        tenantId: req.user.tenantId 
      },
      include: { 
        roomType: true,
        amenities: true 
      }
    });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/rooms
const createRoom = async (req, res) => {
  try {
    const { roomNumber, type, floor, capacity, amenities, description, baseTariff } = req.body;

    if (!roomNumber || !type || !floor) {
      return res.status(400).json({ success: false, message: 'roomNumber, type, and floor are required' });
    }

    // Verify Room Type exists
    const roomType = await prisma.roomType.findFirst({
      where: { id: type, tenantId: req.user.tenantId }
    });

    if (!roomType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Room type is required. Please create room type first.' 
      });
    }

    const existing = await prisma.room.findFirst({ 
        where: { 
            roomNumber,
            tenantId: req.user.tenantId 
        } 
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Room number already exists' });
    }

    const room = await prisma.room.create({
      data: {
        roomNumber,
        typeId: type,
        tenantId: req.user.tenantId,
        floor: parseInt(floor),
        capacity: capacity ? parseInt(capacity) : 2,
        amenities: {
          connect: amenities?.map(id => ({ id })) || []
        },
        description,
        baseTariff: parseFloat(baseTariff || 0),
      },
      include: { roomType: true, amenities: true }
    });
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/rooms/:id
const updateRoom = async (req, res) => {
  try {
    const { roomNumber, type, floor, capacity, amenities, description, baseTariff } = req.body;

    // Verify ownership
    const existing = await prisma.room.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: {
        ...(roomNumber && { roomNumber }),
        ...(type && { typeId: type }),
        ...(floor && { floor: parseInt(floor) }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(amenities && { 
          amenities: {
            set: amenities.map(id => ({ id }))
          }
        }),
        ...(description !== undefined && { description }),
        ...(baseTariff !== undefined && { baseTariff: parseFloat(baseTariff) }),
      },
      include: { roomType: true, amenities: true }
    });
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/rooms/:id/status
const updateRoomStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status required' });

    const existing = await prisma.room.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // Transition Rules
    if (existing.status === 'OCCUPIED' && status === 'AVAILABLE') {
      // Check if there is an active CHECKED_IN booking for this room
      const activeBooking = await prisma.bookingRoom.findFirst({
        where: {
          roomId: req.params.id,
          booking: {
            status: 'CHECKED_IN',
            tenantId: req.user.tenantId
          }
        }
      });

      if (activeBooking) {
        return res.status(400).json({ 
          success: false, 
          message: 'Room must be checked out before marking as available. Please complete the guest checkout first.' 
        });
      }
    }

    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/rooms/:id
const deleteRoom = async (req, res) => {
  try {
    const existing = await prisma.room.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(403).json({ success: false, message: 'Unauthorized' });

    await prisma.room.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Room deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom, updateRoomStatus, getAvailableRooms };
