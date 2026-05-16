const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // BUG-006: Check cookie for token
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify existence in DB to handle deletions instantly
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { tenant: true }
    });

    if (!dbUser || !dbUser.isActive) {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }

    // If staff/tenant admin, check tenant existence
    if (dbUser.tenantId && (!dbUser.tenant || !dbUser.tenant.isActive)) {
      return res.status(401).json({ success: false, message: 'Session expired. Business account inactive or deleted.' });
    }

    // Attach user and tenant info to request
    req.user = {
      id: dbUser.id,
      role: dbUser.role,
      name: dbUser.name,
      tenantId: dbUser.tenantId,
      tenant: { 
        accessLevel: dbUser.tenant?.accessLevel || 'FULL',
        isBlocked: dbUser.tenant?.isBlocked || false
      },
      subscriptionStatus: decoded.subscriptionStatus,
      subscriptionEndDate: decoded.subscriptionEndDate
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const checkReadOnly = (req, res, next) => {
  // If Super Admin, bypass
  if (req.user.role === 'SUPER_ADMIN') return next();

  // If Tenant is READ_ONLY, prevent mutations (POST, PUT, DELETE, PATCH)
  if (req.user.tenant?.accessLevel === 'READ_ONLY' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return res.status(403).json({
      success: false,
      message: 'Your account is in Read-Only mode. Please contact Super Admin to enable write access.'
    });
  }
  next();
};

module.exports = { authenticate, checkReadOnly };
