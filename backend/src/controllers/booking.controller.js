const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { sendSmartNotification, sendStaffNotification } = require('../utils/push');
const { uploadDocument, deleteAsset, extractPublicIdFromUrl } = require('../utils/cloudinary');

// Generate booking number
const generateBookingNumber = () => {
  const prefix = 'HB';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Check for double-booking conflict for a specific room
const hasConflict = async (roomId, checkInDate, checkOutDate, tenantId, excludeBookingId = null) => {
  const where = {
    tenantId,
    bookingRooms: { some: { roomId } },
    status: { in: ['BOOKED', 'CHECKED_IN'] },
    checkInDate: { lt: new Date(checkOutDate) },
    checkOutDate: { gt: new Date(checkInDate) },
  };
  if (excludeBookingId) where.id = { not: excludeBookingId };

  const conflict = await prisma.booking.findFirst({ where });
  return !!conflict;
};

const computeFinance = (booking) => {
  const totalPaid = booking.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
  const extraTotal = booking.extraCharges?.reduce((sum, c) => sum + parseFloat(c.amount), 0) || 0;
  const totalAmount = parseFloat(booking.totalAmount);
  
  let eventDate = booking.updatedAt;
  if (booking.status === 'COMPLETED') {
    eventDate = booking.actualCheckOut || booking.checkOutDate;
  } else if (booking.status === 'CANCELLED') {
    eventDate = booking.updatedAt;
  }

  return {
    ...booking,
    roomAmount: parseFloat(booking.roomAmount || 0),
    discount: parseFloat(booking.discount || 0),
    extraTotal,
    paidAmount: totalPaid,
    pendingAmount: Math.max(0, totalAmount - totalPaid),
    eventDate
  };
};

// GET /api/bookings
const getAllBookings = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10, search, checkInFrom, checkOutTo, roomId, sort } = req.query;
    const sortField = sort || (type === 'history' ? 'checkOutDate' : 'createdAt');
    const where = { tenantId: req.user.tenantId };

    if (roomId) {
      where.bookingRooms = {
        some: { roomId }
      };
    }

    if (status) {
      where.status = status;
    } else if (type === 'active') {
      where.status = { in: ['BOOKED', 'CHECKED_IN'] };
    } else if (type === 'history') {
      where.status = { in: ['COMPLETED', 'CANCELLED'] };
    }

    if (search) {
      where.OR = [
        { bookingNumber: { contains: search, mode: 'insensitive' } },
        { customer: { is: { name: { contains: search, mode: 'insensitive' } } } },
        { customer: { is: { mobile: { contains: search } } } },
      ];
    }

    if (checkInFrom || checkOutTo) {
      where.AND = [
        checkInFrom ? { checkInDate: { gte: new Date(checkInFrom) } } : {},
        checkOutTo ? { checkOutDate: { lte: new Date(checkOutTo) } } : {}
      ].filter(cond => Object.keys(cond).length > 0);
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          bookingRooms: { include: { room: { select: { roomNumber: true, roomType: { select: { name: true } }, floor: true } } } },
          customer: { select: { name: true, mobile: true } },
          payments: { select: { amount: true } },
          extraCharges: { select: { amount: true } },
        },
        orderBy: { [sortField]: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.booking.count({ where }),
    ]);

    const formattedBookings = bookings.map(computeFinance);

    res.json({
      success: true,
      data: formattedBookings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/bookings/:id
const getBookingById = async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: {
        bookingRooms: { include: { room: true } },
        customer: true,
        payments: { orderBy: { paidAt: 'desc' } },
        extraCharges: { orderBy: { createdAt: 'asc' } },
        user: { select: { name: true, mobile: true, role: true } },
      },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: computeFinance(booking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const {
      roomIds,          // array of room IDs
      checkInDate, checkOutDate,
      customer,         // { name, mobile, aadhaarImage, email, address }
      roomAmount,       // Calculated subtotal
      discount,         // Discount amount
      totalAmount,      // finalAmount (roomAmount - discount)
      doCheckIn = false,
      specialRequests, notes,
      paymentType,      // "ADVANCE" or "FULL"
      advanceAmount,    // if advance
      paymentMode,      // CASH, UPI, CARD
      paymentReference,
    } = req.body;

    // Validation
    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one roomId is required in roomIds[]' });
    }
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ success: false, message: 'checkInDate and checkOutDate are required' });
    }
    if (totalAmount === undefined || totalAmount === null || isNaN(parseFloat(totalAmount))) {
      return res.status(400).json({ success: false, message: 'totalAmount is required' });
    }
    if (!customer?.name || !customer?.mobile) {
      return res.status(400).json({ success: false, message: 'Customer name and mobile are required' });
    }

    // Comprehensive input constraints
    const customerName = customer.name.trim();
    if (!customerName || !/^[a-zA-Z\s]+$/.test(customerName)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid customer name.' });
    }

    const customerMobile = customer.mobile.replace(/\D/g, '');
    if (customerMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits.' });
    }

    if (customer.email && customer.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email.trim())) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
      }
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (checkIn >= checkOut) {
      return res.status(400).json({ success: false, message: 'checkOut must be after checkIn' });
    }

    const uniqueRoomIds = [...new Set(roomIds)];

    // Verify all rooms exist and belong to tenant
    const rooms = await prisma.room.findMany({
      where: { id: { in: uniqueRoomIds }, tenantId: req.user.tenantId, isActive: true },
    });
    if (rooms.length !== uniqueRoomIds.length) {
      return res.status(404).json({ success: false, message: 'One or more rooms not found or unauthorized' });
    }

    // Prevent Booking/Check-In if any room is currently undergoing cleaning
    const cleaningRooms = rooms.filter(r => r.status === 'CLEANING');
    if (cleaningRooms.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected room is currently under cleaning and unavailable for booking. Please choose another room.'
      });
    }

    // Check double-booking
    const conflictChecks = await Promise.all(
      uniqueRoomIds.map((roomId) => hasConflict(roomId, checkIn, checkOut, req.user.tenantId))
    );
    const conflictIdx = conflictChecks.findIndex((c) => c);
    if (conflictIdx !== -1) {
      const conflictRoom = rooms.find((r) => r.id === uniqueRoomIds[conflictIdx]);
      return res.status(409).json({
        success: false,
        message: `Room ${conflictRoom?.roomNumber ?? uniqueRoomIds[conflictIdx]} is not available for selected dates`,
      });
    }

    // Payment Calculation
    const totalAmt = parseFloat(totalAmount);
    let paidAmt = 0;
    let payType = 'ADVANCE';
    
    if (paymentType === 'FULL') {
      paidAmt = totalAmt;
      payType = 'FULL';
    } else if (paymentType === 'ADVANCE') {
      paidAmt = parseFloat(advanceAmount || 0);
      payType = 'ADVANCE';
    }

    if (paidAmt > totalAmt) {
      const message = paymentType === 'ADVANCE' 
        ? 'Advance amount cannot exceed total booking amount.' 
        : 'Paid amount cannot exceed total amount';
      return res.status(400).json({ success: false, message });
    }
    if (paidAmt < 0) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot be negative' });
    }

    const pendAmt = Math.max(0, totalAmt - paidAmt);
    let payStatus = 'PENDING';
    if (paidAmt === 0) payStatus = 'PENDING';
    else if (paidAmt >= totalAmt) payStatus = 'PAID';
    else payStatus = 'PARTIAL';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDay = new Date(checkIn);
    checkInDay.setHours(0, 0, 0, 0);

    if (doCheckIn && checkInDay.getTime() !== today.getTime()) {
      return res.status(400).json({ success: false, message: "Check-In is only allowed on today's date" });
    }

    const bookingStatus = doCheckIn ? 'CHECKED_IN' : 'BOOKED';

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          userId: req.user.id,
          tenantId: req.user.tenantId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          actualCheckIn: doCheckIn ? new Date() : null,
          status: bookingStatus,
          roomAmount: parseFloat(roomAmount || 0),
          discount: parseFloat(discount || 0),
          totalAmount: totalAmt,
          paidAmount: paidAmt,
          pendingAmount: pendAmt,
          paymentStatus: payStatus,
          specialRequests,
          notes,
        },
      });

      await tx.tenant.update({
        where: { id: req.user.tenantId },
        data: { totalBookings: { increment: 1 } }
      });

      await tx.bookingRoom.createMany({
        data: uniqueRoomIds.map((roomId) => ({ bookingId: booking.id, roomId })),
      });

      await tx.customer.create({
        data: {
          bookingId: booking.id,
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email || null,
          aadhaarImage: customer.aadhaarImage || 'no-image',
          cloudinaryId: customer.cloudinaryId || extractPublicIdFromUrl(customer.aadhaarImage) || null,
          address: customer.address || null,
        },
      });

      if (paidAmt > 0) {
        if (!paymentMode) throw new Error('Payment mode is required for payments');
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: paidAmt,
            mode: paymentMode,
            type: payType,
            reference: paymentReference || null,
          }
        });
      }

      if (doCheckIn) {
        await tx.room.updateMany({
          where: { id: { in: uniqueRoomIds }, tenantId: req.user.tenantId },
          data: { status: 'OCCUPIED' },
        });
      }

      return booking;
    });

    const fullBooking = await prisma.booking.findUnique({
      where: { id: result.id },
      include: {
        bookingRooms: { include: { room: true } },
        customer: true,
        payments: true,
      },
    });

    // Send smart routing notification for new booking
    const roomStr = fullBooking.bookingRooms.map(br => br.room?.roomNumber || 'N/A').filter(Boolean).join(', ') || 'N/A';
    const actorName = req.user.name || (req.user.role === 'TENANT_ADMIN' ? 'Admin' : 'Staff');

    sendSmartNotification(
      req.user.tenantId,
      req.user.id,
      req.user.role,
      '🆕 Booking Created',
      `New booking created by ${actorName} for Room ${roomStr}.`,
      'NEW_BOOKING',
      { bookingId: fullBooking.id }
    ).catch(err => console.error('Booking push error:', err.message));

    res.status(201).json({ success: true, data: fullBooking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/bookings/:id/checkin
const checkIn = async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { customer: true, bookingRooms: { include: { room: true } } },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'BOOKED') {
      return res.status(400).json({ success: false, message: 'Only BOOKED bookings can be checked in' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDay = new Date(booking.checkInDate);
    checkInDay.setHours(0, 0, 0, 0);
    if (checkInDay.getTime() !== today.getTime()) {
      return res.status(400).json({ success: false, message: 'Check-In is only allowed on the check-in date' });
    }

    // Prevent Check-In to Cleaning rooms
    const cleaningRooms = booking.bookingRooms.filter(br => br.room?.status === 'CLEANING');
    if (cleaningRooms.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete check-in. Room ${cleaningRooms.map(br => br.room?.roomNumber).join(', ')} is currently undergoing cleaning.`
      });
    }

    const roomIds = booking.bookingRooms.map((br) => br.roomId);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CHECKED_IN', actualCheckIn: new Date() },
        include: {
          bookingRooms: { include: { room: true } },
          customer: true,
          payments: true,
        },
      });
      await tx.room.updateMany({
        where: { id: { in: roomIds }, tenantId: req.user.tenantId },
        data: { status: 'OCCUPIED' },
      });
      return updated;
    });

    // Send smart routing notification for guest check-in
    const roomStr = result.bookingRooms.map(br => br.room?.roomNumber || 'N/A').filter(Boolean).join(', ') || 'N/A';
    const actorName = req.user.name || (req.user.role === 'TENANT_ADMIN' ? 'Admin' : 'Staff');

    sendSmartNotification(
      req.user.tenantId,
      req.user.id,
      req.user.role,
      '🔑 Guest Checked In',
      `Guest ${result.customer?.name || 'Guest'} checked in by ${actorName} - Room ${roomStr}.`,
      'GUEST_CHECK_IN',
      { bookingId: result.id }
    ).catch(err => console.error('Check-in push error:', err.message));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/bookings/:id/checkout
const checkOut = async (req, res) => {
  try {
    const { extraCharges, notes, collectAmount, paymentMode, reference } = req.body;

    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { payments: true, bookingRooms: true, extraCharges: true },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'CHECKED_IN') {
      return res.status(400).json({ success: false, message: 'Only CHECKED_IN bookings can be checked out' });
    }

    let oldExtraTotal = booking.extraCharges.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const baseAmount = parseFloat(booking.totalAmount) - oldExtraTotal;

    let newExtraTotal = oldExtraTotal;
    if (extraCharges && Array.isArray(extraCharges)) {
      newExtraTotal = extraCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    }
    
    const finalTotal = baseAmount + newExtraTotal;
    const totalPaidBeforeCollection = booking.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const remainingBeforeCollection = finalTotal - totalPaidBeforeCollection;
    
    const collectionValue = collectAmount ? parseFloat(collectAmount) : 0;

    const expected = Math.round(remainingBeforeCollection * 100) / 100;
    const actual = Math.round(collectionValue * 100) / 100;

    if (actual !== expected) {
      return res.status(400).json({
        success: false,
        message: `Checkout requires exact pending balance collection. Expected: ₹${expected.toFixed(2)}, Received: ₹${actual.toFixed(2)}`,
      });
    }

    const roomIds = booking.bookingRooms.map((br) => br.roomId);

    const result = await prisma.$transaction(async (tx) => {
      if (collectionValue > 0) {
        if (!paymentMode) throw new Error('Payment mode is required for collected payments');
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: collectionValue,
            mode: paymentMode,
            reference: reference || null,
          }
        });
      }

      if (extraCharges && Array.isArray(extraCharges)) {
        await tx.extraCharge.deleteMany({ where: { bookingId: booking.id } });
        if (extraCharges.length > 0) {
          await tx.extraCharge.createMany({
            data: extraCharges.map(ec => ({
              bookingId: booking.id,
              label: ec.label,
              amount: parseFloat(ec.amount || 0)
            }))
          });
        }
      }

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'COMPLETED',
          actualCheckOut: new Date(),
          paymentStatus: 'PAID',
          totalAmount: finalTotal,
          paidAmount: totalPaidBeforeCollection + collectionValue,
          pendingAmount: 0,
          notes: notes || booking.notes,
        },
        include: {
          bookingRooms: { include: { room: true } },
          customer: true,
          payments: true,
          extraCharges: true,
        },
      });



      await tx.room.updateMany({
        where: { id: { in: roomIds }, tenantId: req.user.tenantId },
        data: { status: 'CLEANING' },
      });
      return updated;
    });

    // Send smart routing notification for guest check-out
    const roomStr = result.bookingRooms.map(br => br.room?.roomNumber || 'N/A').filter(Boolean).join(', ') || 'N/A';
    const actorName = req.user.name || (req.user.role === 'TENANT_ADMIN' ? 'Admin' : 'Staff');

    sendSmartNotification(
      req.user.tenantId,
      req.user.id,
      req.user.role,
      '🚪 Guest Check-Out Completed',
      `Room ${roomStr} moved to Cleaning after checkout by ${actorName}.`,
      'GUEST_CHECK_OUT',
      { bookingId: result.id }
    ).catch(err => console.error('Check-out push error:', err.message));

    // Explicitly trigger Room Requires Cleaning alert to staff (Requirement 1.D)
    result.bookingRooms.forEach(br => {
      if (br.room) {
        sendStaffNotification(
          req.user.tenantId,
          req.user.id,
          '🧹 Room Requires Cleaning',
          `Room ${br.room.roomNumber} is now marked for cleaning.`,
          'ROOM_CLEANING',
          { roomId: br.room.id, roomNumber: br.room.roomNumber }
        ).catch(err => console.error('Housekeeping alert push error:', err.message));
      }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/bookings/:id/cancel
const cancelBooking = async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { bookingRooms: { include: { room: true } } },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this booking' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
      });

      const roomIds = booking.bookingRooms.map((br) => br.roomId);

      // Check if any OTHER active booking exists for these rooms
      const activeStays = await tx.bookingRoom.findMany({
        where: {
          roomId: { in: roomIds },
          booking: {
            id: { not: booking.id },
            status: 'CHECKED_IN',
            tenantId: req.user.tenantId
          }
        },
        select: { roomId: true }
      });

      const activeRoomIds = activeStays.map(s => s.roomId);
      const roomsToUpdate = roomIds.filter(id => !activeRoomIds.includes(id));

      if (roomsToUpdate.length > 0) {
        await tx.room.updateMany({
          where: { id: { in: roomsToUpdate } },
          data: { status: booking.status === 'CHECKED_IN' ? 'CLEANING' : 'AVAILABLE' },
        });
      }

      return b;
    });

    // Send smart routing notification for booking cancellation
    const roomStr = booking.bookingRooms?.map(br => br.room?.roomNumber || 'N/A').filter(Boolean).join(', ') || 'N/A';
    const actorName = req.user.name || (req.user.role === 'TENANT_ADMIN' ? 'Admin' : 'Staff');

    sendSmartNotification(
      req.user.tenantId,
      req.user.id,
      req.user.role,
      '❌ Booking Cancelled',
      `Booking #${updated.bookingNumber} (Room ${roomStr}) has been cancelled by ${actorName}.`,
      'BOOKING_CANCELLATION',
      { bookingId: updated.id }
    ).catch(err => console.error('Cancellation push error:', err.message));

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bookings/aadhaar/upload
const uploadAadhaar = async (req, res) => {
  try {
    console.log('=== Aadhaar Upload Debug (Cloudinary Stream) ===');
    console.log('req.file metadata:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const tenantId = req.user?.tenantId || 'global';
    
    // Upload standard memory buffer to Cloudinary
    const uploadResult = await uploadDocument(req.file.buffer, tenantId, 'aadhaar');
    
    console.log('[Cloudinary Upload] Success:', uploadResult);

    res.json({ 
      success: true, 
      data: { 
        url: uploadResult.secure_url, 
        publicId: uploadResult.public_id,
        filename: req.file.originalname
      } 
    });
  } catch (error) {
    console.error('[Cloudinary Upload] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/bookings/:id/extra-charges
const updateExtraCharges = async (req, res) => {
  try {
    const { extraCharges } = req.body;
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { payments: true, extraCharges: true },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    
    let oldExtraTotal = booking.extraCharges.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const baseAmount = parseFloat(booking.totalAmount) - oldExtraTotal;
    
    let newExtraTotal = 0;
    if (extraCharges && Array.isArray(extraCharges)) {
      newExtraTotal = extraCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    }
    
    const finalTotal = baseAmount + newExtraTotal;
    
    const totalPaid = booking.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    let paymentStatus = booking.paymentStatus;
    if (totalPaid === 0) {
      paymentStatus = 'PENDING';
    } else if (totalPaid >= finalTotal) {
      paymentStatus = 'PAID';
    } else {
      paymentStatus = 'PARTIAL';
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (extraCharges && Array.isArray(extraCharges)) {
        await tx.extraCharge.deleteMany({ where: { bookingId: booking.id } });
        if (extraCharges.length > 0) {
          await tx.extraCharge.createMany({
            data: extraCharges.map(ec => ({
              bookingId: booking.id,
              label: ec.label,
              amount: parseFloat(ec.amount || 0)
            }))
          });
        }
      }

      return await tx.booking.update({
        where: { id: booking.id },
        data: {
          totalAmount: finalTotal,
          paidAmount: totalPaid,
          pendingAmount: Math.max(0, finalTotal - totalPaid),
          paymentStatus,
        },
        include: {
          bookingRooms: { include: { room: true } },
          customer: true,
          payments: true,
          extraCharges: true,
        },
      });
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const addExtraCharge = async (req, res) => {
  try {
    const { label, amount } = req.body;
    const { id } = req.params;

    if (!label || !amount) {
      return res.status(400).json({ success: false, message: 'Label and amount are required' });
    }

    const booking = await prisma.booking.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { extraCharges: true, payments: true }
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot add charges to a closed booking' });
    }

    const amountVal = parseFloat(amount);
    const newTotal = parseFloat(booking.totalAmount) + amountVal;
    const totalPaid = booking.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    let paymentStatus = 'PENDING';
    if (totalPaid === 0) paymentStatus = 'PENDING';
    else if (totalPaid >= newTotal) paymentStatus = 'PAID';
    else paymentStatus = 'PARTIAL';

    const result = await prisma.$transaction(async (tx) => {
      const extra = await tx.extraCharge.create({
        data: { bookingId: id, label, amount: amountVal }
      });

      await tx.booking.update({
        where: { id },
        data: { 
          totalAmount: newTotal, 
          pendingAmount: Math.max(0, newTotal - totalPaid),
          paymentStatus 
        }
      });

      return extra;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllBookings, getBookingById, createBooking, checkIn, checkOut, cancelBooking, uploadAadhaar, updateExtraCharges, addExtraCharge };
