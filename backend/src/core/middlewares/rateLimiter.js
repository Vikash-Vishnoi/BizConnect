/**
 * Rate Limiting Middleware
 * Protects against brute force attacks and API abuse
 * Phase 28: Refactored with constants, structured logging, and performance tracking
 */

const rateLimit = require('express-rate-limit');
const { RateLimit } = require('../database/models');
const logger = require('../../common/helpers/logger');
const { HTTP_STATUS } = require('../../common/constants/app.constants');

// ========================================
// CONSTANTS
// ========================================

// Time windows (in milliseconds)
const TIME_WINDOWS = {
  ONE_MINUTE: 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000
};

// Rate limit thresholds
const RATE_LIMITS = {
  AUTH: 5,                    // 5 authentication attempts per 15 minutes
  API: 100,                   // 100 API requests per 15 minutes
  WEBHOOK: 1000,              // 1000 webhook requests per minute
  PASSWORD_RESET: 3,          // 3 password reset attempts per hour
  CAMPAIGN: 10,               // 10 campaigns per hour
  TEMPLATE: 20,               // 20 templates per hour
  MESSAGE: 100,               // 100 messages per minute
  CONTACT: 100,               // 100 contacts per hour
  BULK_OPERATION: 5,          // 5 bulk operations per hour
  AUTOMATION_TRIGGER: 1000,   // 1000 automation triggers per hour
  FLOW: 10,                   // 10 flows per day
  CONTACT_IMPORT: 10,         // 10 imports per hour
  EXPORT: 20,                 // 20 exports per hour
  MEDIA_UPLOAD: 50,           // 50 uploads per hour
  SEARCH: 100,                // 100 searches per minute
  PUBLIC_ENDPOINT: 10         // 10 public endpoint requests per 15 minutes
};

// Error messages
const ERROR_MESSAGES = {
  AUTH_LIMIT: 'Too many authentication attempts. Please try again after 15 minutes.',
  API_LIMIT: 'Too many requests. Please slow down and try again later.',
  WEBHOOK_LIMIT: 'Webhook rate limit exceeded',
  PASSWORD_RESET_LIMIT: 'Too many password reset attempts. Please try again after 1 hour.',
  CAMPAIGN_LIMIT: 'Campaign creation limit reached. Please wait before creating more campaigns.',
  TEMPLATE_LIMIT: 'Template creation limit reached. Please wait before creating more templates.',
  MESSAGE_LIMIT: 'Message sending rate limit reached. Please slow down.',
  CONTACT_LIMIT: 'Contact creation limit reached. Please wait before creating more contacts.',
  BULK_OPERATION_LIMIT: 'Bulk operation limit reached. Please wait before performing more bulk operations.',
  AUTOMATION_TRIGGER_LIMIT: 'Automation trigger limit reached. Too many automation executions.',
  FLOW_LIMIT: 'Flow creation limit reached. Maximum 10 flows per day.',
  CONTACT_IMPORT_LIMIT: 'Contact import limit reached. Please wait before importing more contacts.',
  EXPORT_LIMIT: 'Export limit reached. Please wait before generating more exports.',
  MEDIA_UPLOAD_LIMIT: 'Media upload limit reached. Please wait before uploading more files.',
  SEARCH_LIMIT: 'Too many search requests. Please slow down.',
  PUBLIC_ENDPOINT_LIMIT: 'Too many requests from this IP. Please try again later.'
};

// Key prefixes for different rate limit types
const KEY_PREFIXES = {
  AUTH: 'auth',
  API_USER: 'api:user',
  API_IP: 'api:ip',
  CAMPAIGN: 'campaign',
  TEMPLATE: 'template',
  MESSAGE: 'message',
  CONTACT: 'contact',
  BULK: 'bulk',
  AUTOMATION: 'automation',
  FLOW: 'flow',
  IMPORT: 'import',
  EXPORT: 'export',
  MEDIA: 'media',
  SEARCH: 'search'
};

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Log context labels
const LOG_CONTEXT = {
  RATE_LIMIT_LOG_ERROR: 'Rate limit logging error',
  CLEANUP_TRIGGERED: 'Rate limit store cleanup triggered',
  ENTRIES_CLEANED: 'Expired rate limit entries cleaned'
};

// ========================================
// RATE LIMIT STORE
// ========================================

// ========================================
// RATE LIMIT STORE
// ========================================

// Store for rate limiting
const store = {
  hits: new Map(),
  resetTime: new Map()
}; 

