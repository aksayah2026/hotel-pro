const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/audit');

// Cache for plans API
let plansCache = null;
let plansCacheTime = 0;

// GET /api/tenants/plans
const getPlans = async (req, res) => {
  try {
    if (plansCache && Date.now() - plansCacheTime < 10 * 60 * 1000) {
      return res.json({ success: true, data: plansCache });
    }

    const plans = await prisma.subscriptionPlan.findMany({
      select: {
        id: true,
        name: true,
        durationInDays: true,
        price: true,
        isTrial: true
      }
    });

    plansCache = plans;
    plansCacheTime = Date.now();

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

    if (businessName.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Business name must be at least 3 characters long' });
    }

    if (ownerName.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Owner name must be at least 2 characters long' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const cleanPhone = phoneNumber.toString().replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
    }

    const cleanMobile = mobile.toString().replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { mobile: cleanMobile }
    });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Mobile number already in use' });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan selected' });

    // Amount and Discount Validation
    const { discount = 0 } = req.body;
    const numDiscount = parseFloat(discount) || 0;
    if (numDiscount < 0) {
      return res.status(400).json({ success: false, message: 'Discount cannot be negative' });
    }
    if (numDiscount > plan.price) {
      return res.status(400).json({ success: false, message: `Discount cannot exceed plan price (₹${plan.price})` });
    }

    const result = await prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(password, 12);

      const tenant = await tx.tenant.create({
        data: {
          businessName,
          ownerName,
          address,
          phoneNumber: cleanPhone,
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
          isActive: true
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
      const numDiscount = parseFloat(discount) || 0;
      const finalAmount = Math.max(0, plan.price - numDiscount);

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

    const where = { AND: [] };

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
        select: {
          id: true,
          businessName: true,
          ownerName: true,
          address: true,
          phoneNumber: true,
          mobile: true,
          isActive: true,
          isBlocked: true,
          accessLevel: true,
          isSystem: true,
          totalBookings: true,
          createdAt: true,
          subscriptions: {
            orderBy: { endDate: 'desc' },
            take: 1,
            select: {
              status: true,
              endDate: true,
              plan: { select: { name: true } }
            }
          }
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

// GET /api/tenants/:id
const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        address: true,
        phoneNumber: true,
        mobile: true,
        isActive: true,
        isBlocked: true,
        accessLevel: true,
        isSystem: true,
        totalBookings: true,
        createdAt: true,
        subscriptions: {
          orderBy: { endDate: 'desc' },
          take: 1,
          select: {
            status: true,
            endDate: true,
            plan: { select: { name: true } }
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.json({ success: true, data: tenant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tenants/activity
const getTenantActivity = async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
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
      mobile, isActive, isBlocked, accessLevel, password
    } = req.body;

    if (businessName && businessName.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Business name must be at least 3 characters long' });
    }

    if (ownerName && ownerName.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Owner name must be at least 2 characters long' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    let cleanPhone = phoneNumber;
    if (phoneNumber) {
      cleanPhone = phoneNumber.toString().replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, message: 'Phone number must contain 10 digits only' });
      }
    }

    let cleanMobile = mobile;
    if (mobile) {
      cleanMobile = mobile.toString().replace(/\D/g, "");
      if (cleanMobile.length !== 10) {
        return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
      }

      const existingUser = await prisma.user.findFirst({
        where: { 
          mobile: cleanMobile, 
          tenantId: { not: id }
        }
      });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'Mobile number already assigned to another user' });
      }
    }

    const updateData = {
      businessName, ownerName, address, 
      phoneNumber: cleanPhone,
      mobile: cleanMobile, isActive, isBlocked, accessLevel
    };

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateData.password = hashedPassword;
      console.log("Updated hashed password:", hashedPassword);

      await prisma.user.updateMany({
        where: { tenantId: id, role: 'TENANT_ADMIN' },
        data: { password: hashedPassword }
      });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData
    });

    await logAction(req.user.id, 'UPDATE_TENANT', 'TENANT', id, { ...req.body, password: password ? '***' : undefined }, id);

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

    const { discount = 0 } = req.body;
    const numDiscount = parseFloat(discount) || 0;
    if (numDiscount < 0) {
      return res.status(400).json({ success: false, message: 'Discount cannot be negative' });
    }
    if (numDiscount > plan.price) {
      return res.status(400).json({ success: false, message: `Discount cannot exceed plan price (₹${plan.price})` });
    }

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
      const finalAmount = Math.max(0, plan.price - numDiscount);

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

