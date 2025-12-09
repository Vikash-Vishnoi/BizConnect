/**
 * Redis-Based Rate Limiting Middleware
 * Cluster-safe rate limiting using Redis for distributed systems
 * @module middleware/redisRateLimiter
 */

const rateLimit = require('express-rate-limit');

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
        port: parseInt(process.env.REDIS_PORT) || 6379,
        connectTimeout: 10000
      },
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DB) || 0
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
      console.warn('⚠️  Falling back to memory-based rate limiting');
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected for rate limiting');
    });

    redisClient.connect().catch((err) => {
      console.error('❌ Failed to connect to Redis:', err);
      console.warn('⚠️  Using memory-based rate limiting instead');
    });

    RedisStore = RateLimitRedisStore;
    
  } catch (error) {
    console.error('❌ Redis initialization error:', error.message);
    console.warn('⚠️  Redis packages not installed. Using memory-based rate limiting.');
    console.info('ℹ️  To enable Redis rate limiting, install: npm install redis rate-limit-redis');
  }
}

/**
 * Create rate limiter with Redis store if available, fallback to memory
 */
function createRateLimiter(options) {
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
      error: 'Too many requests. Please try again later.'
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
    
    console.log(`✅ Rate limiter "${prefix}" using Redis store (cluster-safe)`);
  } else {
    console.warn(`⚠️  Rate limiter "${prefix}" using memory store (NOT cluster-safe)`);
  }

  return rateLimit(limiterOptions);
}

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: 'auth',
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  keyGenerator: (req) => `auth:${req.ip}:${req.get('user-agent')}`
});

/**
 * Standard rate limiter for API endpoints
 * 100 requests per 15 minutes per user/IP
 */
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  prefix: 'api',
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many requests. Please slow down and try again later.'
  },
  keyGenerator: (req) => req.user ? `api:user:${req.user._id}` : `api:ip:${req.ip}`
});

/**
 * Webhook rate limiter - more permissive for WhatsApp webhooks
 * 500 requests per minute (reduced from 1000 for security)
 */
const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 500,
  prefix: 'webhook',
  message: {
    success: false,
    error: 'Webhook rate limit exceeded'
  },
  skip: (req) => req.get('x-hub-signature-256') !== undefined
});

/**
 * Webhook verification rate limiter
 * 20 requests per minute per IP
 */
const webhookVerificationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  prefix: 'webhook_verify',
  message: {
    success: false,
    error: 'Too many verification requests'
  }
});

/**
 * Password reset rate limiter
 * 3 requests per hour per IP
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  prefix: 'password_reset',
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again after 1 hour.'
  }
});

/**
 * Campaign creation rate limiter
 * 10 campaigns per hour per business
 */
const campaignLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  prefix: 'campaign',
  message: {
    success: false,
    error: 'Campaign creation limit reached. Please wait before creating more campaigns.'
  },
  keyGenerator: (req) => `campaign:${req.user?.businessId || req.ip}`
});

/**
 * Template creation rate limiter
 * 20 templates per hour per business
 */
const templateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  prefix: 'template',
  message: {
    success: false,
    error: 'Template creation limit reached. Please wait before creating more templates.'
  },
  keyGenerator: (req) => `template:${req.user?.businessId || req.ip}`
});

/**
 * Message sending rate limiter
 * 100 messages per minute per business
 */
const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  prefix: 'message',
  message: {
    success: false,
    error: 'Message sending rate limit reached. Please slow down.'
  },
  keyGenerator: (req) => `message:${req.user?.businessId || req.ip}`
});

/**
 * Contact creation rate limiter
 * 100 contacts per hour per business
 */
const contactLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100,
  prefix: 'contact',
  message: {
    success: false,
    error: 'Contact creation limit reached. Please wait before creating more contacts.'
  },
  keyGenerator: (req) => `contact:${req.user?.businessId || req.ip}`
});

/**
 * Bulk operations rate limiter
 * 5 bulk operations per hour per business
 */
const bulkOperationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: 'bulk',
  message: {
    success: false,
    error: 'Bulk operation limit reached. Please wait before performing more bulk operations.'
  },
  keyGenerator: (req) => `bulk:${req.user?.businessId || req.ip}`
});

/**
 * Media upload rate limiter
 * 50 uploads per hour per business
 */
const mediaUploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 50,
  prefix: 'media',
  message: {
    success: false,
    error: 'Media upload limit reached. Please wait before uploading more files.'
  },
  keyGenerator: (req) => `media:${req.user?.businessId || req.ip}`
});

/**
 * Search rate limiter
 * 100 searches per minute per user
 */
const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  prefix: 'search',
  message: {
    success: false,
    error: 'Too many search requests. Please slow down.'
  },
  keyGenerator: (req) => `search:${req.user?._id || req.ip}`
});

/**
 * Public endpoint rate limiter
 * 10 requests per 15 minutes per IP
 */
const publicEndpointLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'public',
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.'
  }
});

/**
 * Get Redis connection status
 */
function getRedisStatus() {
  return {
    enabled: !!REDIS_ENABLED,
    connected: redisClient ? redisClient.isReady : false,
    client: redisClient ? 'active' : 'not-initialized'
  };
}

/**
 * Graceful shutdown - close Redis connection
 */
async function closeRedisConnection() {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error);
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