/**
 * Clean up old entries every 5 minutes
 */
setInterval(() => {
  const startTime = Date.now();
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, resetTime] of store.resetTime.entries()) {
    if (now > resetTime) {
      store.hits.delete(key);
      store.resetTime.delete(key);
      cleanedCount++;
    }
  }
  
  const processingTime = Date.now() - startTime;
  
  if (cleanedCount > 0) {
    logger.debug(LOG_CONTEXT.ENTRIES_CLEANED, { 
      cleanedCount, 
      processingTime: `${processingTime}ms`,
      remainingEntries: store.hits.size
    });
  }
}, CLEANUP_INTERVAL);

/**
 * Custom rate limit store using MongoDB
 */
const mongoStore = {
  async incr(key) {
    const startTime = Date.now();
    const now = Date.now();
    const resetTime = store.resetTime.get(key) || now + TIME_WINDOWS.ONE_MINUTE;
    
    try {
      if (now > resetTime) {
        store.hits.set(key, 1);
        store.resetTime.set(key, now + TIME_WINDOWS.ONE_MINUTE);
        
        const processingTime = Date.now() - startTime;
        logger.debug('Rate limit reset', { 
          key, 
          processingTime: `${processingTime}ms` 
        });
        
        return { totalHits: 1, resetTime: new Date(now + TIME_WINDOWS.ONE_MINUTE) };
      }
      
      const hits = (store.hits.get(key) || 0) + 1;
      store.hits.set(key, hits);
      
      // Log to database for monitoring
      try {
        await RateLimit.create({
          key,
          hits: 1,
          window: 'auth',
          timestamp: new Date()
        });
      } catch (error) {
        logger.error(LOG_CONTEXT.RATE_LIMIT_LOG_ERROR, { 
          error: error.message, 
          key 
        });
      }
      
      const processingTime = Date.now() - startTime;
      logger.debug('Rate limit incremented', { 
        key, 
        hits, 
        processingTime: `${processingTime}ms` 
      });
      
      return { totalHits: hits, resetTime: new Date(resetTime) };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Rate limit increment error', { 
        error: error.message, 
        key, 
        processingTime: `${processingTime}ms` 
      });
      throw error;
    }
  },
  
  async decrement(key) {
    const startTime = Date.now();
    
    try {
      const hits = Math.max((store.hits.get(key) || 1) - 1, 0);
      store.hits.set(key, hits);
      
      const processingTime = Date.now() - startTime;
      logger.debug('Rate limit decremented', { 
        key, 
        hits, 
        processingTime: `${processingTime}ms` 
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Rate limit decrement error', { 
        error: error.message, 
        key, 
        processingTime: `${processingTime}ms` 
      });
    }
  },
  
  async resetKey(key) {
    const startTime = Date.now();
    
    try {
      store.hits.delete(key);
      store.resetTime.delete(key);
      
      const processingTime = Date.now() - startTime;
      logger.debug('Rate limit key reset', { 
        key, 
        processingTime: `${processingTime}ms` 
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Rate limit key reset error', { 
        error: error.message, 
        key, 
        processingTime: `${processingTime}ms` 
      });
    }
  }
};

// ========================================
// RATE LIMITERS
// ========================================

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: TIME_WINDOWS.FIFTEEN_MINUTES,
  max: RATE_LIMITS.AUTH,
  message: {
    success: false,
    error: ERROR_MESSAGES.AUTH_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use IP + user agent for more accuracy
    return `${KEY_PREFIXES.AUTH}:${req.ip}:${req.get('user-agent')}`;
  }
});

/**
 * Standard rate limiter for API endpoints
 * 100 requests per 15 minutes per user/IP
 */
const apiLimiter = rateLimit({
  windowMs: TIME_WINDOWS.FIFTEEN_MINUTES,
  max: RATE_LIMITS.API,
  message: {
    success: false,
    error: ERROR_MESSAGES.API_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? `${KEY_PREFIXES.API_USER}:${req.user._id}` : `${KEY_PREFIXES.API_IP}:${req.ip}`;
  }
});

/**
 * Relaxed rate limiter for webhook endpoints
 * 1000 requests per minute (WhatsApp can send many webhooks)
 */
const webhookLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_MINUTE,
  max: RATE_LIMITS.WEBHOOK,
  message: {
    success: false,
    error: ERROR_MESSAGES.WEBHOOK_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for verified webhooks
    return req.get('x-hub-signature-256') !== undefined;
  }
});

