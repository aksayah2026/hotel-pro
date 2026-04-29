import api from './api';

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getRevenueAnalytics: (type?: string) => api.get('/dashboard/revenue', { params: { type } }),
  getRevenueHistory: (from?: string, to?: string) =>
    api.get('/dashboard/revenue/history', { params: { from, to } }),
  getRevenueReport: (params: { type: string; year: number; month?: number }) =>
    api.get('/dashboard/revenue/report', { params }),
};
