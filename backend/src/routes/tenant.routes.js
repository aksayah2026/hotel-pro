const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireSuperAdmin } = require('../middleware/role.middleware');

// Plans info
router.get('/plans', authenticate, tenantController.getPlans);

// Super Admin Only
router.get('/', authenticate, requireSuperAdmin, tenantController.getAllTenants);
router.post('/', authenticate, requireSuperAdmin, tenantController.createTenant);
router.get('/activity', authenticate, requireSuperAdmin, tenantController.getTenantActivity);
router.post('/plans', authenticate, requireSuperAdmin, tenantController.createPlan);
router.put('/:id', authenticate, requireSuperAdmin, tenantController.updateTenant);
router.patch('/:id/status', authenticate, requireSuperAdmin, tenantController.updateTenantStatus);
router.delete('/:id', authenticate, requireSuperAdmin, tenantController.deleteTenant);
router.post('/renew', authenticate, requireSuperAdmin, tenantController.renewSubscription);

module.exports = router;