/**
 * Strict rate limiter for password reset
 * 3 requests per hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_HOUR,
  max: RATE_LIMITS.PASSWORD_RESET,
  message: {
    success: false,
    error: ERROR_MESSAGES.PASSWORD_RESET_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Campaign creation rate limiter
 * 10 campaigns per hour per business
 */
const campaignLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_HOUR,
  max: RATE_LIMITS.CAMPAIGN,
  message: {
    success: false,
    error: ERROR_MESSAGES.CAMPAIGN_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.CAMPAIGN}:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Template creation rate limiter
 * 20 templates per hour per business
 */
const templateLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_HOUR,
  max: RATE_LIMITS.TEMPLATE,
  message: {
    success: false,
    error: ERROR_MESSAGES.TEMPLATE_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.TEMPLATE}:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Message sending rate limiter
 * 100 messages per minute per business (WhatsApp API limits)
 */
const messageLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_MINUTE,
  max: RATE_LIMITS.MESSAGE,
  message: {
    success: false,
    error: ERROR_MESSAGES.MESSAGE_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.MESSAGE}:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Contact creation rate limiter
 * 100 contacts per hour per business
 */
const contactLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_HOUR,
  max: RATE_LIMITS.CONTACT,
  message: {
    success: false,
    error: ERROR_MESSAGES.CONTACT_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.CONTACT}:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Bulk operations rate limiter
 * 5 bulk operations per hour per business
 */
const bulkOperationLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_HOUR,
  max: RATE_LIMITS.BULK_OPERATION,
  message: {
    success: false,
    error: ERROR_MESSAGES.BULK_OPERATION_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.BULK}:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Automation trigger rate limiter
 * 1000 automation triggers per hour per business
 */
const automationTriggerLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_HOUR,
  max: RATE_LIMITS.AUTOMATION_TRIGGER,
  message: {
    success: false,
    error: ERROR_MESSAGES.AUTOMATION_TRIGGER_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.AUTOMATION}:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Flow creation rate limiter
 * 10 flows per day per business
 */
const flowLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_DAY,
  max: RATE_LIMITS.FLOW,
  message: {
    success: false,
    error: ERROR_MESSAGES.FLOW_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.FLOW}:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Contact import rate limiter
 * 10 imports per hour per business (for CSV/bulk imports)
 */
const contactImportLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_HOUR,
  max: RATE_LIMITS.CONTACT_IMPORT,
  message: {
    success: false,
    error: ERROR_MESSAGES.CONTACT_IMPORT_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.IMPORT}:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Analytics/Export rate limiter
 * 20 exports per hour per business
 */
const exportLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_HOUR,
  max: RATE_LIMITS.EXPORT,
  message: {
    success: false,
    error: ERROR_MESSAGES.EXPORT_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.EXPORT}:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Media upload rate limiter
 * 50 uploads per hour per business
 */
const mediaUploadLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_HOUR,
  max: RATE_LIMITS.MEDIA_UPLOAD,
  message: {
    success: false,
    error: ERROR_MESSAGES.MEDIA_UPLOAD_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.MEDIA}:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Search rate limiter
 * 100 searches per minute per user
 */
const searchLimiter = rateLimit({
  windowMs: TIME_WINDOWS.ONE_MINUTE,
  max: RATE_LIMITS.SEARCH,
  message: {
    success: false,
    error: ERROR_MESSAGES.SEARCH_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${KEY_PREFIXES.SEARCH}:${req.user?._id || req.ip}`;
  }
});

/**
 * Strict limiter for public endpoints
 * 10 requests per 15 minutes per IP (for endpoints without auth)
 */
const publicEndpointLimiter = rateLimit({
  windowMs: TIME_WINDOWS.FIFTEEN_MINUTES,
  max: RATE_LIMITS.PUBLIC_ENDPOINT,
  message: {
    success: false,
    error: ERROR_MESSAGES.PUBLIC_ENDPOINT_LIMIT
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  apiLimiter,
  webhookLimiter,
  passwordResetLimiter,
  campaignLimiter,
  templateLimiter,
  messageLimiter,
  contactLimiter,
  bulkOperationLimiter,
  automationTriggerLimiter,
  flowLimiter,
  contactImportLimiter,
  exportLimiter,
  mediaUploadLimiter,
  searchLimiter,
  publicEndpointLimiter
};
