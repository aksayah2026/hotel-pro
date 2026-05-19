const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { startOfDay, differenceInCalendarDays } = require('date-fns');

// Unified cron job that runs every day at 9:00 AM server time
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] Running daily 9:00 AM subscription lifecycle & push notifications check...');
  
  try {
    const now = new Date();
    const today = startOfDay(now);

    // 1. Mark expired subscriptions (endDate is prior to now)
    const expiredCount = await prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now }
      },
      data: { status: 'EXPIRED' }
    });
    if (expiredCount.count > 0) {
      console.log(`[CRON] Marked ${expiredCount.count} subscriptions as EXPIRED`);
    }

    // 2. Auto-activate QUEUED subscriptions that should start today
    // If multiple queued plans exist for a tenant, activate ONLY the earliest one
    const activeTenantsList = await prisma.tenant.findMany({
      where: { isSystem: false }
    });

    for (const tenant of activeTenantsList) {
      const earliestQueued = await prisma.subscription.findFirst({
        where: {
          tenantId: tenant.id,
          status: 'QUEUED',
          startDate: { lte: now }
        },
        orderBy: {
          startDate: 'asc'
        }
      });

      if (earliestQueued) {
        await prisma.$transaction([
          // Expire any existing active subscriptions for this tenant
          prisma.subscription.updateMany({
            where: {
              tenantId: tenant.id,
              status: 'ACTIVE',
              id: { not: earliestQueued.id }
            },
            data: { status: 'EXPIRED' }
          }),
          // Activate the earliest queued subscription
          prisma.subscription.update({
            where: { id: earliestQueued.id },
            data: { status: 'ACTIVE' }
          })
        ]);
        console.log(`[CRON] Auto-activated earliest QUEUED subscription ${earliestQueued.id} for Tenant ${tenant.id}`);
      }
    }

    // 3. Optional Auto Deactivation
    // If a tenant has no ACTIVE subscription and no QUEUED subscription, set isActive = false
    const nonSystemTenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        isBlocked: false,
        isSystem: false
      },
      include: {
        subscriptions: true
      }
    });

    for (const tenant of nonSystemTenants) {
      const hasActive = tenant.subscriptions.some(s => s.status === 'ACTIVE');
      const hasQueued = tenant.subscriptions.some(s => s.status === 'QUEUED');
      if (!hasActive && !hasQueued) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { isActive: false }
        });
        console.log(`[CRON] Auto-deactivated Tenant ${tenant.businessName} (ID: ${tenant.id}) due to no active/queued subscription.`);
      }
    }

    // 4. Send Expiry Push Notifications
    const { sendPushNotification } = require('./push');

    // Query active subscriptions ending soon (Optimization: filter within next 5 days to cover the 5-day, 2-day, and 0-day marks)
    const endOfFiveDaysFromNow = new Date();
    endOfFiveDaysFromNow.setDate(today.getDate() + 5);
    endOfFiveDaysFromNow.setHours(23, 59, 59, 999);

    const activeSubs = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: today,
          lte: endOfFiveDaysFromNow
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

    console.log(`[CRON] Found ${activeSubs.length} subscriptions ending within the next 5 days to check for notifications.`);

    for (const sub of activeSubs) {
      // 4a. Edge Case Check: If there's a future queued plan starting after now, skip notifying
      const queuedPlan = await prisma.subscription.findFirst({
        where: {
          tenantId: sub.tenantId,
          status: 'QUEUED',
          startDate: {
            gt: now
          }
        }
      });
      if (queuedPlan) {
        console.log(`[CRON] Tenant ${sub.tenant.businessName} has a future QUEUED renewal plan. Skipping expiry notifications.`);
        continue;
      }

      // 4b. Calculate difference in calendar days using date-fns (timezone-safe)
      const expiryDate = startOfDay(new Date(sub.endDate));
      const diffDays = differenceInCalendarDays(expiryDate, today);

      let notificationType = '';
      let title = '';
      let message = '';

      if (diffDays === 5) {
        notificationType = 'FIVE_DAYS';
        title = 'Subscription Expiring Soon';
        message = 'Your HotelPro subscription expires in 5 days. Renew early to avoid service interruption.';
      } else if (diffDays === 2) {
        notificationType = 'TWO_DAYS';
        title = 'Subscription Expiring Soon';
        message = 'Your HotelPro subscription expires in 2 days. Please renew soon to continue uninterrupted access.';
      } else if (diffDays === 0) {
        notificationType = 'EXPIRING_TODAY';
        title = 'Subscription Expires Today';
        message = 'Your HotelPro subscription expires today. Renew immediately to continue using HotelPro services.';
      } else {
        // Only notify on 5 days, 2 days, and today
        continue;
      }

      // 4c. Unique log check to prevent duplicates
      const existingLog = await prisma.subscriptionNotificationLog.findFirst({
        where: {
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          type: notificationType
        }
      });

      if (existingLog) {
        console.log(`[CRON] Expiry notification ${notificationType} already sent for subscription ${sub.id} (Tenant ${sub.tenant.businessName})`);
        continue;
      }

      // 4d. Target users (only notify TENANT_ADMIN users)
      const targetUserIds = sub.tenant.users.map(u => u.id);
      if (targetUserIds.length === 0) {
        console.log(`[CRON] No active TENANT_ADMIN users found for Tenant ${sub.tenant.businessName}. Skipping.`);
        continue;
      }

      console.log(`[CRON] Dispatched '${title}' push notification to ${targetUserIds.length} admins of Tenant ${sub.tenant.businessName}`);

      // 4e. Send push with mobile deep link payload & save to DB
      await sendPushNotification(targetUserIds, title, message, 'SUBSCRIPTION_EXPIRY', {
        screen: 'SubscriptionRenewal',
        subscriptionId: sub.id
      });

      // 4f. Save to notification logs
      await prisma.subscriptionNotificationLog.create({
        data: {
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          type: notificationType
        }
      });

      console.log(`[CRON] Successfully completed push notify and saved log for ${notificationType} to Tenant ${sub.tenant.businessName}.`);
    }

  } catch (error) {
    console.error('[CRON] Subscription lifecycle cron job failed:', error);
  }
});

console.log('Unified 9:00 AM subscription lifecycle cron job scheduled.');
