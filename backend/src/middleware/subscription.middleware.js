const prisma = require('../lib/prisma');

const checkSubscription = async (req, res, next) => {
  try {
    // Super Admin skips subscription check
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Skip validation for lightweight GET APIs
    const skipPaths = ['/api/room-types', '/api/amenities'];
    if (req.method === 'GET' && skipPaths.some(path => req.baseUrl.includes(path) || req.originalUrl.includes(path))) {
      return next();
    }

    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: 'Tenant context missing' });
    }

    // Validate using JWT payload with DB fallback for old tokens
    let status = req.user.subscriptionStatus;
    let endDate = req.user.subscriptionEndDate;

    if (status === undefined) {
      const sub = await prisma.subscription.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { endDate: 'desc' }
      });
      status = sub ? sub.status : 'INACTIVE';
      endDate = sub ? sub.endDate : null;
    }

    if (status !== 'ACTIVE') {
      return res.status(403).json({ 
        success: false, 
        message: 'Subscription inactive. Please contact Super Admin.',
        subscriptionStatus: 'EXPIRED'
      });
    }

    if (endDate && new Date(endDate) < new Date()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Subscription expired. Please contact Super Admin.',
        subscriptionStatus: 'EXPIRED'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Subscription validation failed' });
  }
};

module.exports = { checkSubscription };
