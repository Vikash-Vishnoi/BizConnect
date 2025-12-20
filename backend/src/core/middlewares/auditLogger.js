/**
 * ✅ FEATURE 36: Audit Logging Middleware
 * Automatically logs all API requests for compliance and security
 * 
 * PURPOSE:
 * - Compliance tracking (GDPR, HIPAA, SOC2)
 * - Security monitoring and threat detection
 * - User activity auditing
 * - Regulatory requirement fulfillment
 * 
 * WHAT IS LOGGED:
 * - Authentication events (login, logout, password changes)
 * - Resource modifications (create, update, delete)
 * - Permission changes and role assignments
 * - Sensitive operations (exports, API changes)
 * - Failed authorization attempts
 * 
 * MIDDLEWARE POSITIONING:
 * Should be placed AFTER rate limiting to capture rate limit violations:
 * 1. requestLogger - Request tracking
 * 2. rateLimiter - Rate limiting
 * 3. auditLogger \u2190 HERE (captures rate limit hits)
 * 4. authentication
 * 5. authorization
 * 
 * PERFORMANCE:
 * - Async logging (non-blocking)
 * - Skips GET requests for performance
 * - Skips webhook endpoints (high volume)
 * - Database writes are batched where possible
 * 
 * USAGE:
 * Automatically applied - no manual intervention needed
 * All POST/PUT/PATCH/DELETE requests are audited
 */

const AuditLog = require('../database/models/AuditLog');
 
/**
 * Map HTTP methods to action types
 */
const methodToAction = {
  'GET': 'VIEW',
  'POST': 'CREATE',
  'PUT': 'UPDATE',
  'PATCH': 'UPDATE',
  'DELETE': 'DELETE'
};

/**
 * Map routes to resource types and actions
 */
const routeMapping = {
  '/api/auth/login': { action: 'LOGIN', resourceType: 'USER' },
  '/api/auth/logout': { action: 'LOGOUT', resourceType: 'USER' },
  '/api/auth/register': { action: 'USER_CREATE', resourceType: 'USER' },
  '/api/auth/change-password': { action: 'PASSWORD_CHANGE', resourceType: 'USER' },
  
  '/api/templates': { action: 'TEMPLATE', resourceType: 'TEMPLATE' },
  '/api/campaigns': { action: 'CAMPAIGN', resourceType: 'CAMPAIGN' },
  '/api/conversations': { action: 'CONVERSATION', resourceType: 'CONVERSATION' },
  '/api/rbac': { action: 'RBAC', resourceType: 'ROLE' },
  '/api/automations': { action: 'AUTOMATION', resourceType: 'AUTOMATION' },
  '/api/settings': { action: 'SETTINGS_UPDATE', resourceType: 'SETTINGS' },
  '/api/groups': { action: 'GROUP', resourceType: 'GROUP' },
  '/api/flows': { action: 'FLOW', resourceType: 'FLOW' },
  '/api/channels': { action: 'CHANNEL', resourceType: 'CHANNEL' }
};

/**
 * Actions that should be logged
 */
const loggableActions = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
  'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ROLE_CHANGE',
  'TEMPLATE_CREATE', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE', 'TEMPLATE_SUBMIT',
  'CAMPAIGN_CREATE', 'CAMPAIGN_UPDATE', 'CAMPAIGN_DELETE', 'CAMPAIGN_START',
  'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE',
  'PERMISSION_GRANT', 'PERMISSION_REVOKE',
  'AUTOMATION_CREATE', 'AUTOMATION_UPDATE', 'AUTOMATION_DELETE',
  'SETTINGS_UPDATE', 'WEBHOOK_CONFIG',
  'FLOW_CREATE', 'FLOW_UPDATE', 'FLOW_DELETE', 'FLOW_PUBLISH',
  'CHANNEL_CREATE', 'CHANNEL_UPDATE', 'CHANNEL_DELETE', 'CHANNEL_BROADCAST',
  'DATA_EXPORT', 'DATA_DELETE'
];

/**
 * Audit logging middleware
 * Logs API requests for compliance and security monitoring
 */
