const prisma = require('../lib/prisma');

// GET /api/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const { entity, entityId, tenantId, action, page = 1, limit = 50 } = req.query;
    console.log('Fetching audit logs with filters:', { entity, entityId, tenantId, action });
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where object dynamically, cleaning out invalid/undefined values
    const where = {};
    
    const addToWhere = (key, value) => {
      if (value && value !== 'undefined' && value !== 'null' && value !== '') {
        where[key] = value;
      }
    };

    addToWhere('action', action);
    addToWhere('entity', entity);
    addToWhere('entityId', entityId);
    addToWhere('tenantId', tenantId);

    console.log('Final Prisma where clause:', where);

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
