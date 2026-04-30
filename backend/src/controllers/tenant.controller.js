const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/audit');

// GET /api/tenants/plans
const getPlans = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: [
        { isTrial: 'desc' },
        { isCustom: 'desc' },
        { durationInDays: 'asc' }
      ]
    });
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/tenants/plans (Add custom plan)
const createPlan = async (req, res) => {
  try {
    const { name, durationInDays, price, isCustom } = req.body;
    const plan = await prisma.subscriptionPlan.create({
      data: { name, durationInDays, price, isCustom: isCustom || false }
    });
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/tenants
const createTenant = async (req, res) => {
  try {
    const { 
      businessName, ownerName, address, phoneNumber, 
      mobile, password, planId 
    } = req.body;
    if (!businessName || !ownerName || !address || !phoneNumber || !mobile || !password || !planId) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
    }

    const existingUser = await prisma.user.findFirst({ 
      where: { mobile: cleanMobile, isDeleted: false } 
    });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Mobile number already in use' });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });

    const result = await prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const tenant = await tx.tenant.create({
        data: {
          businessName,
          ownerName,
          address,
          phoneNumber,
          mobile: cleanMobile,
          password: hashedPassword,
          isActive: true,
          accessLevel: 'FULL'
        },
      });

      await tx.user.create({
        data: {
          name: ownerName,
          mobile: cleanMobile,
          password: hashedPassword,
          role: 'TENANT_ADMIN',
          tenantId: tenant.id,
          isActive: true,
          isDeleted: false
        },
      });

      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + plan.durationInDays);

      const subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          startDate: now,
          endDate: endDate,
          status: 'ACTIVE',
        },
      });

      // Create SaaS Payment Record (if not free trial/system)
      const { discount = 0, paymentMethod = 'CASH' } = req.body;
      const finalAmount = Math.max(0, plan.price - parseFloat(discount));

      if (finalAmount > 0) {
        const saasPayment = await tx.saaSPayment.create({
          data: {
            tenantId: tenant.id,
            planId: plan.id,
            amount: finalAmount,
            status: 'COMPLETED',
            method: paymentMethod,
            paidAt: now,
          }
        });

        // Create Invoice
        await tx.saaSInvoice.create({
          data: {
            tenantId: tenant.id,
            paymentId: saasPayment.id,
            invoiceNumber: `INV-${Date.now()}-${tenant.id.slice(0, 4)}`,
            amount: finalAmount * 0.82, // Base amount
            tax: finalAmount * 0.18,   // 18% GST example
            total: finalAmount,
            status: 'PAID'
          }
        });

      }

      // Log action
      await logAction(req.user.id, 'CREATE_TENANT', 'TENANT', tenant.id, { businessName, plan: plan.name, amount: finalAmount }, tenant.id);

      return { tenant, subscription };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tenants
