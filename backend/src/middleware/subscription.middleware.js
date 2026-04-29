const prisma = require('../lib/prisma');

const checkSubscription = async (req, res, next) => {
  try {
    // Super Admin skips subscription check
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: 'Tenant context missing' });
    }

    // Find latest active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId: tenantId,
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      }
    });

    if (!subscription) {
      return res.status(403).json({ 
        success: false, 
        message: 'Subscription expired or inactive. Please contact Super Admin.',
        subscriptionStatus: 'EXPIRED'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Subscription validation failed' });
  }
};

module.exports = { checkSubscription };
