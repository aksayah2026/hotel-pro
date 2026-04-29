const cron = require('node-cron');
const prisma = require('../lib/prisma');

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily subscription check...');
  try {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    const in3Days = new Date();
    in3Days.setDate(now.getDate() + 3);

    // 1. Mark expired subscriptions
    const expiredCount = await prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now }
      },
      data: { status: 'EXPIRED' }
    });
    console.log(`Marked ${expiredCount.count} subscriptions as EXPIRED`);

    // 2. Find subscriptions expiring in 7 days
    const expiring7 = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { 
          gte: new Date(nextWeek.setHours(0,0,0,0)), 
          lte: new Date(nextWeek.setHours(23,59,59,999)) 
        }
      },
      include: { tenant: true }
    });
    expiring7.forEach(sub => {
      console.log(`NOTIFICATION: Tenant ${sub.tenant.businessName} expires in 7 days`);
      // Here you would call a notification service (Email/SMS)
    });

    // 3. Find subscriptions expiring in 3 days
    const expiring3 = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { 
          gte: new Date(in3Days.setHours(0,0,0,0)), 
          lte: new Date(in3Days.setHours(23,59,59,999)) 
        }
      },
      include: { tenant: true }
    });
    expiring3.forEach(sub => {
      console.log(`NOTIFICATION: Tenant ${sub.tenant.businessName} expires in 3 days`);
    });

    // 4. Auto-disable tenants with no active subscription (Optional)
    // We can just rely on the status check in the middleware, but we can also set isActive = false
    /*
    const toDisable = await prisma.tenant.findMany({
      where: {
        isActive: true,
        isSystem: false,
        subscriptions: { every: { endDate: { lt: now } } }
      }
    });
    for (const t of toDisable) {
      await prisma.tenant.update({ where: { id: t.id }, data: { isActive: false } });
    }
    */

  } catch (error) {
    console.error('Subscription cron failed:', error);
  }
});

console.log('Subscription cron job scheduled.');
