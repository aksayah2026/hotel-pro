const express = require('express');
const router = express.Router();
const { createPayment, getTenantPayments } = require('../controllers/saasPayment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireSuperAdmin } = require('../middleware/role.middleware');

router.post('/', authenticate, requireSuperAdmin, createPayment);
router.get('/tenant/:id', authenticate, requireSuperAdmin, getTenantPayments);

module.exports = router;
