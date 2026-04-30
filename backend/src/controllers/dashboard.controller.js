const prisma = require('../lib/prisma');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: 'Tenant access required' });
    }

    const tenantFilter = { tenantId };
    const bookingTenantFilter = { booking: { tenantId } };

    const [
      totalRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      totalBookings,
      todayIncoming,
      todayOutgoing,
      todayTransactions,
      revenueResult,
      pendingPayments,
    ] = await Promise.all([
      prisma.room.count({ where: { ...tenantFilter, isActive: true } }),
      prisma.room.count({ where: { ...tenantFilter, isActive: true, status: 'AVAILABLE' } }),
      prisma.room.count({ where: { ...tenantFilter, isActive: true, status: 'OCCUPIED' } }),
      prisma.room.count({ where: { ...tenantFilter, isActive: true, status: 'CLEANING' } }),
      prisma.booking.count({ where: { ...tenantFilter, status: { in: ['BOOKED', 'CHECKED_IN'] } } }),
      
      // Incoming: Booked to arrive today
      prisma.booking.count({
        where: { ...tenantFilter, checkInDate: { gte: today, lt: tomorrow }, status: 'BOOKED' },
      }),
      
      // Outgoing: Scheduled to checkout today (whether already left or still here)
      prisma.booking.count({
        where: { ...tenantFilter, checkOutDate: { gte: today, lt: tomorrow }, status: { in: ['CHECKED_IN', 'COMPLETED'] } },
      }),

      // Transactions: Count of payments today
      prisma.payment.count({
        where: { ...bookingTenantFilter, paidAt: { gte: today, lt: tomorrow } },
      }),

      // Revenue Sum
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { ...bookingTenantFilter, paidAt: { gte: today, lt: tomorrow } },
      }),

      prisma.booking.count({
        where: { ...tenantFilter, paymentStatus: { in: ['PENDING', 'PARTIAL'] }, status: { in: ['BOOKED', 'CHECKED_IN'] } },
      }),
    ]);


    // Monthly revenue (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const weeklyRevenue = await prisma.payment.groupBy({
      by: ['paidAt'],
      _sum: { amount: true },
      where: { paidAt: { gte: sevenDaysAgo } },
      orderBy: { paidAt: 'asc' },
    });

    // Revenue by payment mode
    const revenueByMode = await prisma.payment.groupBy({
      by: ['mode'],
      _sum: { amount: true },
      where: {
        ...bookingTenantFilter,
        paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    });


    res.json({
      success: true,
      data: {
        rooms: { total: totalRooms, available: availableRooms, occupied: occupiedRooms, cleaning: cleaningRooms },
        bookings: { 
          active: totalBookings, 
          todayCheckIns: todayIncoming, 
          todayCheckOuts: todayOutgoing, 
          transactions: todayTransactions,
          pendingPayments 
        },
        revenue: {
          today: parseFloat(revenueResult._sum.amount || 0),
          byMode: revenueByMode.map((r) => ({ mode: r.mode, amount: parseFloat(r._sum.amount || 0) })),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/revenue/history
const getRevenueHistory = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    const tenantId = req.user.tenantId;
    if (!tenantId) return res.status(403).json({ success: false, message: 'Tenant access required' });
    const bookingTenantFilter = { booking: { tenantId } };

    const payments = await prisma.payment.findMany({
      where: { 
        ...bookingTenantFilter,
        paidAt: { gte: fromDate, lte: toDate } 
      },
      include: { booking: { include: { room: { select: { roomNumber: true, roomType: { select: { name: true } } } }, customer: { select: { name: true } } } } },
      orderBy: { paidAt: 'desc' },
    });


    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    res.json({ success: true, data: { payments, total, from: fromDate, to: toDate } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRevenueAnalytics = async (req, res) => {
  try {
    const { type = 'today' } = req.query;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let gte;
    let prevGte;
    let prevLte;

    if (type === 'year') {
      gte = new Date(now.getFullYear(), 0, 1);
      prevGte = new Date(now.getFullYear() - 1, 0, 1);
      prevLte = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    } else if (type === 'month') {
      gte = new Date(now.getFullYear(), now.getMonth(), 1);
      prevGte = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevLte = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else {
      gte = todayStart;
      prevGte = new Date(todayStart);
      prevGte.setDate(prevGte.getDate() - 1);
      prevLte = todayStart;
    }

    const tenantId = req.user.tenantId;
    if (!tenantId) return res.status(403).json({ success: false, message: 'Tenant access required' });
    const bookingTenantFilter = { booking: { tenantId } };
    const rawTenantFilter = `AND b."tenantId" = '${tenantId}'`;

    const [curr, prev, modeSplit, trend] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true }, where: { ...bookingTenantFilter, paidAt: { gte } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { ...bookingTenantFilter, paidAt: { gte: prevGte, lt: prevLte } } }),
      prisma.payment.groupBy({ 
        by: ['mode'], 
        _sum: { amount: true }, 
        where: { ...bookingTenantFilter, paidAt: { gte } } 
      }),
      prisma.$queryRawUnsafe(`
        SELECT 
          DATE(p."paidAt") as date, 
          SUM(p.amount)::float as amount
        FROM "payments" p
        JOIN "bookings" b ON p."bookingId" = b.id
        WHERE p."paidAt" >= $1 ${rawTenantFilter}
        GROUP BY 1
        ORDER BY 1 ASC
      `, new Date(gte.getTime() - 7 * 24 * 60 * 60 * 1000))
    ]);


    const c = parseFloat(curr?._sum?.amount || 0);
    const p = parseFloat(prev?._sum?.amount || 0);
    const change = p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100;

    res.json({
      success: true,
      data: {
        value: c,
        change,
        modeSplit: modeSplit.map(m => ({ mode: m.mode, amount: parseFloat(m._sum.amount || 0) })),
        trend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRevenueReport = async (req, res) => {
  try {
    const { type = 'month', year, month } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const tenantId = req.user.tenantId;
    if (!tenantId) return res.status(403).json({ success: false, message: 'Tenant access required' });
    const bookingTenantFilter = { booking: { tenantId } };

    if (type === 'month') {
      if (month) {
        // Specific month in a specific year
        const m = parseInt(month);
        const startDate = new Date(selectedYear, m - 1, 1);
        const endDate = new Date(selectedYear, m, 0, 23, 59, 59);

        const total = await prisma.payment.aggregate({
          _sum: { amount: true },
          where: { ...bookingTenantFilter, paidAt: { gte: startDate, lte: endDate } }
        });

        return res.json({
          success: true,
          data: {
            label: `${new Date(selectedYear, m - 1).toLocaleDateString('en-IN', { month: 'long' })} ${selectedYear}`,
            amount: parseFloat(total._sum.amount || 0)
          }
        });
      } else {
        // All months for the selected year
        const payments = await prisma.payment.findMany({
          where: {
            ...bookingTenantFilter,
            paidAt: {
              gte: new Date(selectedYear, 0, 1),
              lte: new Date(selectedYear, 11, 31, 23, 59, 59)
            }
          }
        });

        const months = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          label: new Date(selectedYear, i).toLocaleDateString('en-IN', { month: 'short' }),
          amount: 0
        }));

        payments.forEach(p => {
          const m = new Date(p.paidAt).getMonth();
          months[m].amount += parseFloat(p.amount);
        });

        return res.json({ success: true, data: months });
      }
    } else {
      // Year-wise report
      const payments = await prisma.payment.findMany({
        where: bookingTenantFilter,
        select: { amount: true, paidAt: true }
      });

      const yearsGroup = {};
      payments.forEach(p => {
        const y = new Date(p.paidAt).getFullYear();
        yearsGroup[y] = (yearsGroup[y] || 0) + parseFloat(p.amount);
      });

      const data = Object.keys(yearsGroup)
        .map(y => ({ year: parseInt(y), amount: yearsGroup[y] }))
        .sort((a, b) => b.year - a.year);

      return res.json({ success: true, data });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { 
  getDashboardStats, 
  getRevenueAnalytics, 
  getRevenueHistory, 
  getRevenueReport 
};

