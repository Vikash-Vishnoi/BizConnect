/**
 * Rate Limiting Middleware
 * Protects against brute force attacks and API abuse
 */

const rateLimit = require('express-rate-limit');
const { RateLimit } = require('../../database/models');

// Store for rate limiting
const store = {
  hits: new Map(),
  resetTime: new Map()
}; 

/**
 * Clean up old entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, resetTime] of store.resetTime.entries()) {
    if (now > resetTime) {
      store.hits.delete(key);
      store.resetTime.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Custom rate limit store using MongoDB
 */
const mongoStore = {
  async incr(key) {
    const now = Date.now();
    const resetTime = store.resetTime.get(key) || now + 60000; // 1 minute window
    
    if (now > resetTime) {
      store.hits.set(key, 1);
      store.resetTime.set(key, now + 60000);
      return { totalHits: 1, resetTime: new Date(now + 60000) };
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
      console.error('Rate limit logging error:', error);
    }
    
    return { totalHits: hits, resetTime: new Date(resetTime) };
  },
  
  async decrement(key) {
    const hits = Math.max((store.hits.get(key) || 1) - 1, 0);
    store.hits.set(key, hits);
  },
  
  async resetKey(key) {
    store.hits.delete(key);
    store.resetTime.delete(key);
  }
};

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use IP + user agent for more accuracy
    return `auth:${req.ip}:${req.get('user-agent')}`;
  }
});

/**
 * Standard rate limiter for API endpoints
 * 100 requests per 15 minutes per user/IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests. Please slow down and try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? `api:user:${req.user._id}` : `api:ip:${req.ip}`;
  }
});

/**
 * Relaxed rate limiter for webhook endpoints
 * 1000 requests per minute (WhatsApp can send many webhooks)
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
  message: {
    success: false,
    error: 'Webhook rate limit exceeded'
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
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Campaign creation rate limiter
 * 10 campaigns per hour per business
 */
const campaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 campaigns per hour
  message: {
    success: false,
    error: 'Campaign creation limit reached. Please wait before creating more campaigns.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `campaign:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Template creation rate limiter
 * 20 templates per hour per business
 */
const templateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 templates per hour
  message: {
    success: false,
    error: 'Template creation limit reached. Please wait before creating more templates.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `template:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Message sending rate limiter
 * 100 messages per minute per business (WhatsApp API limits)
 */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 messages per minute
  message: {
    success: false,
    error: 'Message sending rate limit reached. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `message:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Contact creation rate limiter
 * 100 contacts per hour per business
 */
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 contacts per hour
  message: {
    success: false,
    error: 'Contact creation limit reached. Please wait before creating more contacts.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `contact:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Bulk operations rate limiter
 * 5 bulk operations per hour per business
 */
const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 bulk operations per hour
  message: {
    success: false,
    error: 'Bulk operation limit reached. Please wait before performing more bulk operations.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `bulk:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Automation trigger rate limiter
 * 1000 automation triggers per hour per business
 */
const automationTriggerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 automation triggers per hour
  message: {
    success: false,
    error: 'Automation trigger limit reached. Too many automation executions.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return `automation:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Flow creation rate limiter
 * 10 flows per day per business
 */
const flowLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 flows per day
  message: {
    success: false,
    error: 'Flow creation limit reached. Maximum 10 flows per day.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `flow:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Contact import rate limiter
 * 10 imports per hour per business (for CSV/bulk imports)
 */
const contactImportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 imports per hour
  message: {
    success: false,
    error: 'Contact import limit reached. Please wait before importing more contacts.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `import:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Analytics/Export rate limiter
 * 20 exports per hour per business
 */
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 exports per hour
  message: {
    success: false,
    error: 'Export limit reached. Please wait before generating more exports.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `export:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Media upload rate limiter
 * 50 uploads per hour per business
 */
const mediaUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: 'Media upload limit reached. Please wait before uploading more files.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `media:${req.user?.businessId || req.ip}`;
  }
});

/**
 * Search rate limiter
 * 100 searches per minute per user
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 searches per minute
  message: {
    success: false,
    error: 'Too many search requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `search:${req.user?._id || req.ip}`;
  }
});

/**
 * Strict limiter for public endpoints
 * 10 requests per 15 minutes per IP (for endpoints without auth)
 */
const publicEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.'
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
