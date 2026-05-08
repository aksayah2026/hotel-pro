import api from './api';

export interface Notification {
  id: string;
  userId?: string;
  tenantId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  // Register token
  registerToken: (token: string, platform: string) => {
    return api.post('/notifications/tokens', { token, platform });
  },

  // Delete token
  deleteToken: (token: string) => {
    return api.delete('/notifications/tokens', { data: { token } });
  },

  // Get notifications
  getAll: (page = 1, limit = 20) => {
    return api.get(`/notifications?page=${page}&limit=${limit}`);
  },

  // Mark notification as read
  markAsRead: (id: string) => {
    return api.patch(`/notifications/${id}/read`);
  },

  // Mark all as read
  markAllAsRead: () => {
    return api.patch('/notifications/read-all');
  },
};
