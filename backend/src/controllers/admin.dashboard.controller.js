const prisma = require('../lib/prisma');

let dashboardCache = null;
let dashboardCacheTime = 0;

/**
 * Internal helper to gather raw statistics based on input query filters.
 * Guarantees that JSON responses and Exports use 100% identical datasets.
 */
async function getSuperAdminStatsData(queryParams) {
  const { type, year = new Date().getFullYear(), month } = queryParams;
  const selectedYear = parseInt(year);
  
  let filterType = type;
  if (!filterType) {
    filterType = month ? 'monthly' : 'yearly';
  }
  
  const currentMonth = new Date().getMonth() + 1;
  const selectedMonth = month ? parseInt(month) : currentMonth;
  
  const now = new Date();

  // Construct date boundaries based on filter type
  let startDate, endDate;
  if (filterType === 'monthly') {
    // month - 1 for zero-based index
    startDate = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
    endDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
  } else {
    startDate = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
    endDate = new Date(selectedYear + 1, 0, 1, 0, 0, 0, 0);
  }

  const [
    tenants,
    saasPayments,
    saasRevenueByTenant
  ] = await Promise.all([
    prisma.tenant.findMany({
      where: { isSystem: false },
      select: {
        id: true,
        businessName: true,
        isActive: true,
        isDeleted: true,
        createdAt: true,
        subscriptions: {
          orderBy: { endDate: 'desc' },
          select: { startDate: true, endDate: true, status: true, plan: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.saaSPayment.findMany({
      where: { 
        status: 'COMPLETED',
        OR: [
          { paidAt: { gte: startDate, lt: endDate } },
          { paidAt: null, createdAt: { gte: startDate, lt: endDate } }
        ]
      },
      select: { amount: true, paidAt: true, createdAt: true, plan: { select: { name: true } } }
    }),
    prisma.saaSPayment.groupBy({
      by: ['tenantId'],
      _sum: { amount: true },
      where: { 
        status: 'COMPLETED',
        OR: [
          { paidAt: { gte: startDate, lt: endDate } },
          { paidAt: null, createdAt: { gte: startDate, lt: endDate } }
        ]
      }
    })
  ]);

  // Separate non-deleted cohort for standard metrics computations
  const nonDeletedTenants = tenants.filter(t => !t.isDeleted);

  // 1. Total Businesses: created strictly within range [startDate, endDate)
  const filteredCreatedTenants = nonDeletedTenants.filter(t => {
    const cDate = new Date(t.createdAt);
    return cDate >= startDate && cDate < endDate;
  });
  const totalTenants = filteredCreatedTenants.length;

  // 2. Active Licenses: licenses active during selected date range
  const activeTenantsCount = nonDeletedTenants.filter(t => {
    return t.subscriptions.some(sub => {
      const sDate = new Date(sub.startDate);
      const eDate = new Date(sub.endDate);
      return sDate < endDate && eDate >= startDate && sub.status === 'ACTIVE';
    });
  }).length;

  // 3. Inactive / Expired Licenses:
  const inactiveTenantsCount = nonDeletedTenants.filter(t => {
    const hasExpiredInRange = t.subscriptions.some(sub => {
      const eDate = new Date(sub.endDate);
      return eDate >= startDate && eDate < endDate && sub.status !== 'ACTIVE';
    });
    
    const cDate = new Date(t.createdAt);
    // Account was created before or during period AND is currently inactive
    const isInactiveAndExisted = !t.isActive && cDate < endDate;
    
    return hasExpiredInRange || isInactiveAndExisted;
  }).length;

  // 4. Revenue calculations
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
  // We map EVERY tenant in the DB to its original name and deletion boolean
  const tenantMap = new Map(tenants.map(t => [t.id, { businessName: t.businessName, isDeleted: t.isDeleted }]));
  const tenantRevenue = saasRevenueByTenant.map(item => {
    const mapped = tenantMap.get(item.tenantId);
    return {
      businessName: (mapped && mapped.businessName) ? mapped.businessName : 'Deleted Tenant',
      revenue: item._sum.amount || 0,
      isDeleted: mapped ? mapped.isDeleted : true
    };
  });

  tenantRevenue.sort((a, b) => b.revenue - a.revenue);
  const topTenants = tenantRevenue.slice(0, 10);

  // Expiring soon (Actionable - relative to real live timestamp)
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  const expiringSoon = nonDeletedTenants.filter(t => {
    return t.subscriptions.some(sub => {
      const eDate = new Date(sub.endDate);
      return eDate >= now && eDate <= nextWeek;
    });
  }).map(t => ({
    id: t.id,
    businessName: t.businessName,
    subscriptions: [t.subscriptions[0]]
  }));

  // Recent Tenants (Within selected period)
  const recentTenants = filteredCreatedTenants.slice(0, 5).map(t => {
    const sub = t.subscriptions.length > 0 ? t.subscriptions[0] : null;
    const isExpired = sub && new Date(sub.endDate) < now;
    let status = "ACTIVE";
    if (!t.isActive) status = "INACTIVE";
    else if (isExpired) status = "EXPIRED";
    else if (!sub) status = "TRIAL";

    return {
      id: t.id,
      businessName: t.businessName,
      createdAt: t.createdAt,
      subscriptions: sub ? [sub] : [],
      status
    };
  });

  return {
    filterType,
    selectedYear,
    selectedMonth,
    data: {
      stats: {
        totalTenants,
        activeTenants: activeTenantsCount,
        inactiveTenants: inactiveTenantsCount,
        totalRevenue: totalSaasRevenue
      },
      monthlyRevenue,
      planWise,
      tenantWise: topTenants,
      expiringSoon,
      recentTenants
    }
  };
}

// GET /api/dashboard/super-admin/stats
const getSuperAdminStats = async (req, res) => {
  try {
    const { type, year = new Date().getFullYear(), month } = req.query;
    const selectedYear = parseInt(year);
    
    let filterType = type;
    if (!filterType) {
      filterType = month ? 'monthly' : 'yearly';
    }
    const currentMonth = new Date().getMonth() + 1;
    const selectedMonth = month ? parseInt(month) : currentMonth;

    const cacheKey = `dashboard:superadmin:stats:${filterType}:${selectedYear}:${selectedMonth}`;
    if (dashboardCache && dashboardCache.key === cacheKey && Date.now() - dashboardCacheTime < 60 * 1000) {
      return res.json({ success: true, data: dashboardCache.data });
    }

    const result = await getSuperAdminStatsData(req.query);
    
    dashboardCache = { key: cacheKey, data: result.data };
    dashboardCacheTime = Date.now();

    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/super-admin/export
const exportSuperAdminStats = async (req, res) => {
  try {
    const result = await getSuperAdminStatsData(req.query);
    const { filterType, selectedYear, selectedMonth, data } = result;

    // Generate Dynamic Dynamic Filename e.g. Executive_Overview_June_2026.csv
    let periodLabel = `Year_${selectedYear}`;
    if (filterType === 'monthly') {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      periodLabel = `${monthNames[selectedMonth - 1]}_${selectedYear}`;
    }
    const filename = `Executive_Overview_${periodLabel}.csv`;

    // Construct Professional structured CSV content on backend
    let csvContent = '';
    csvContent += `"PLATFORM EXECUTIVE OVERVIEW REPORT"\r\n`;
    csvContent += `"Filter Level","${filterType.toUpperCase()}"\r\n`;
    csvContent += `"Target Period","${periodLabel.replace('_', ' ')}"\r\n`;
    csvContent += `"Generation Timestamp","${new Date().toLocaleString()}"\r\n\r\n`;

    // Section 1: Main Statistics Overview
    csvContent += `"SUMMARY BUSINESS ANALYTICS"\r\n`;
    csvContent += `"Metric Group","Value"\r\n`;
    csvContent += `"Total Businesses Registered","${data.stats.totalTenants}"\r\n`;
    csvContent += `"Active Platform Licenses","${data.stats.activeTenants}"\r\n`;
    csvContent += `"Expired or Inactive Licenses","${data.stats.inactiveTenants}"\r\n`;
    csvContent += `"SaaS Subscription Revenue","INR ${data.stats.totalRevenue.toFixed(2)}"\r\n\r\n`;

    // Section 2: Monthly Revenue Breakdown Table
    csvContent += `"MONTHLY REVENUE DISTRIBUTION"\r\n`;
    csvContent += `"Period Month","Revenue Cleared (INR)"\r\n`;
    data.monthlyRevenue.forEach(row => {
      csvContent += `"${row.month}","${Number(row.amount).toFixed(2)}"\r\n`;
    });
    csvContent += `\r\n`;

    // Section 3: Subscription Plan Breakdown Table
    csvContent += `"PLAN-WISE REVENUE PERFORMANCE"\r\n`;
    csvContent += `"Subscribed Plan Name","Total Active Licenses","Subtotal Cleared (INR)"\r\n`;
    data.planWise.forEach(row => {
      csvContent += `"${row.plan}","${row.count}","${Number(row.revenue).toFixed(2)}"\r\n`;
    });
    csvContent += `\r\n`;

    // Section 4: Tenant Revenue Contributions Table
    csvContent += `"TOP CONTRIBUTING BUSINESSES"\r\n`;
    csvContent += `"Hotel/Business Name","Revenue Provided (INR)","Activity State"\r\n`;
    data.tenantWise.forEach(row => {
      csvContent += `"${row.businessName}","${Number(row.revenue).toFixed(2)}","${row.isDeleted ? 'Deleted' : 'Active'}"\r\n`;
    });

    // Set standard headers for dynamic file downloads
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);

  } catch (error) {
    res.status(500).json({ success: false, message: 'Backend export execution failed: ' + error.message });
  }
};

module.exports = { 
  getSuperAdminStats,
  exportSuperAdminStats 
};