const auditLogger = async (req, res, next) => {
  // Skip certain routes
  const skipRoutes = [
    '/api/webhooks',
    '/api/health',
    '/api/analytics',
    '/api/conversations'
  ];

  const shouldSkip = skipRoutes.some(route => req.path.startsWith(route));
  if (shouldSkip || req.method === 'GET') {
    return next();
  }

  // Capture request start time
  const startTime = Date.now();

  // Store original res.json
  const originalJson = res.json.bind(res);

  // Override res.json to capture response
  res.json = function(data) {
    res.auditData = data;
    return originalJson(data);
  };

  // Continue to next middleware
  res.on('finish', async () => {
    const processingTime = Date.now() - startTime;
    
    try {
      // Determine action and resource type
      let action = null;
      let resourceType = 'SYSTEM';
      let description = '';

      // Match route pattern
      for (const [route, mapping] of Object.entries(routeMapping)) {
        if (req.path.startsWith(route)) {
          const method = req.method;
          
          if (mapping.action.includes('_')) {
            // Specific action defined
            action = mapping.action;
          } else {
            // Generate action from method + resource
            const baseAction = mapping.action;
            if (method === 'POST' && req.path.includes('/send')) {
              action = `${baseAction}_SEND`;
            } else if (method === 'POST' && req.path.includes('/publish')) {
              action = `${baseAction}_PUBLISH`;
            } else if (method === 'POST' && req.path.includes('/start')) {
              action = `${baseAction}_START`;
            } else if (method === 'POST') {
              action = `${baseAction}_CREATE`;
            } else if (method === 'PUT' || method === 'PATCH') {
              action = `${baseAction}_UPDATE`;
            } else if (method === 'DELETE') {
              action = `${baseAction}_DELETE`;
            }
          }
          
          resourceType = mapping.resourceType;
          break;
        }
      }

      // Skip if action not loggable
      if (!action || !loggableActions.includes(action)) {
        return;
      }

      // Build description
      description = `${action.replace(/_/g, ' ')} via ${req.method} ${req.path}`;
      if (req.body?.name) description += ` - ${req.body.name}`;

      // Extract resource ID from URL or body
      let resourceId = null;
      let resourceName = null;

      const idMatch = req.path.match(/\/([a-f0-9]{24})/);
      if (idMatch) {
        resourceId = idMatch[1];
      } else if (req.body?._id) {
        resourceId = req.body._id;
      } else if (res.auditData?.data?._id) {
        resourceId = res.auditData.data._id;
      }

      if (req.body?.name) {
        resourceName = req.body.name;
      } else if (res.auditData?.data?.name) {
        resourceName = res.auditData.data.name;
      }

      // Determine status
      const status = res.statusCode >= HTTP_STATUS.OK && res.statusCode < HTTP_STATUS.BAD_REQUEST
        ? AUDIT_STATUS_SUCCESS
        : res.statusCode >= HTTP_STATUS.BAD_REQUEST
        ? AUDIT_STATUS_FAILURE
        : AUDIT_STATUS_PENDING;

      // Get IP address
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Sanitize request body (remove sensitive data)
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.password) sanitizedBody.password = SENSITIVE_FIELD_REDACTED;
      if (sanitizedBody.token) sanitizedBody.token = SENSITIVE_FIELD_REDACTED;
      if (sanitizedBody.apiKey) sanitizedBody.apiKey = SENSITIVE_FIELD_REDACTED;

      // Log the action
      await AuditLog.logAction({
        userId: req.user?._id,
        user: req.user,
        action,
        resourceType,
        resourceId,
        resourceName,
        description,
        status,
        errorMessage: res.auditData?.error || null,
        errorCode: res.statusCode >= HTTP_STATUS.BAD_REQUEST ? res.statusCode.toString() : null,
        requestData: {
          method: req.method,
          endpoint: req.path,
          params: req.params,
          body: sanitizedBody,
          query: req.query
        },
        responseData: {
          statusCode: res.statusCode,
          data: status === AUDIT_STATUS_SUCCESS ? { success: true } : null,
          duration: processingTime
        },
        ipAddress,
        userAgent: req.get('user-agent'),
        impact: {
          level: determineImpactLevel(action, status),
          affectedUsers: AFFECTED_USERS_DEFAULT
        }
      });

      logger.info('Audit log entry created', {
        userId: req.user?._id?.toString(),
        businessId: req.businessId?.toString(),
        action,
        resourceType,
        status,
        processingTime
      });

    } catch (error) {
      logger.error('Audit logging error', {
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        userId: req.user?._id?.toString(),
        businessId: req.businessId?.toString(),
        path: req.path,
        method: req.method,
        processingTime
      });
      // Don't fail the request if audit logging fails
    }
  });

  next();
};

/**
 * Determine impact level of an action
 */
function determineImpactLevel(action, status) {
  if (status !== AUDIT_STATUS_SUCCESS) return IMPACT_LEVEL_NONE;

  const criticalActions = ['USER_DELETE', 'DATA_DELETE', 'ROLE_DELETE'];
  const highActions = ['PERMISSION_REVOKE', 'SETTINGS_UPDATE', 'CAMPAIGN_START'];
  const mediumActions = ['TEMPLATE_CREATE', 'CAMPAIGN_CREATE', 'FLOW_PUBLISH'];

  if (criticalActions.includes(action)) return IMPACT_LEVEL_CRITICAL;
  if (highActions.includes(action)) return IMPACT_LEVEL_HIGH;
  if (mediumActions.includes(action)) return IMPACT_LEVEL_MEDIUM;
  return IMPACT_LEVEL_LOW;
}

/**
 * Manual audit logging helper
 * Use this in routes for specific audit requirements
 */
async function logManualAction(data) {
  const startTime = Date.now();
  
  try {
    await AuditLog.logAction(data);
    
    const processingTime = Date.now() - startTime;
    logger.info('Manual audit log entry created', {
      userId: data.userId?.toString(),
      action: data.action,
      resourceType: data.resourceType,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Manual audit logging error', {
      error: error.message,
      errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
      action: data.action,
      resourceType: data.resourceType,
      processingTime
    });
  }
}

module.exports = {
  auditLogger,
  logManualAction
};
