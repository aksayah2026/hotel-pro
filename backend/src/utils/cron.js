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

    // 1b. Auto-activate QUEUED subscriptions that should start today
    const queuedToActivate = await prisma.subscription.findMany({
      where: {
        status: 'QUEUED',
        startDate: { lte: now }
      }
    });

    for (const sub of queuedToActivate) {
      await prisma.$transaction([
        // Expire any existing active subscriptions for this tenant to avoid conflicts
        prisma.subscription.updateMany({
          where: {
            tenantId: sub.tenantId,
            status: 'ACTIVE',
            id: { not: sub.id }
          },
          data: { status: 'EXPIRED' }
        }),
        // Activate the queued subscription
        prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'ACTIVE' }
        })
      ]);
      console.log(`Auto-activated QUEUED subscription ${sub.id} for Tenant ${sub.tenantId}`);
    }

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

// Run every day at 9:00 AM for subscription expiry push notifications
cron.schedule('0 9 * * *', async () => {
  console.log('[PUSH CRON] Running daily subscription expiry push notifications check at 9:00 AM...');
  try {
    const { sendPushNotification } = require('./push');
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfTwoDaysFromNow = new Date();
    endOfTwoDaysFromNow.setDate(startOfToday.getDate() + 2);
    endOfTwoDaysFromNow.setHours(23, 59, 59, 999);

    // 1. Query ACTIVE subscriptions ending within the next 2 days (today, tomorrow, or in 2 days)
    const activeSubs = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: startOfToday,
          lte: endOfTwoDaysFromNow
        },
        tenant: {
          isActive: true,
          isBlocked: false,
          accessLevel: 'FULL',
          isSystem: false
        }
      },
      include: {
        tenant: {
          include: {
            users: {
              where: {
                role: 'TENANT_ADMIN',
                isActive: true
              }
            }
          }
        }
      }
    });

    console.log(`[PUSH CRON] Found ${activeSubs.length} subscriptions expiring in the next 2 days.`);

    for (const sub of activeSubs) {
      // 2. Edge Case Check: If there's already a renewal or queued plan, skip notifying
      const queuedPlan = await prisma.subscription.findFirst({
        where: {
          tenantId: sub.tenantId,
          status: 'QUEUED'
        }
      });
      if (queuedPlan) {
        console.log(`[PUSH CRON] Tenant ${sub.tenant.businessName} has a QUEUED renewal plan. Skipping expiry notifications.`);
        continue;
      }

      // 3. Calculate exact diff days
      const subEndDate = new Date(sub.endDate);
      subEndDate.setHours(0, 0, 0, 0);
      const diffTime = subEndDate.getTime() - startOfToday.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let notificationType = '';
      let title = '';
      let message = '';

      if (diffDays === 2) {
        notificationType = 'TWO_DAYS';
        title = 'Subscription Expiring Soon';
        message = 'Your HotelPro subscription expires in 2 days. Please renew to avoid service interruption.';
      } else if (diffDays === 1) {
        notificationType = 'ONE_DAY';
        title = 'Subscription Expires Tomorrow';
        message = 'Your HotelPro subscription expires tomorrow. Renew now to continue uninterrupted access.';
      } else if (diffDays === 0) {
        notificationType = 'EXPIRED';
        title = 'Subscription Expired';
        message = 'Your HotelPro subscription has expired today. Please renew immediately to continue using services.';
      } else {
        continue;
      }

      // 4. Duplicate prevention log check
      const existingLog = await prisma.subscriptionNotificationLog.findFirst({
        where: {
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          type: notificationType
        }
      });

      if (existingLog) {
        console.log(`[PUSH CRON] Notification ${notificationType} already logged/sent for subscription ${sub.id} (Tenant ${sub.tenant.businessName})`);
        continue;
      }

      // 5. Filter out STAFF users (only notify TENANT_ADMIN)
      const targetUserIds = sub.tenant.users.map(u => u.id);
      if (targetUserIds.length === 0) {
        console.log(`[PUSH CRON] No active TENANT_ADMIN users found for Tenant ${sub.tenant.businessName}. Skipping.`);
        continue;
      }

      console.log(`[PUSH CRON] Sending '${title}' notification to ${targetUserIds.length} admins of Tenant ${sub.tenant.businessName}...`);

      // 6. Send push notification & log
      await sendPushNotification(targetUserIds, title, message, 'SUBSCRIPTION_EXPIRY', {
        subscriptionId: sub.id,
        expiryDate: sub.endDate.toISOString()
      });

      await prisma.subscriptionNotificationLog.create({
        data: {
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          type: notificationType
        }
      });

      console.log(`[PUSH CRON] Successfully logged and sent ${notificationType} notification to Tenant ${sub.tenant.businessName}.`);
    }

  } catch (error) {
    console.error('[PUSH CRON] Subscription expiry push notification job failed:', error);
  }
});

console.log('Subscription cron jobs scheduled.');
