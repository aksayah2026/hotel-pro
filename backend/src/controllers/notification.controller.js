const prisma = require('../lib/prisma');
const { sendTenantBulkNotification } = require('../utils/push');

// POST /api/notifications/tokens
const savePushToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token || !platform) {
      return res.status(400).json({ success: false, message: 'Token and platform are required' });
    }

    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const pushToken = await prisma.pushToken.upsert({
      where: { token },
      update: { userId, tenantId, platform: platform.toLowerCase() },
      create: {
        userId,
        tenantId,
        token,
        platform: platform.toLowerCase(),
      },
    });

    res.json({ success: true, data: pushToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/notifications/send
const sendNotification = async (req, res) => {
  try {
    const { title, message, type, data } = req.body;
    if (!title || !message || !type) {
      return res.status(400).json({ success: false, message: 'Title, message, and type are required' });
    }

    await sendTenantBulkNotification(req.user.tenantId, title, message, type, data || {});

    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id, tenantId: req.user.tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.notification.count({
        where: { userId: req.user.id, tenantId: req.user.tenantId },
      }),
      prisma.notification.count({
        where: { userId: req.user.id, tenantId: req.user.tenantId, isRead: false },
      }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/notifications/clear
const clearAllNotifications = async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.user.id, tenantId: req.user.tenantId },
    });

    res.json({ success: true, message: 'All notifications cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/notifications/tokens
const deletePushToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    await prisma.pushToken.deleteMany({
      where: { token, userId: req.user.id },
    });

    res.json({ success: true, message: 'Token deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  savePushToken,
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  deletePushToken,
};
