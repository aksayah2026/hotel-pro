const axios = require('axios');
const prisma = require('../lib/prisma');

/**
 * Send real-time push notification via Expo Push Notification API.
 * This also saves the notification in the local database for the user's notification center.
 * 
 * @param {string|string[]} userIds - User ID or array of User IDs to receive the notification
 * @param {string} title - Notification title
 * @param {string} message - Notification body/message
 * @param {string} type - Notification type (e.g., NEW_BOOKING, GUEST_CHECK_IN, etc.)
 * @param {object} data - Optional payload data (e.g. { bookingId: "..." })
 */
const sendPushNotification = async (userIds, title, message, type, data = {}) => {
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return;

    // 1. Fetch user push tokens and identify their tenantId
    const pushTokens = await prisma.pushToken.findMany({
      where: { userId: { in: ids } },
    });

    // 2. Fetch the tenantId from the first user (fallback to a dummy or default)
    let tenantId = null;
    const userSample = await prisma.user.findFirst({
      where: { id: ids[0] },
      select: { tenantId: true }
    });
    if (userSample) {
      tenantId = userSample.tenantId;
    }

    if (!tenantId) {
      console.warn('sendPushNotification: Tenant ID not found for user');
      return;
    }

    // 3. Save notifications in local database for Notification Center
    await prisma.notification.createMany({
      data: ids.map(userId => ({
        userId,
        tenantId,
        title,
        message,
        type,
        isRead: false
      }))
    });

    if (pushTokens.length === 0) {
      return; // No push tokens registered for these users
    }

    // 4. Construct messages for Expo Push API
    const messages = pushTokens.map(pt => ({
      to: pt.token,
      sound: 'default',
      title,
      body: message,
      data: { ...data, type },
      priority: 'high',
      channelId: 'default',
    }));

    // Expo allows sending up to 100 messages at once
    const chunks = [];
    while (messages.length > 0) {
      chunks.push(messages.splice(0, 100));
    }

    for (const chunk of chunks) {
      try {
        const response = await axios.post('https://exp.host/--/api/v2/push/send', chunk, {
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        });

        // 5. Cleanup stale/invalid tokens based on Expo's response
        const tickets = response.data?.data || [];
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const invalidToken = chunk[i].to;
            await prisma.pushToken.deleteMany({
              where: { token: invalidToken }
            });
            console.log(`Removed stale push token: ${invalidToken}`);
          }
        }
      } catch (chunkErr) {
        console.error('Error sending push chunk to Expo:', chunkErr.message);
      }
    }
  } catch (error) {
    console.error('sendPushNotification: Error occurred:', error.message);
  }
};

/**
 * Send notification to ALL active users of a specific tenant.
 * 
 * @param {string} tenantId - Tenant ID
 * @param {string} title - Title
 * @param {string} message - Message
 * @param {string} type - Type
 * @param {object} data - Payload data
 */
const sendTenantBulkNotification = async (tenantId, title, message, type, data = {}) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true, isDeleted: false },
      select: { id: true }
    });
    const userIds = users.map(u => u.id);
    await sendPushNotification(userIds, title, message, type, data);
  } catch (error) {
    console.error('sendTenantBulkNotification error:', error.message);
  }
};

/**
 * Send real-time push notifications specifically to TENANT_ADMIN users of a tenant.
 *
 * @param {string} tenantId - The current tenant ID
 * @param {string} createdByUserId - The User ID of the staff member performing the action
 * @param {string} title - Notification title
 * @param {string} message - Notification body/message
 * @param {string} type - Notification type (e.g. STAFF_LOGIN, NEW_BOOKING, etc.)
 * @param {object} data - Payload data
 */
const sendTenantAdminNotification = async (tenantId, createdByUserId, title, message, type, data = {}) => {
  try {
    // 1. Find all active and non-deleted TENANT_ADMIN users for this tenant
    const admins = await prisma.user.findMany({
      where: { tenantId, role: 'TENANT_ADMIN', isActive: true, isDeleted: false },
      select: { id: true }
    });
    
    const adminIds = admins.map(admin => admin.id);
    if (adminIds.length === 0) return;

    // 2. Fetch push tokens for these admins
    const pushTokens = await prisma.pushToken.findMany({
      where: { userId: { in: adminIds } }
    });

    // 3. Save notification in DB for each admin's Notification Center
    await prisma.notification.createMany({
      data: adminIds.map(userId => ({
        userId,
        tenantId,
        title,
        message,
        type,
        isRead: false
      }))
    });

    if (pushTokens.length === 0) return;

    // 4. Send pushes in chunks
    const messages = pushTokens.map(pt => ({
      to: pt.token,
      sound: 'default',
      title,
      body: message,
      data: { ...data, type, createdByUserId },
      priority: 'high',
      channelId: 'default',
    }));

    const chunks = [];
    while (messages.length > 0) {
      chunks.push(messages.splice(0, 100));
    }

    for (const chunk of chunks) {
      try {
        const response = await axios.post('https://exp.host/--/api/v2/push/send', chunk, {
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        });

        const tickets = response.data?.data || [];
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const invalidToken = chunk[i].to;
            await prisma.pushToken.deleteMany({
              where: { token: invalidToken }
            });
            console.log(`Removed stale push token: ${invalidToken}`);
          }
        }
      } catch (chunkErr) {
        console.error('Error sending push chunk to Expo:', chunkErr.message);
      }
    }
  } catch (error) {
    console.error('sendTenantAdminNotification error:', error.message);
  }
};

module.exports = {
  sendPushNotification,
  sendTenantBulkNotification,
  sendTenantAdminNotification
};
