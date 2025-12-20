/**
 * Redis-Based Rate Limiting Middleware
 * Cluster-safe rate limiting using Redis for distributed systems
 * @module middleware/redisRateLimiter
 */

const rateLimit = require('express-rate-limit');
const logger = require('../../common/helpers/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../../common/constants');

// ============================================
// CONSTANTS
// ============================================

// Time windows (in milliseconds)
const TIME_WINDOW = {
  ONE_MINUTE: 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
};

// Rate limits
const RATE_LIMITS = {
  AUTH_MAX: 5,
  API_MAX: 100,
  WEBHOOK_MAX: 500,
  WEBHOOK_VERIFY_MAX: 20,
  PASSWORD_RESET_MAX: 3,
  CAMPAIGN_MAX: 10,
  TEMPLATE_MAX: 20,
  MESSAGE_MAX: 100,
  CONTACT_MAX: 100,
  BULK_MAX: 5,
  MEDIA_MAX: 50,
  SEARCH_MAX: 100,
  PUBLIC_MAX: 10,
};

// Redis configuration
const REDIS_CONNECT_TIMEOUT = 10000; // 10 seconds
const REDIS_DEFAULT_PORT = 6379;
const REDIS_DEFAULT_DB = 0;

// Rate limiter prefixes
const RATE_LIMITER_PREFIX = {
  AUTH: 'auth',
  API: 'api',
  WEBHOOK: 'webhook',
  WEBHOOK_VERIFY: 'webhook_verify',
  PASSWORD_RESET: 'password_reset',
  CAMPAIGN: 'campaign',
  TEMPLATE: 'template',
  MESSAGE: 'message',
  CONTACT: 'contact',
  BULK: 'bulk',
  MEDIA: 'media',
  SEARCH: 'search',
  PUBLIC: 'public',
};

// Error messages
const ERROR_MESSAGES = {
  TOO_MANY_AUTH_ATTEMPTS: 'Too many authentication attempts. Please try again after 15 minutes.',
  TOO_MANY_REQUESTS: 'Too many requests. Please slow down and try again later.',
  WEBHOOK_RATE_LIMIT: 'Webhook rate limit exceeded',
  TOO_MANY_VERIFICATION_REQUESTS: 'Too many verification requests',
  TOO_MANY_PASSWORD_RESET_ATTEMPTS: 'Too many password reset attempts. Please try again after 1 hour.',
  CAMPAIGN_LIMIT_REACHED: 'Campaign creation limit reached. Please wait before creating more campaigns.',
  TEMPLATE_LIMIT_REACHED: 'Template creation limit reached. Please wait before creating more templates.',
  MESSAGE_LIMIT_REACHED: 'Message sending rate limit reached. Please slow down.',
  CONTACT_LIMIT_REACHED: 'Contact creation limit reached. Please wait before creating more contacts.',
  BULK_LIMIT_REACHED: 'Bulk operation limit reached. Please wait before performing more bulk operations.',
  MEDIA_LIMIT_REACHED: 'Media upload limit reached. Please wait before uploading more files.',
  TOO_MANY_SEARCH_REQUESTS: 'Too many search requests. Please slow down.',
  TOO_MANY_PUBLIC_REQUESTS: 'Too many requests from this IP. Please try again later.',
};

// Check if Redis configuration is available
const REDIS_ENABLED = process.env.REDIS_URL || process.env.REDIS_HOST;

let RedisStore; 
let redisClient;

// Initialize Redis connection if available
if (REDIS_ENABLED) {
  try {
    // Lazy load Redis dependencies
    const redis = require('redis');
    const { RedisStore: RateLimitRedisStore } = require('rate-limit-redis');
    
    // Create Redis client
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || REDIS_DEFAULT_PORT,
        connectTimeout: REDIS_CONNECT_TIMEOUT
      },
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DB) || REDIS_DEFAULT_DB
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { 
        error: err.message,
        errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      });
      logger.warn('Falling back to memory-based rate limiting');
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected for rate limiting');
    });

    redisClient.connect().catch((err) => {
      logger.error('Failed to connect to Redis', { 
        error: err.message,
        errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      });
      logger.warn('Using memory-based rate limiting instead');
    });

    RedisStore = RateLimitRedisStore;
    
  } catch (error) {
    logger.error('Redis initialization error', { 
      error: error.message,
      errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR
    });
    logger.warn('Redis packages not installed. Using memory-based rate limiting.');
    logger.info('To enable Redis rate limiting, install: npm install redis rate-limit-redis');
  }
}

