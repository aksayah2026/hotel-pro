const prisma = require('../lib/prisma');

// POST /api/payments
const addPayment = async (req, res) => {
  try {
    const { bookingId, amount, mode, reference, notes } = req.body;

    if (!bookingId || amount === undefined || !mode) {
      return res.status(400).json({ success: false, message: 'bookingId, amount, mode required' });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true },
    });
    
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Cannot add payment to this booking' });
    }

    const totalPaid = booking.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalAmount = parseFloat(booking.totalAmount);
    const remainingBalance = totalAmount - totalPaid;

    // 1. Validate if payment is already completed
    if (remainingBalance <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment already completed. Additional payments are not allowed.' 
      });
    }

    // 2. Validate if payment amount exceeds remaining balance
    if (paymentAmount > remainingBalance) {
      return res.status(400).json({ 
        success: false, 
        message: `Payment amount exceeds the remaining balance. Maximum allowed is ₹${remainingBalance.toFixed(2)}` 
      });
    }

    // 3. Prevent duplicate rapid payments (within last 3 seconds)
    const timeWindow = new Date(Date.now() - 3000);
    const duplicatePayment = await prisma.payment.findFirst({
      where: {
        bookingId,
        amount: paymentAmount,
        mode,
        createdAt: { gte: timeWindow }
      }
    });
    if (duplicatePayment) {
      return res.status(400).json({ 
        success: false, 
        message: 'Duplicate payment detected. Please wait a moment and try again.' 
      });
    }

    const newTotalPaid = totalPaid + paymentAmount;
    const pendAmt = Math.max(0, totalAmount - newTotalPaid);

    let payStatus = 'PENDING';
    if (newTotalPaid >= totalAmount) payStatus = 'PAID';
    else if (newTotalPaid > 0) payStatus = 'PARTIAL';

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: { 
          bookingId, 
          amount: paymentAmount, 
          mode, 
          type: 'REMAINING',
          reference, 
          notes 
        },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { 
          paidAmount: newTotalPaid, 
          pendingAmount: pendAmt,
          paymentStatus: payStatus 
        },
      })
    ]);

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payments/booking/:bookingId
const getPaymentsByBooking = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { bookingId: req.params.bookingId },
      orderBy: { paidAt: 'desc' },
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { addPayment, getPaymentsByBooking };
