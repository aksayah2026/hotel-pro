const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

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
  return {
    ...booking,
    roomAmount: parseFloat(booking.roomAmount || 0),
    discount: parseFloat(booking.discount || 0),
    extraTotal,
    paidAmount: totalPaid,
    pendingAmount: totalAmount - totalPaid
  };
};

// GET /api/bookings
const getAllBookings = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10, search, checkInFrom, checkOutTo, sort = 'createdAt' } = req.query;
    const where = { tenantId: req.user.tenantId };

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
          payments: true,
          extraCharges: true,
        },
        orderBy: { [sort]: 'desc' },
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
      return res.status(400).json({ success: false, message: 'Paid amount cannot exceed total amount' });
    }
    if (paidAmt < 0) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot be negative' });
    }

    const pendAmt = totalAmt - paidAmt;
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
      include: { customer: true, bookingRooms: true },
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

    let newExtraTotal = 0;
    if (extraCharges && Array.isArray(extraCharges)) {
      newExtraTotal = extraCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    }
    
    const finalTotal = baseAmount + newExtraTotal;
    const totalPaidBeforeCollection = booking.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const remainingBeforeCollection = finalTotal - totalPaidBeforeCollection;
    
    const collectionValue = collectAmount ? parseFloat(collectAmount) : 0;
    const remaining = remainingBeforeCollection - collectionValue;

    if (remaining > 0) {
      return res.status(400).json({
        success: false,
        message: `Payment pending. Remaining amount: ₹${remaining.toFixed(2)}`,
        data: { totalAmount: finalTotal, paidAmount: totalPaidBeforeCollection + collectionValue, remaining },
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
      include: { bookingRooms: true },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this booking' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
    });

    if (booking.status === 'CHECKED_IN') {
      const roomIds = booking.bookingRooms.map((br) => br.roomId);
      await prisma.room.updateMany({
        where: { id: { in: roomIds }, tenantId: req.user.tenantId },
        data: { status: 'CLEANING' },
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bookings/aadhaar/upload
const uploadAadhaar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, data: { url: fileUrl, filename: req.file.filename } });
  } catch (error) {
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
          pendingAmount: finalTotal - totalPaid,
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
          pendingAmount: newTotal - totalPaid,
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
