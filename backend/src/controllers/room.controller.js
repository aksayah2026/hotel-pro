const prisma = require('../lib/prisma');
const { sendAdminNotification, sendStaffNotification } = require('../utils/push');

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
        status: 'AVAILABLE',
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

    // Comprehensive input constraints
    const cleanRoomNumber = roomNumber.toString().trim();
    if (!cleanRoomNumber || !/^[a-zA-Z0-9-]+$/.test(cleanRoomNumber)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid room number (alphanumeric only).' });
    }
    if (isNaN(Number(floor)) || isNaN(Number(capacity || 0))) {
      return res.status(400).json({ success: false, message: 'Floor and Capacity must accept numbers only.' });
    }
    const tariff = Number(baseTariff);
    if (isNaN(tariff) || tariff < 0) {
      return res.status(400).json({ success: false, message: 'Amount field accepts numbers only.' });
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
        roomNumber: cleanRoomNumber,
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

    // Strictly validate room inputs if provided
    if (roomNumber !== undefined) {
      const cleanRoomNumber = roomNumber.toString().trim();
      if (!cleanRoomNumber || !/^[a-zA-Z0-9-]+$/.test(cleanRoomNumber)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid room number (alphanumeric only).' });
      }
    }
    if (floor !== undefined && isNaN(Number(floor))) {
      return res.status(400).json({ success: false, message: 'Floor field accepts numbers only.' });
    }
    if (capacity !== undefined && isNaN(Number(capacity))) {
      return res.status(400).json({ success: false, message: 'Capacity field accepts numbers only.' });
    }
    if (baseTariff !== undefined) {
      const tariff = Number(baseTariff);
      if (isNaN(tariff) || tariff < 0) {
        return res.status(400).json({ success: false, message: 'Amount field accepts numbers only.' });
      }
    }

    // Verify ownership
    const existing = await prisma.room.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!existing) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: {
        ...(roomNumber && { roomNumber: roomNumber.toString().trim() }),
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

    // 1. Fetch any active checked-in booking for this room
    const activeBooking = await prisma.bookingRoom.findFirst({
      where: {
        roomId: req.params.id,
        booking: {
          status: 'CHECKED_IN',
          tenantId: req.user.tenantId
        }
      }
    });

    // 2. Rule: Do NOT allow AVAILABLE while active guest is still checked in
    if (status === 'AVAILABLE' && activeBooking) {
      return res.status(400).json({
        success: false,
        message: 'Cannot set room as Available because a guest is actively checked in. Please complete guest checkout first.'
      });
    }

    // 3. Rule: Do NOT allow OCCUPIED without an active booking/checkin
    if (status === 'OCCUPIED' && !activeBooking) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark room as Occupied because there is no active checked-in booking for this room.'
      });
    }

    // 4. Specific transition restriction (replaced with active booking logic)
    if (existing.status === 'CLEANING' && status === 'OCCUPIED' && !activeBooking) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark a room as Occupied directly from Cleaning unless an active stay is ongoing.'
      });
    }

    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: { status },
    });

    // Trigger real-time status change alerts
    const actorName = req.user.name || (req.user.role === 'TENANT_ADMIN' ? 'Admin' : 'Staff');

    // 1. If Room returns to OCCUPIED from CLEANING: Notify Admin & Staff (Active Stay Housekeeping Finished)
    if (existing.status === 'CLEANING' && status === 'OCCUPIED') {
      const title = '🧹 Stay Cleaning Completed';
      const message = `Room ${room.roomNumber} cleaning completed and restored to Occupied status during active stay by ${actorName}.`;

      sendAdminNotification(
        req.user.tenantId,
        req.user.id,
        title,
        message,
        'ROOM_CLEANING_COMPLETED',
        { roomId: room.id, roomNumber: room.roomNumber }
      ).catch(err => console.error('Active cleaning push error (admin):', err.message));

      sendStaffNotification(
        req.user.tenantId,
        req.user.id,
        title,
        message,
        'ROOM_CLEANING_COMPLETED',
        { roomId: room.id, roomNumber: room.roomNumber }
      ).catch(err => console.error('Active cleaning push error (staff):', err.message));
    }

    // 2. If Staff completes post-checkout cleaning (CLEANING -> AVAILABLE): Notify Admin
    if (req.user.role === 'STAFF' && existing.status === 'CLEANING' && status === 'AVAILABLE') {
      sendAdminNotification(
        req.user.tenantId,
        req.user.id,
        '✅ Room Ready',
        `Room ${room.roomNumber} cleaning completed and marked as Available by ${actorName}.`,
        'ROOM_READY',
        { roomId: room.id, roomNumber: room.roomNumber }
      ).catch(err => console.error('Room ready push error:', err.message));
    }

    // 3. If Room becomes CLEANING: Notify Staff
    if (status === 'CLEANING') {
      sendStaffNotification(
        req.user.tenantId,
        req.user.id,
        '🧹 Room Requires Cleaning',
        `Room ${room.roomNumber} is now marked for cleaning.`,
        'ROOM_CLEANING',
        { roomId: room.id, roomNumber: room.roomNumber }
      ).catch(err => console.error('Housekeeping push error:', err.message));
    }

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
