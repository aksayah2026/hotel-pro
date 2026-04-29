const prisma = require('../lib/prisma');

// GET /api/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const { entity, entityId, tenantId, action, page = 1, limit = 50 } = req.query;
    console.log('Fetching audit logs with filters:', { entity, entityId, tenantId, action });
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    
    if (tenantId) {
      // Use entityId/entity mapping to avoid "Unknown argument tenantId" if DB not synced
      // while still getting correct tenant-specific logs
      where.entity = 'TENANT';
      where.entityId = tenantId;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, mobile: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAuditLogs };
