const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditLog.controller');
const { authenticate, requireSuperAdmin } = require('../middleware/auth.middleware');

router.get('/', authenticate, requireSuperAdmin, getAuditLogs);

module.exports = router;