const getAllTenants = async (req, res) => {
  try {
    const { 
      search, status, planId, expiringSoon, 
      minRevenue, maxRevenue, sort, page = 1, limit = 10 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const now = new Date();

    const where = { isDeleted: false, AND: [] };

    if (search) {
      where.AND.push({
        OR: [
          { businessName: { contains: search, mode: 'insensitive' } },
          { ownerName: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } }
        ]
      });
    }

    if (planId) {
      where.AND.push({ subscriptions: { some: { planId } } });
    }

    if (status) {
      if (status === 'ACTIVE') {
        where.AND.push({ isActive: true, subscriptions: { some: { endDate: { gte: now } } } });
      } else if (status === 'EXPIRED') {
        where.AND.push({ subscriptions: { every: { endDate: { lt: now } } } });
      } else if (status === 'INACTIVE') {
        where.AND.push({ isActive: false });
      }
    }

    if (expiringSoon === 'true') {
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      where.AND.push({ subscriptions: { some: { endDate: { gte: now, lte: nextWeek } } } });
    }


    // Sorting
    let orderBy = {};
    if (sort === 'latest') orderBy = { createdAt: 'desc' };
    else if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sort === 'businessName') orderBy = { businessName: 'asc' };
    else orderBy = { createdAt: 'desc' }; // Default to latest

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          subscriptions: { orderBy: { endDate: 'desc' }, take: 1, include: { plan: true } }
        },
        orderBy,
        skip,
        take
      }),
      prisma.tenant.count({ where })
    ]);

    res.json({ 
      success: true, 
      data: tenants,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tenants/activity
const getTenantActivity = async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        businessName: true,
        lastLoginAt: true,
        totalBookings: true,
        isActive: true,
        isBlocked: true,
        accessLevel: true
      },
      orderBy: { lastLoginAt: 'desc' }
    });
    res.json({ success: true, data: tenants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/tenants/:id
const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      businessName, ownerName, address, phoneNumber, 
      mobile, isActive, isBlocked, accessLevel 
    } = req.body;

    let cleanMobile = mobile;
    if (mobile) {
      cleanMobile = mobile.replace(/\D/g, "");
      if (cleanMobile.length !== 10) {
        return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        businessName, ownerName, address, phoneNumber, 
        mobile: cleanMobile, isActive, isBlocked, accessLevel
      }
    });

    await logAction(req.user.id, 'UPDATE_TENANT', 'TENANT', id, req.body, id);

    res.json({ success: true, data: tenant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/tenants/renew
const renewSubscription = async (req, res) => {
  try {
    const { tenantId, planId } = req.body;
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });

    const latestSub = await prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { endDate: 'desc' }
    });

    const now = new Date();
    let startDate = now;

    if (latestSub && new Date(latestSub.endDate) > now) {
      // Deactivate old active subscriptions to avoid overlap in revenue logic if needed
      await prisma.subscription.updateMany({
        where: { tenantId, endDate: { gte: now } },
        data: { status: 'EXPIRED', endDate: now }
      });
      startDate = now;
    }

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          tenantId,
          planId: plan.id,
          startDate,
          endDate,
          status: endDate > now ? 'ACTIVE' : 'EXPIRED',
        },
      });

      // Create SaaS Payment Record (if not free trial)
      const { discount = 0, paymentMethod = 'CASH' } = req.body;
      const finalAmount = Math.max(0, plan.price - parseFloat(discount));

      if (finalAmount > 0) {
        const saasPayment = await tx.saaSPayment.create({
          data: {
            tenantId,
            planId: plan.id,
            amount: finalAmount,
            status: 'COMPLETED',
            method: paymentMethod,
            paidAt: now,
          }
        });

        // Create Invoice
        await tx.saaSInvoice.create({
          data: {
            tenantId,
            paymentId: saasPayment.id,
            invoiceNumber: `INV-${Date.now()}-${tenantId.slice(0, 4)}`,
            amount: finalAmount * 0.82,
            tax: finalAmount * 0.18,
            total: finalAmount,
            status: 'PAID'
          }
        });
      }

      return { subscription, amount: finalAmount };
    });

    await logAction(req.user.id, 'RENEW_SUBSCRIPTION', 'TENANT', tenantId, { planId, endDate, amount: result.amount });

    res.json({ success: true, data: result.subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/tenants/:id
const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const suffix = `_del_${Date.now()}`;

    await prisma.$transaction([
      prisma.tenant.update({
        where: { id },
        data: { 
          isDeleted: true, 
          isActive: false,
          deletedAt: new Date(), 
          deleteReason: reason,
          mobile: tenant.mobile + suffix
        }
      }),
      prisma.user.updateMany({
        where: { tenantId: id },
        data: { 
          isDeleted: true, 
          isActive: false,
          deletedAt: new Date(),
          deleteReason: `Tenant deleted: ${reason}`,
          // We can't easily suffix mobile here with updateMany in Prisma without raw SQL
          // But we can find all users and update them individually or just leave them
          // Since tenantId is scoped, it's less of an issue, but let's be thorough
        }
      })
    ]);

    // To properly suffix all users, we should do it in a loop or raw query
    const users = await prisma.user.findMany({ where: { tenantId: id } });
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { mobile: user.mobile + suffix }
      });
    }

    await logAction(req.user.id, 'DELETE_TENANT', 'TENANT', id, { reason }, id);

    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/tenants/:id/status
const updateTenantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: 'isActive field is required' });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { isActive }
    });

    await logAction(req.user.id, 'UPDATE_TENANT_STATUS', 'TENANT', id, { isActive }, id);

    res.json({ success: true, data: tenant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { 
  getPlans, createPlan, createTenant, 
  getAllTenants, getTenantActivity, 
  renewSubscription,
  updateTenant, updateTenantStatus, deleteTenant 
};
