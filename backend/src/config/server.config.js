/**
 * Server Configuration
 * Centralized server configuration loaded from environment variables
 * All configuration should be loaded from .env file
 */

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // URLs
  frontendUrl: process.env.WEB_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3001',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  
  // API
  apiPrefix: process.env.API_PREFIX || '/api',
  apiVersion: process.env.API_VERSION || 'v1',
  
  // Multi-Business Configuration
  multiBusinessEnabled: process.env.ENABLE_MULTI_BUSINESS === 'true',
  maxBusinessesPerUser: parseInt(process.env.MAX_BUSINESSES_PER_USER, 10) || 5,
  businessContextStrategy: process.env.BUSINESS_CONTEXT_STRATEGY || 'header',
  businessIdHeader: process.env.BUSINESS_ID_HEADER || 'x-business-id',
  
  // Socket.io
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || '*',
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-business',
    uriTest: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/whatsapp-business-test',
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 10,
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE, 10) || 2,
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT, 10) || 5000,
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT, 10) || 45000,
    connectTimeoutMS: 10000,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
  },
  
  // Database Connection Retry
  dbRetry: {
    maxRetries: 5,
    retryDelayMs: 5000,
  },
  
  // Timeouts
  handlerTimeout: parseInt(process.env.HANDLER_TIMEOUT, 10) || 30000,
  webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT, 10) || 30000,
  
  // Validation Limits
  validation: {
    maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH, 10) || 4096,
    maxTemplateNameLength: parseInt(process.env.MAX_TEMPLATE_NAME_LENGTH, 10) || 512,
    maxCampaignRecipients: parseInt(process.env.MAX_CAMPAIGN_RECIPIENTS, 10) || 10000,
    maxBulkContacts: parseInt(process.env.MAX_BULK_CONTACTS, 10) || 1000,
    maxBulkOperations: parseInt(process.env.MAX_BULK_OPERATIONS, 10) || 100,
    maxTagsPerOperation: parseInt(process.env.MAX_TAGS_PER_OPERATION, 10) || 10,
    minPasswordLength: parseInt(process.env.MIN_PASSWORD_LENGTH, 10) || 6,
    maxNameLength: parseInt(process.env.MAX_NAME_LENGTH, 10) || 100,
    maxDescriptionLength: parseInt(process.env.MAX_DESCRIPTION_LENGTH, 10) || 1000,
  },
  
  // Cron Jobs
  cronJobs: {
    enabled: process.env.ENABLE_CRON_JOBS === 'true',
    qualityCheckInterval: process.env.QUALITY_CHECK_INTERVAL || '0 */6 * * *',
    templateSyncInterval: process.env.TEMPLATE_SYNC_INTERVAL || '*/15 * * * *',
    logCleanupInterval: process.env.LOG_CLEANUP_INTERVAL || '0 2 * * *',
    analyticsArchiveInterval: process.env.ANALYTICS_ARCHIVE_INTERVAL || '0 3 * * *',
  },
  
  // Development helpers
  isDevelopment: () => config.nodeEnv === 'development',
  isProduction: () => config.nodeEnv === 'production',
  isTest: () => config.nodeEnv === 'test',
};

module.exports = config;