/**
 * Create rate limiter with Redis store if available, fallback to memory
 */
function createRateLimiter(options) {
  const processingStartTime = Date.now();

  try {
    const {
      windowMs,
      max,
      message,
      keyGenerator,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      standardHeaders = true,
      legacyHeaders = false,
      prefix = 'rl'
    } = options;

    const limiterOptions = {
      windowMs,
      max,
      message: message || {
        success: false,
        error: ERROR_MESSAGES.TOO_MANY_REQUESTS
      },
      standardHeaders,
      legacyHeaders,
      skipSuccessfulRequests,
      skipFailedRequests,
      keyGenerator: keyGenerator || ((req) => req.ip)
    };

    // Use Redis store if available and connected
    if (RedisStore && redisClient && redisClient.isReady) {
      limiterOptions.store = new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: `${prefix}:`,
      });
      
      logger.debug(`Rate limiter "${prefix}" using Redis store (cluster-safe)`);
    } else {
      logger.warn(`Rate limiter "${prefix}" using memory store (NOT cluster-safe)`);
    }

    const processingTime = Date.now() - processingStartTime;
    logger.debug('Rate limiter created', {
      prefix,
      processingTime: `${processingTime}ms`
    });

    return rateLimit(limiterOptions);
  } catch (error) {
    logger.error('Error creating rate limiter', {
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
    throw error;
  }
}

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
const authLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.FIFTEEN_MINUTES,
  max: RATE_LIMITS.AUTH_MAX,
  prefix: RATE_LIMITER_PREFIX.AUTH,
  message: {
    success: false,
    error: ERROR_MESSAGES.TOO_MANY_AUTH_ATTEMPTS
  },
  keyGenerator: (req) => `auth:${req.ip}:${req.get('user-agent')}`
});

/**
 * Standard rate limiter for API endpoints
 * 100 requests per 15 minutes per user/IP
 */
const apiLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.FIFTEEN_MINUTES,
  max: RATE_LIMITS.API_MAX,
  prefix: RATE_LIMITER_PREFIX.API,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: ERROR_MESSAGES.TOO_MANY_REQUESTS
  },
  keyGenerator: (req) => req.user ? `api:user:${req.user._id?.toString()}` : `api:ip:${req.ip}`
});

/**
 * Webhook rate limiter - more permissive for WhatsApp webhooks
 * 500 requests per minute (reduced from 1000 for security)
 */
const webhookLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.ONE_MINUTE,
  max: RATE_LIMITS.WEBHOOK_MAX,
  prefix: RATE_LIMITER_PREFIX.WEBHOOK,
  message: {
    success: false,
    error: ERROR_MESSAGES.WEBHOOK_RATE_LIMIT
  },
  skip: (req) => req.get('x-hub-signature-256') !== undefined
});

/**
 * Webhook verification rate limiter
 * 20 requests per minute per IP
 */
const webhookVerificationLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.ONE_MINUTE,
  max: RATE_LIMITS.WEBHOOK_VERIFY_MAX,
  prefix: RATE_LIMITER_PREFIX.WEBHOOK_VERIFY,
  message: {
    success: false,
    error: ERROR_MESSAGES.TOO_MANY_VERIFICATION_REQUESTS
  }
});

/**
 * Password reset rate limiter
 * 3 requests per hour per IP
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.ONE_HOUR,
  max: RATE_LIMITS.PASSWORD_RESET_MAX,
  prefix: RATE_LIMITER_PREFIX.PASSWORD_RESET,
  message: {
    success: false,
    error: ERROR_MESSAGES.TOO_MANY_PASSWORD_RESET_ATTEMPTS
  }
});

/**
 * Campaign creation rate limiter
 * 10 campaigns per hour per business
 */
const campaignLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.ONE_HOUR,
  max: RATE_LIMITS.CAMPAIGN_MAX,
  prefix: RATE_LIMITER_PREFIX.CAMPAIGN,
  message: {
    success: false,
    error: ERROR_MESSAGES.CAMPAIGN_LIMIT_REACHED
  },
  keyGenerator: (req) => `campaign:${req.user?.businessId?.toString() || req.ip}`
});

/**
 * Template creation rate limiter
 * 20 templates per hour per business
 */
const templateLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.ONE_HOUR,
  max: RATE_LIMITS.TEMPLATE_MAX,
  prefix: RATE_LIMITER_PREFIX.TEMPLATE,
  message: {
    success: false,
    error: ERROR_MESSAGES.TEMPLATE_LIMIT_REACHED
  },
  keyGenerator: (req) => `template:${req.user?.businessId?.toString() || req.ip}`
});

/**
 * Message sending rate limiter
 * 100 messages per minute per business
 */
const messageLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.ONE_MINUTE,
  max: RATE_LIMITS.MESSAGE_MAX,
  prefix: RATE_LIMITER_PREFIX.MESSAGE,
  message: {
    success: false,
    error: ERROR_MESSAGES.MESSAGE_LIMIT_REACHED
  },
  keyGenerator: (req) => `message:${req.user?.businessId?.toString() || req.ip}`
});

/**
 * Contact creation rate limiter
 * 100 contacts per hour per business
 */
const contactLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.ONE_HOUR,
  max: RATE_LIMITS.CONTACT_MAX,
  prefix: RATE_LIMITER_PREFIX.CONTACT,
  message: {
    success: false,
    error: ERROR_MESSAGES.CONTACT_LIMIT_REACHED
  },
  keyGenerator: (req) => `contact:${req.user?.businessId?.toString() || req.ip}`
});

/**
 * Bulk operations rate limiter
 * 5 bulk operations per hour per business
 */
const bulkOperationLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.ONE_HOUR,
  max: RATE_LIMITS.BULK_MAX,
  prefix: RATE_LIMITER_PREFIX.BULK,
  message: {
    success: false,
    error: ERROR_MESSAGES.BULK_LIMIT_REACHED
  },
  keyGenerator: (req) => `bulk:${req.user?.businessId?.toString() || req.ip}`
});

/**
 * Media upload rate limiter
 * 50 uploads per hour per business
 */
const mediaUploadLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.ONE_HOUR,
  max: RATE_LIMITS.MEDIA_MAX,
  prefix: RATE_LIMITER_PREFIX.MEDIA,
  message: {
    success: false,
    error: ERROR_MESSAGES.MEDIA_LIMIT_REACHED
  },
  keyGenerator: (req) => `media:${req.user?.businessId?.toString() || req.ip}`
});

/**
 * Search rate limiter
 * 100 searches per minute per user
 */
const searchLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.ONE_MINUTE,
  max: RATE_LIMITS.SEARCH_MAX,
  prefix: RATE_LIMITER_PREFIX.SEARCH,
  message: {
    success: false,
    error: ERROR_MESSAGES.TOO_MANY_SEARCH_REQUESTS
  },
  keyGenerator: (req) => `search:${req.user?._id?.toString() || req.ip}`
});

/**
 * Public endpoint rate limiter
 * 10 requests per 15 minutes per IP
 */
const publicEndpointLimiter = createRateLimiter({
  windowMs: TIME_WINDOW.FIFTEEN_MINUTES,
  max: RATE_LIMITS.PUBLIC_MAX,
  prefix: RATE_LIMITER_PREFIX.PUBLIC,
  message: {
    success: false,
    error: ERROR_MESSAGES.TOO_MANY_PUBLIC_REQUESTS
  }
});

/**
 * Get Redis connection status
 */
function getRedisStatus() {
  try {
    return {
      enabled: !!REDIS_ENABLED,
      connected: redisClient ? redisClient.isReady : false,
      client: redisClient ? 'active' : 'not-initialized'
    };
  } catch (error) {
    logger.error('Error getting Redis status', {
      error: error.message,
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
    return {
      enabled: false,
      connected: false,
      client: 'error',
      error: error.message
    };
  }
}

/**
 * Graceful shutdown - close Redis connection
 */
async function closeRedisConnection() {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection', { 
        error: error.message,
        errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      });
    }
  }
}

// Handle process termination
process.on('SIGTERM', closeRedisConnection);
process.on('SIGINT', closeRedisConnection);

module.exports = {
  authLimiter,
  apiLimiter,
  webhookLimiter,
  webhookVerificationLimiter,
  passwordResetLimiter,
  campaignLimiter,
  templateLimiter,
  messageLimiter,
  contactLimiter,
  bulkOperationLimiter,
  mediaUploadLimiter,
  searchLimiter,
  publicEndpointLimiter,
  getRedisStatus,
  closeRedisConnection,
  redisClient
};
