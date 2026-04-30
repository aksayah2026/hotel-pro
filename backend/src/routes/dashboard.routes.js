const express = require('express');
const router = express.Router();
const { 
  getDashboardStats, 
  getRevenueAnalytics, 
  getRevenueHistory, 
  getRevenueReport 
} = require('../controllers/dashboard.controller');
const { getSuperAdminStats } = require('../controllers/admin.dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireSuperAdmin, requireAdmin } = require('../middleware/role.middleware');

router.get('/stats', authenticate, getDashboardStats);
router.get('/super-admin/stats', authenticate, requireSuperAdmin, getSuperAdminStats);
router.get('/revenue', authenticate, requireAdmin, getRevenueAnalytics);
router.get('/revenue/history', authenticate, requireAdmin, getRevenueHistory);
router.get('/revenue/report', authenticate, requireAdmin, getRevenueReport);


module.exports = router;
