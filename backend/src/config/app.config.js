/**
 * Application Configuration
 * Centralized configuration management for the entire application
 * All configuration values should be defined here with proper defaults
 * 
 * @module config/app.config
 */

const config = {
  // Application metadata
  app: {
    name: process.env.APP_NAME || 'whatsapp-marketing-backend',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
  },

  // Server configuration
  server: {
    host: process.env.HOST || '0.0.0.0',
    bodyLimit: process.env.BODY_LIMIT || '10mb',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || '*',
  },

  // Frontend URL
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // Backend URL
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:5000',
  },

  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-business',
    uriTest: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/whatsapp-business-test',
    options: {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE, 10) || 10,
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE, 10) || 2,
      serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT, 10) || 5000,
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT, 10) || 45000,
      connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 10000,
      maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME, 10) || 30000,
      retryWrites: true,
      retryReads: true,
    },
    retryConnection: {
      maxRetries: parseInt(process.env.DB_MAX_RETRIES, 10) || 5,
      retryDelayMs: parseInt(process.env.DB_RETRY_DELAY_MS, 10) || 5000,
    },
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    enabled: process.env.REDIS_ENABLED === 'true',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTokenExpiry: process.env.JWT_EXPIRE || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRE || '7d',
    refreshTokenExpiryDays: parseInt(process.env.JWT_REFRESH_EXPIRE_DAYS, 10) || 7,
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
    skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true',
  },

  // Timeout configuration
  timeouts: {
    handler: parseInt(process.env.HANDLER_TIMEOUT, 10) || 30000,
    webhook: parseInt(process.env.WEBHOOK_TIMEOUT, 10) || 30000,
    request: parseInt(process.env.REQUEST_TIMEOUT, 10) || 30000,
  },

  // Validation limits
  validation: {
    maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH, 10) || 4096,
    maxCaptionLength: parseInt(process.env.MAX_CAPTION_LENGTH, 10) || 1024,
    maxNameLength: parseInt(process.env.MAX_NAME_LENGTH, 10) || 100,
    maxTemplateNameLength: parseInt(process.env.MAX_TEMPLATE_NAME_LENGTH, 10) || 512,
    maxCampaignRecipients: parseInt(process.env.MAX_CAMPAIGN_RECIPIENTS, 10) || 10000,
    maxBulkContacts: parseInt(process.env.MAX_BULK_CONTACTS, 10) || 1000,
    maxBulkOperations: parseInt(process.env.MAX_BULK_OPERATIONS, 10) || 100,
    maxTagsPerOperation: parseInt(process.env.MAX_TAGS_PER_OPERATION, 10) || 10,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 16 * 1024 * 1024, // 16MB
    maxFilesPerUpload: parseInt(process.env.MAX_FILES_PER_UPLOAD, 10) || 10,
  },

  // WhatsApp API configuration
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
    apiBaseUrl: process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.LOG_FORMAT || 'json',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    logDirectory: process.env.LOG_DIR || 'logs',
    maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 hours
  },

  // File upload configuration
  upload: {
    directory: process.env.UPLOAD_DIR || 'uploads',
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/gif,application/pdf,video/mp4').split(','),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 16 * 1024 * 1024,
  },

  // Health check configuration
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
    endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
    includeDetails: process.env.HEALTH_CHECK_INCLUDE_DETAILS !== 'false',
  },

  // Job scheduling configuration
  jobs: {
    enableScheduledMessages: process.env.ENABLE_SCHEDULED_MESSAGES !== 'false',
    enableScheduledCampaigns: process.env.ENABLE_SCHEDULED_CAMPAIGNS !== 'false',
    enableQualityRatingTracker: process.env.ENABLE_QUALITY_RATING_TRACKER !== 'false',
    enableTemplateSync: process.env.ENABLE_TEMPLATE_SYNC !== 'false',
    enableAnalyticsArchival: process.env.ENABLE_ANALYTICS_ARCHIVAL !== 'false',
    enableLogCleanup: process.env.ENABLE_LOG_CLEANUP !== 'false',
    scheduledMessageInterval: process.env.SCHEDULED_MESSAGE_INTERVAL || '*/1 * * * *', // Every minute
    scheduledCampaignInterval: process.env.SCHEDULED_CAMPAIGN_INTERVAL || '*/1 * * * *',
    qualityRatingInterval: process.env.QUALITY_RATING_INTERVAL || '0 */6 * * *', // Every 6 hours
    templateSyncInterval: process.env.TEMPLATE_SYNC_INTERVAL || '0 */4 * * *', // Every 4 hours
    analyticsArchivalInterval: process.env.ANALYTICS_ARCHIVAL_INTERVAL || '0 0 * * *', // Daily at midnight
    logCleanupInterval: process.env.LOG_CLEANUP_INTERVAL || '0 2 * * *', // Daily at 2 AM
  },

  // Security headers
  security: {
    helmet: {
      contentSecurityPolicy: process.env.CSP_ENABLED !== 'false',
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    },
    trustProxy: process.env.TRUST_PROXY === 'true',
    allowedIPs: process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [],
  },

  // Feature flags
  features: {
    enableWebhooks: process.env.ENABLE_WEBHOOKS !== 'false',
    enableAutomations: process.env.ENABLE_AUTOMATIONS !== 'false',
    enableCampaigns: process.env.ENABLE_CAMPAIGNS !== 'false',
    enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
    enableTemplates: process.env.ENABLE_TEMPLATES !== 'false',
  },

  // Cache configuration
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL, 10) || 3600, // 1 hour
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD, 10) || 600, // 10 minutes
  },

  // Pagination defaults
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT, 10) || 20,
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT, 10) || 100,
  },

  // Development/Debug settings
  debug: {
    enableDebugMode: process.env.DEBUG_MODE === 'true',
    enableSqlLogging: process.env.SQL_LOGGING === 'true',
    enablePerformanceMonitoring: process.env.PERFORMANCE_MONITORING !== 'false',
    enableErrorStackTrace: process.env.NODE_ENV !== 'production',
  },
};

/**
 * Get a configuration value by dot-notation path
 * @param {string} path - Dot-notation path (e.g., 'database.uri')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Configuration value
 */
function get(path, defaultValue = null) {
  const keys = path.split('.');
  let value = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }

  return value;
}

/**
 * Check if application is in production mode
 * @returns {boolean}
 */
function isProduction() {
  return config.app.environment === 'production';
}

/**
 * Check if application is in development mode
 * @returns {boolean}
 */
function isDevelopment() {
  return config.app.environment === 'development';
}

/**
 * Check if application is in test mode
 * @returns {boolean}
 */
function isTest() {
  return config.app.environment === 'test';
}

module.exports = {
  ...config,
  get,
  isProduction,
  isDevelopment,
  isTest,
};
