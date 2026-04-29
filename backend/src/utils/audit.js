const prisma = require('../lib/prisma');

/**
 * Log an action to the audit_logs table
 * @param {string} userId - ID of the user performing the action
 * @param {string} action - Action performed (e.g. 'CREATE_TENANT')
 * @param {string} entity - Entity affected (e.g. 'TENANT')
 * @param {string} entityId - ID of the affected entity
 * @param {object} details - Additional details (optional)
 * @param {string} tenantId - ID of the relevant tenant (optional)
 */
const logAction = async (userId, action, entity, entityId, details = {}, tenantId = null) => {
  try {
    // Sanitize sensitive fields
    const sensitiveFields = ['password', 'mobile', 'email', 'aadhaarNumber', 'secret', 'token'];
    const sanitizedDetails = { ...details };
    
    Object.keys(sanitizedDetails).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        delete sanitizedDetails[key];
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        tenantId,
        details: sanitizedDetails
      }
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
};

module.exports = { logAction };
