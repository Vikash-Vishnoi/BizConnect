/**
 * Business Context Middleware
 * Handles multi-business context extraction and validation
 * Attaches business information to request object for use in controllers/services
 */

const logger = require('../../common/helpers/logger');
const config = require('../../config/server.config');

/**
 * Extract business context from request
 * Supports multiple strategies: header, subdomain, session
 */
const extractBusinessContext = async (req, res, next) => {
  // Skip for non-business routes (health, auth, etc.)
  if (shouldSkipBusinessContext(req.path)) {
    return next();
  }

  try {
    const businessId = getBusinessIdFromRequest(req);
    
    if (!businessId) {
      logger.warn('Business context missing', { 
        path: req.path,
        strategy: config.businessContextStrategy,
        userId: req.user?.id
      });
      
      // Return error only if multi-business is enabled
      if (config.multiBusinessEnabled) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BUSINESS_CONTEXT_REQUIRED',
            message: 'Business context is required. Please provide a valid business ID.'
          }
        });
      }
    }
    
    // Attach business context to request
    req.businessId = businessId;
    req.businessContext = {
      id: businessId,
      strategy: config.businessContextStrategy
    };
    
    // TODO: Validate business exists and user has access
    // This should query the Business model and check permissions
    
    next();
  } catch (error) {
    logger.error('Error extracting business context', { 
      error: error.message,
      path: req.path,
      userId: req.user?.id
    });
    next(error);
  }
};

/**
 * Get business ID from request based on configured strategy
 */
const getBusinessIdFromRequest = (req) => {
  const strategy = config.businessContextStrategy;
  
  switch (strategy) {
    case 'header':
      return req.headers[config.businessIdHeader.toLowerCase()];
    
    case 'session':
      return req.session?.businessId || req.user?.defaultBusinessId;
    
    case 'subdomain':
      // Extract from subdomain (e.g., business1.domain.com)
      const host = req.headers.host || '';
      const subdomain = host.split('.')[0];
      return subdomain !== 'www' && subdomain !== 'api' ? subdomain : null;
    
    default:
      logger.warn('Unknown business context strategy', { strategy });
      return null;
  }
};

/**
 * Determine if business context should be skipped for this route
 */
const shouldSkipBusinessContext = (path) => {
  const skipPaths = [
    '/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/verify',
    '/api/auth/me',  // Allow user profile fetch without business context
    '/api/business',  // Allow business list/create without business context (user selects after login)
    '/api/alerts',    // Alerts route handles auth and business context via express route middleware
    '/api/webhooks/whatsapp', // Webhook endpoints handle business context internally
    '/api/public', // Allow public endpoints without business context
    '/api/config',  // Config endpoints are public (needed during business setup before businessId exists)
    '/api/scheduled', // Scheduled routes handle their own auth + business context per route
    '/api/analytics/audit-logs' // Audit logs handle their own auth and business context (many are platform-wide)
  ];
  
  return skipPaths.some(skipPath => path.startsWith(skipPath));
};

/**
 * Validate that user has access to the business
 * This should be called after authentication middleware
 */
const validateBusinessAccess = async (req, res, next) => {
  if (!config.multiBusinessEnabled || !req.businessId) {
    return next();
  }
  
  try {
    // TODO: Implement business access validation
    // 1. Check if business exists
    // 2. Check if user is member of business
    // 3. Check user's role/permissions
    
    // const Business = require('../database/models/Business');
    // const business = await Business.findById(req.businessId);
    // if (!business) {
    //   return res.status(404).json({ error: 'Business not found' });
    // }
    
    // const hasAccess = business.members.some(
    //   member => member.userId.toString() === req.user.id
    // );
    // if (!hasAccess) {
    //   return res.status(403).json({ error: 'Access denied to this business' });
    // }
    
    next();
  } catch (error) {
    logger.error('Error validating business access', { 
      error: error.message,
      businessId: req.businessId,
      userId: req.user?.id
    });
    next(error);
  }
};

module.exports = {
  businessContext: extractBusinessContext,
  extractBusinessContext,
  validateBusinessAccess
};
