const prisma = require('../lib/prisma');

// GET /api/dashboard/super-admin/stats
const getSuperAdminStats = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const selectedYear = parseInt(year);
    const now = new Date();

    // 1. Basic Tenant Stats
    const tenants = await prisma.tenant.findMany({
      where: { isDeleted: false, isSystem: false },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE', endDate: { gte: now } },
          include: { plan: true }
        }
      }
    });

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.subscriptions.length > 0).length;
    
    // 2. Revenue Calculations (SaaS and Booking)
    // SaaS Revenue: Sum of all completed SaaS payments
    const saasPayments = await prisma.saaSPayment.findMany({
      where: { status: 'COMPLETED' },
      include: { plan: true, tenant: true }
    });

    const totalSaasRevenue = saasPayments.reduce((sum, p) => sum + p.amount, 0);

    // 3. Monthly SaaS Revenue Trend
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(selectedYear, i).toLocaleDateString('en-IN', { month: 'short' }),
      amount: 0
    }));

    saasPayments.forEach(p => {
      const pDate = new Date(p.paidAt || p.createdAt);
      if (pDate.getFullYear() === selectedYear) {
        const m = pDate.getMonth();
        monthlyRevenue[m].amount += p.amount;
      }
    });

    // 4. Plan-wise Breakdown (SaaS)
    const planCounts = {};
    saasPayments.forEach(p => {
      const planName = p.plan.name;
      if (!planCounts[planName]) {
        planCounts[planName] = { plan: planName, revenue: 0, count: 0 };
      }
      planCounts[planName].revenue += p.amount;
      planCounts[planName].count++;
    });
    const planWise = Object.values(planCounts);

    // 5. Tenant-wise Breakdown (Top 10 by SaaS Revenue)
    const saasRevenueByTenant = await prisma.saaSPayment.groupBy({
      by: ['tenantId'],
      _sum: { amount: true },
      where: { status: 'COMPLETED' }
    });

    const tenantRevenue = await Promise.all(
      saasRevenueByTenant.map(async (item) => {
        const tenant = await prisma.tenant.findUnique({
          where: { id: item.tenantId },
          select: { businessName: true }
        });
        return {
          name: tenant?.businessName || 'Unknown',
          revenue: item._sum.amount || 0
        };
      })
    );

    tenantRevenue.sort((a, b) => b.revenue - a.revenue);
    const topTenants = tenantRevenue.slice(0, 10);

    // 6. Expiring Soon (7 days)
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    const expiringSoon = tenants.filter(t => {
      const sub = t.subscriptions[0];
      return sub && new Date(sub.endDate) <= nextWeek;
    }).map(t => ({
      id: t.id,
      businessName: t.businessName,
      subscriptions: t.subscriptions
    }));

    // 7. Recent Tenants
    const recentRaw = await prisma.tenant.findMany({
      where: { isDeleted: false, isSystem: false },
      include: { subscriptions: { orderBy: { endDate: 'desc' }, take: 1, include: { plan: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const recentTenants = recentRaw.map(t => {
      const sub = t.subscriptions[0];
      const isExpired = sub && new Date(sub.endDate) < now;
      
      let status = "ACTIVE";
      if (!t.isActive) status = "INACTIVE";
      else if (isExpired) status = "EXPIRED";
      else if (!sub) status = "TRIAL";

      return {
        ...t,
        status
      };
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalTenants,
          activeTenants,
          inactiveTenants: totalTenants - activeTenants,
          totalRevenue: totalSaasRevenue
        },
        monthlyRevenue,
        planWise,
        tenantWise: topTenants,
        expiringSoon,
        recentTenants
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSuperAdminStats };
