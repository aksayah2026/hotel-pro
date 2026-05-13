const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  savePushToken,
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  deletePushToken,
} = require('../controllers/notification.controller');

// 5. Add Debug Logs
console.log('[Notification Routes Init] Handlers loaded:', {
  savePushToken: typeof savePushToken,
  sendNotification: typeof sendNotification,
  markAsRead: typeof markAsRead,
  authenticate: typeof authenticate,
});

// 1. Register/Save Push Token
// POST /api/notifications/tokens
router.post('/tokens', authenticate, savePushToken);

// 2. Remove Push Token (on logout)
// DELETE /api/notifications/tokens
router.delete('/tokens', authenticate, deletePushToken);

// 3. Get User Notifications
// GET /api/notifications
router.get('/', authenticate, getNotifications);

// 4. Send Manual/Bulk Notification
// POST /api/notifications/send
router.post('/send', authenticate, sendNotification);

// 5. Mark Single Notification as Read
// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, markAsRead);

// 6. Mark All Notifications as Read
// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, markAllAsRead);

// 7. Clear All User Notifications
// DELETE /api/notifications/clear
router.delete('/clear', authenticate, clearAllNotifications);

module.exports = router;
