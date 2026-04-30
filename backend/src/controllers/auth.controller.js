const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ success: false, message: 'Mobile and password required' });
    }

    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number. Must be exactly 10 digits.' });
    }

    const user = await prisma.user.findUnique({ 
      where: { mobile: cleanMobile },
      include: { tenant: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.tenant) {
      if (user.tenant.isDeleted) {
        return res.status(403).json({ success: false, message: 'Your business account has been deleted. Please contact support.' });
      }
      if (!user.tenant.isActive) {
        return res.status(403).json({ success: false, message: 'Your business account is currently inactive. Please contact Super Admin.' });
      }
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.tenant?.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your business account is blocked. Please contact support.' });
    }

    // Update lastLoginAt
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      ...(user.tenantId ? [prisma.tenant.update({ where: { id: user.tenantId }, data: { lastLoginAt: new Date() } })] : [])
    ]);


    // Check subscription status for tenants
    let subscriptionStatus = 'ACTIVE';
    let expiryDate = null;
    let planName = null;

    if (user.tenantId) {
      const isSystem = user.tenant?.isSystem || user.tenant?.businessName === 'HotelPro Systems';
      
      if (isSystem) {
        subscriptionStatus = 'ACTIVE';
        expiryDate = null;
        planName = 'SYSTEM';
      } else {
        const sub = await prisma.subscription.findFirst({
          where: { tenantId: user.tenantId, status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
          include: { plan: true }
        });
        
        if (!sub || new Date(sub.endDate) < new Date()) {
          subscriptionStatus = 'EXPIRED';
        }
        expiryDate = sub?.endDate || null;
        planName = sub?.plan?.name || null;
      }
    }

    const token = generateToken(user.id);

    // BUG-006: Set HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure in production
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      data: {
        // We still return token for backward compatibility if needed, 
        // but the cookie is the primary secure way now.
        token, 
        subscriptionStatus,
        expiryDate,
        planName,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          role: user.role,
          tenantId: user.tenantId,
        },
        tenant: user.tenant
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    let subscriptionStatus = 'ACTIVE';
    let expiryDate = null;
    let planName = null;
    
    if (user.tenantId) {
      const isSystem = user.tenant?.isSystem || user.tenant?.businessName === 'HotelPro Systems';
      
      if (isSystem) {
        subscriptionStatus = 'ACTIVE';
        expiryDate = null;
        planName = 'SYSTEM';
      } else {
        const sub = await prisma.subscription.findFirst({
          where: { tenantId: user.tenantId, status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
          include: { plan: true }
        });
        if (!sub || new Date(sub.endDate) < new Date()) {
          subscriptionStatus = 'EXPIRED';
        }
        expiryDate = sub?.endDate || null;
        planName = sub?.plan?.name || null;
      }
    }

    res.json({ 
      success: true, 
      data: { ...user, subscriptionStatus, expiryDate, planName } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// User CRUD (Scoped to Tenant)
const createUser = async (req, res) => {
  try {
    const { name, mobile, password, role } = req.body;
    const tenantId = req.user.tenantId;

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile, and password required' });
    }

    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
    }


    const existing = await prisma.user.findFirst({ 
      where: { mobile: cleanMobile, isDeleted: false } 
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Mobile number already registered' });
    }

    // Staff limit per tenant
    const userCount = await prisma.user.count({ where: { tenantId, isActive: true } });
    if (userCount >= 5) { // 1 Admin + 4 Staff
      return res.status(400).json({ success: false, message: 'Staff limit reached (Max 5 users per hotel)' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        mobile: cleanMobile,
        password: hashedPassword,
        role: role || 'STAFF',
        tenantId,
        isActive: true,
        isDeleted: false
      },
      select: { id: true, name: true, mobile: true, role: true, createdAt: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId, isDeleted: false },
      select: { id: true, name: true, mobile: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, mobile, password, role, isActive } = req.body;
    const { id } = req.params;

    // Verify ownership
    const targetUser = await prisma.user.findFirst({ 
      where: { id, tenantId: req.user.tenantId, isDeleted: false } 
    });
    if (!targetUser) {
        return res.status(403).json({ success: false, message: 'Unauthorized or user not found' });
    }

    const updateData = {
      ...(name && { name }),
      ...(mobile && { mobile }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, mobile: true, role: true, isActive: true },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser || targetUser.tenantId !== req.user.tenantId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const suffix = `_del_${Date.now()}`;
    await prisma.user.update({ 
      where: { id },
      data: { 
        isActive: false, 
        isDeleted: true,
        deletedAt: new Date(),
        mobile: targetUser.mobile + suffix
      }
    });
    res.json({ success: true, message: 'User deleted successfully (soft-delete)' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { login, getProfile, createUser, getAllUsers, updateUser, deleteUser };