// DELETE /api/tenants/:id (Hard Delete with Backup)
const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE TENANT') {
      return res.status(400).json({ success: false, message: 'Permanent deletion requires typed confirmation: DELETE TENANT' });
    }

    // STEP 1: Fetch data outside transaction for backup
    const tenant = await prisma.tenant.findUnique({ 
        where: { id },
        include: {
            users: true,
            rooms: { include: { amenities: true } },
            roomTypes: true,
            amenities: true,
            bookings: {
                include: {
                    bookingRooms: true,
                    customer: true,
                    payments: true,
                    extraCharges: true
                }
            },
            subscriptions: true,
            saasPayments: true,
            saasInvoices: true,
            pushTokens: true,
            notifications: true
        }
    });

    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    // Generate Backup Data (JSON)
    const backupData = {
        tenantInfo: {
            id: tenant.id,
            businessName: tenant.businessName,
            ownerName: tenant.ownerName,
            mobile: tenant.mobile,
            address: tenant.address,
            phoneNumber: tenant.phoneNumber,
            createdAt: tenant.createdAt,
            totalBookings: tenant.totalBookings
        },
        exportTimestamp: new Date().toISOString(),
        data: {
            users: tenant.users.map(u => ({ ...u, password: '***' })),
            rooms: tenant.rooms,
            roomTypes: tenant.roomTypes,
            amenities: tenant.amenities,
            bookings: tenant.bookings,
            subscriptions: tenant.subscriptions,
            saasPayments: tenant.saasPayments,
            saasInvoices: tenant.saasInvoices,
            pushTokens: tenant.pushTokens,
            notifications: tenant.notifications
        }
    };

    // STEP 2: Optional: Storage cleanup or Cloudinary removal should happen here (outside tx)
    // ...

    // STEP 3: Run optimized DB transaction with explicit timeout
    await prisma.$transaction(async (tx) => {
        // Debug Prisma model keys if error persists
        // console.log('Prisma Transaction Models:', Object.keys(tx));

        // Correct dependency order (Children first)
        
        // 1. Independent child records (to avoid foreign key issues elsewhere)
        await tx.notification.deleteMany({ where: { tenantId: id } });
        await tx.auditLog.deleteMany({ where: { tenantId: id } });
        await tx.pushToken.deleteMany({ where: { tenantId: id } });

        // 2. Booking Children (Cascading from Booking)
        await tx.customer.deleteMany({ where: { booking: { tenantId: id } } });
        await tx.payment.deleteMany({ where: { booking: { tenantId: id } } });
        await tx.extraCharge.deleteMany({ where: { booking: { tenantId: id } } });
        await tx.bookingRoom.deleteMany({ where: { booking: { tenantId: id } } });
        
        // 3. Main Booking records
        await tx.booking.deleteMany({ where: { tenantId: id } });
        
        // 4. Room & Config
        await tx.room.deleteMany({ where: { tenantId: id } });
        await tx.roomType.deleteMany({ where: { tenantId: id } });
        await tx.amenity.deleteMany({ where: { tenantId: id } });
        
        // 5. Subscription & SaaS
        await tx.saaSInvoice.deleteMany({ where: { tenantId: id } });
        await tx.saaSPayment.deleteMany({ where: { tenantId: id } });
        await tx.subscription.deleteMany({ where: { tenantId: id } });
        
        // 6. Users (Staff)
        await tx.user.deleteMany({ where: { tenantId: id } });
        
        // 7. Persistent Deletion Log
        await tx.tenantDeletionLog.create({
            data: {
                tenantId: id,
                tenantName: tenant.businessName,
                reason: 'PERMANENT HARD DELETE',
                deletedBy: req.user.userName || 'SUPER_ADMIN'
            }
        });

        // 8. Finally delete the tenant record
        await tx.tenant.delete({ where: { id } });
    }, {
        maxWait: 5000, 
        timeout: 25000 // 25 seconds for large data sets
    });

    res.json({
        success: true,
        message: 'Tenant and all associated data permanently deleted.',
        backup: backupData
    });

  } catch (error) {
    console.error('CRITICAL: Tenant deletion failed', error);
    res.status(500).json({ 
        success: false, 
        message: 'Tenant deletion failed. Please try again.' 
    });
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
  getAllTenants, getTenantById, getTenantActivity,
  renewSubscription,
  updateTenant, updateTenantStatus, deleteTenant
};
