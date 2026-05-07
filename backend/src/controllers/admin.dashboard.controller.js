const prisma = require('../lib/prisma');

let dashboardCache = null;
let dashboardCacheTime = 0;

// GET /api/dashboard/super-admin/stats
const getSuperAdminStats = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const selectedYear = parseInt(year);
    const now = new Date();

    const cacheKey = `dashboard:superadmin:stats:${selectedYear}`;
    if (dashboardCache && dashboardCache.key === cacheKey && Date.now() - dashboardCacheTime < 60 * 1000) {
      return res.json({ success: true, data: dashboardCache.data });
    }

    const [
      tenants,
      saasPayments,
      saasRevenueByTenant
    ] = await Promise.all([
      prisma.tenant.findMany({
        where: { isDeleted: false, isSystem: false },
        select: {
          id: true,
          businessName: true,
          isActive: true,
          createdAt: true,
          subscriptions: {
            where: { status: 'ACTIVE', endDate: { gte: now } },
            select: { endDate: true, plan: { select: { name: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.saaSPayment.findMany({
        where: { status: 'COMPLETED' },
        select: { amount: true, paidAt: true, createdAt: true, plan: { select: { name: true } } }
      }),
      prisma.saaSPayment.groupBy({
        by: ['tenantId'],
        _sum: { amount: true },
        where: { status: 'COMPLETED' }
      })
    ]);

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.subscriptions.length > 0).length;
    
    // Revenue calculations
    let totalSaasRevenue = 0;
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(selectedYear, i).toLocaleDateString('en-IN', { month: 'short' }),
      amount: 0
    }));

    const planCounts = {};
    
    saasPayments.forEach(p => {
      totalSaasRevenue += p.amount;
      const planName = p.plan?.name || 'Unknown';
      if (!planCounts[planName]) {
        planCounts[planName] = { plan: planName, revenue: 0, count: 0 };
      }
      planCounts[planName].revenue += p.amount;
      planCounts[planName].count++;

      const pDate = new Date(p.paidAt || p.createdAt);
      if (pDate.getFullYear() === selectedYear) {
        monthlyRevenue[pDate.getMonth()].amount += p.amount;
      }
    });

    const planWise = Object.values(planCounts);

    // Tenant-wise breakdown mapped in memory instead of N+1 DB calls!
    const tenantMap = new Map(tenants.map(t => [t.id, t.businessName]));
    const tenantRevenue = saasRevenueByTenant.map(item => ({
      name: tenantMap.get(item.tenantId) || 'Deleted Tenant',
      revenue: item._sum.amount || 0,
      isDeleted: !tenantMap.has(item.tenantId)
    }));

    tenantRevenue.sort((a, b) => b.revenue - a.revenue);
    const topTenants = tenantRevenue.slice(0, 10);

    // Expiring soon
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

    // Recent Tenants (Since tenants array is already ordered by createdAt DESC)
    const recentTenants = tenants.slice(0, 5).map(t => {
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

    const data = {
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
    };

    dashboardCache = { key: cacheKey, data };
    dashboardCacheTime = Date.now();

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSuperAdminStats };
