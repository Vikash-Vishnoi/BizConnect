/**
 * Centralized Application Configuration
 * All environment variables and constants in one place
 * 
 * Usage:
 * const config = require('./config/constants');
 * const maxLimit = config.LIMITS.MAX_MESSAGE_LENGTH;
 */

// Load environment variables
require('dotenv').config();

const config = {
  // ========================================
  // Server Configuration
  // ========================================
  SERVER: {
    PORT: parseInt(process.env.PORT) || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  },

  // ========================================
  // Database Configuration
  // ========================================
  DATABASE: {
    MONGODB_URI: process.env.MONGODB_URI,
    MAX_POOL_SIZE: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
    MIN_POOL_SIZE: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,
    SERVER_SELECTION_TIMEOUT_MS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
    SOCKET_TIMEOUT_MS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
    CONNECT_TIMEOUT_MS: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
    MAX_IDLE_TIME_MS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,
  },

  // ========================================
  // Authentication & Security
  // ========================================
  AUTH: {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
    REFRESH_TOKEN_EXPIRE: process.env.REFRESH_TOKEN_EXPIRE || '7d',
    MIN_PASSWORD_LENGTH: parseInt(process.env.MIN_PASSWORD_LENGTH) || 6,
    MAX_PASSWORD_LENGTH: parseInt(process.env.MAX_PASSWORD_LENGTH) || 128,
    PASSWORD_REQUIRE_UPPERCASE: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
    PASSWORD_REQUIRE_LOWERCASE: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
    PASSWORD_REQUIRE_NUMBER: process.env.PASSWORD_REQUIRE_NUMBER === 'true',
    PASSWORD_REQUIRE_SPECIAL: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
  },

  // ========================================
  // Rate Limiting
  // ========================================
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    AUTH_WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    AUTH_MAX_REQUESTS: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,
    PASSWORD_RESET_WINDOW_MS: parseInt(process.env.PASSWORD_RESET_WINDOW_MS) || 60 * 60 * 1000,
    PASSWORD_RESET_MAX_REQUESTS: parseInt(process.env.PASSWORD_RESET_MAX_REQUESTS) || 3,
  },

  // ========================================
  // Message & Content Limits
  // ========================================
  LIMITS: {
    MAX_MESSAGE_LENGTH: parseInt(process.env.MAX_MESSAGE_LENGTH) || 4096,
    MAX_TEMPLATE_NAME_LENGTH: parseInt(process.env.MAX_TEMPLATE_NAME_LENGTH) || 512,
    MAX_CAMPAIGN_RECIPIENTS: parseInt(process.env.MAX_CAMPAIGN_RECIPIENTS) || 10000,
    MAX_NAME_LENGTH: parseInt(process.env.MAX_NAME_LENGTH) || 100,
    MAX_DESCRIPTION_LENGTH: parseInt(process.env.MAX_DESCRIPTION_LENGTH) || 1000,
    MAX_BULK_CONTACTS: parseInt(process.env.MAX_BULK_CONTACTS) || 1000,
    MAX_SEND_RATE: parseInt(process.env.MAX_SEND_RATE) || 80,
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    MAX_REQUEST_SIZE: process.env.MAX_REQUEST_SIZE || '10mb',
  },

  // ========================================
  // Pagination Defaults
  // ========================================
  PAGINATION: {
    // Conversations
    CONVERSATIONS_DEFAULT_LIMIT: parseInt(process.env.CONVERSATIONS_DEFAULT_LIMIT) || 20,
    CONVERSATIONS_MAX_LIMIT: parseInt(process.env.CONVERSATIONS_MAX_LIMIT) || 100,
    
    // Campaigns
    CAMPAIGNS_DEFAULT_LIMIT: parseInt(process.env.CAMPAIGNS_DEFAULT_LIMIT) || 20,
    CAMPAIGNS_MAX_LIMIT: parseInt(process.env.CAMPAIGNS_MAX_LIMIT) || 100,
    
    // Templates
    TEMPLATES_DEFAULT_LIMIT: parseInt(process.env.TEMPLATES_DEFAULT_LIMIT) || 20,
    TEMPLATES_MAX_LIMIT: parseInt(process.env.TEMPLATES_MAX_LIMIT) || 100,
    
    // Contacts
    CONTACTS_DEFAULT_LIMIT: parseInt(process.env.CONTACTS_DEFAULT_LIMIT) || 50,
    CONTACTS_MAX_LIMIT: parseInt(process.env.CONTACTS_MAX_LIMIT) || 500,
    
    // Search
    SEARCH_MESSAGES_DEFAULT_LIMIT: parseInt(process.env.SEARCH_MESSAGES_DEFAULT_LIMIT) || 50,
    SEARCH_MESSAGES_MAX_LIMIT: parseInt(process.env.SEARCH_MESSAGES_MAX_LIMIT) || 200,
    SEARCH_CONVERSATIONS_DEFAULT_LIMIT: parseInt(process.env.SEARCH_CONVERSATIONS_DEFAULT_LIMIT) || 50,
    SEARCH_CONVERSATIONS_MAX_LIMIT: parseInt(process.env.SEARCH_CONVERSATIONS_MAX_LIMIT) || 100,
    SEARCH_COMBINED_DEFAULT_LIMIT: parseInt(process.env.SEARCH_COMBINED_DEFAULT_LIMIT) || 20,
    SEARCH_COMBINED_MAX_LIMIT: parseInt(process.env.SEARCH_COMBINED_MAX_LIMIT) || 50,
    
    // Scheduled Messages
    SCHEDULED_MESSAGES_DEFAULT_LIMIT: parseInt(process.env.SCHEDULED_MESSAGES_DEFAULT_LIMIT) || 20,
    SCHEDULED_MESSAGES_MAX_LIMIT: parseInt(process.env.SCHEDULED_MESSAGES_MAX_LIMIT) || 100,
    
    // Rate Limits
    RATE_LIMITS_DEFAULT_LIMIT: parseInt(process.env.RATE_LIMITS_DEFAULT_LIMIT) || 50,
    RATE_LIMITS_ADMIN_LIMIT: parseInt(process.env.RATE_LIMITS_ADMIN_LIMIT) || 500,
  },

  // ========================================
  // WhatsApp Business API
  // ========================================
  WHATSAPP: {
    API_URL: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
    API_VERSION: process.env.WHATSAPP_API_VERSION || 'v18.0',
    // Note: Per-business credentials stored in Business model
    PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID, // Fallback for development
    ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN, // Fallback for development
    BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID, // Fallback for development
    VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    APP_SECRET: process.env.WHATSAPP_APP_SECRET,
  },

  // ========================================
  // File Upload Configuration
  // ========================================
  UPLOAD: {
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/3gpp'],
    ALLOWED_AUDIO_TYPES: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/vnd.ms-powerpoint', 'application/msword', 
                             'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                             'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'],
  },

  // ========================================
  // Frontend Configuration
  // ========================================
  FRONTEND: {
    URL: process.env.FRONTEND_URL || 'http://localhost:8081',
    CORS_ORIGIN: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*',
  },

  // ========================================
  // Socket.IO Configuration
  // ========================================
  SOCKET: {
    CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || '*',
    PING_TIMEOUT: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    PING_INTERVAL: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
  },

  // ========================================
  // Campaign Settings
  // ========================================
  CAMPAIGN: {
    DEFAULT_SEND_RATE: parseInt(process.env.CAMPAIGN_DEFAULT_SEND_RATE) || 70,
    MIN_SEND_RATE: parseInt(process.env.CAMPAIGN_MIN_SEND_RATE) || 1,
    MAX_SEND_RATE: parseInt(process.env.CAMPAIGN_MAX_SEND_RATE) || 80,
    MAX_RETRIES: parseInt(process.env.CAMPAIGN_MAX_RETRIES) || 3,
    RETRY_DELAY_MS: parseInt(process.env.CAMPAIGN_RETRY_DELAY_MS) || 60000,
  },

  // ========================================
  // Business Settings
  // ========================================
  BUSINESS: {
    MESSAGING_LIMIT_WARNING_THRESHOLD: parseFloat(process.env.MESSAGING_LIMIT_WARNING_THRESHOLD) || 0.8,
    QUALITY_RATING_MINIMUM: process.env.QUALITY_RATING_MINIMUM || 'MEDIUM',
  },

  // ========================================
  // Logging Configuration
  // ========================================
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    MAX_FILES: parseInt(process.env.LOG_MAX_FILES) || 14,
    MAX_SIZE: process.env.LOG_MAX_SIZE || '20m',
    LOG_DIR: process.env.LOG_DIR || './logs',
  },

  // ========================================
  // Background Jobs Configuration
  // ========================================
  JOBS: {
    SCHEDULED_MESSAGE_INTERVAL_MS: parseInt(process.env.SCHEDULED_MESSAGE_INTERVAL_MS) || 60000, // 1 minute
    SCHEDULED_CAMPAIGN_INTERVAL_MS: parseInt(process.env.SCHEDULED_CAMPAIGN_INTERVAL_MS) || 60000,
    QUALITY_RATING_INTERVAL_HOURS: parseInt(process.env.QUALITY_RATING_INTERVAL_HOURS) || 6,
    TEMPLATE_SYNC_INTERVAL_HOURS: parseInt(process.env.TEMPLATE_SYNC_INTERVAL_HOURS) || 24,
    ANALYTICS_ARCHIVAL_CRON: process.env.ANALYTICS_ARCHIVAL_CRON || '0 2 * * *', // 2 AM daily
    LOG_CLEANUP_CRON: process.env.LOG_CLEANUP_CRON || '0 3 * * 0', // 3 AM Sunday
  },
};

// Validate critical configuration
function validateConfig() {
  const criticalVars = [
    { key: 'DATABASE.MONGODB_URI', value: config.DATABASE.MONGODB_URI, name: 'MONGODB_URI' },
    { key: 'AUTH.JWT_SECRET', value: config.AUTH.JWT_SECRET, name: 'JWT_SECRET' },
  ];

  const missing = criticalVars.filter(v => !v.value);
  
  if (missing.length > 0) {
    const missingNames = missing.map(v => v.name).join(', ');
    throw new Error(`Missing critical configuration: ${missingNames}`);
  }
}

// Auto-validate on import
try {
  validateConfig();
} catch (error) {
  logger.error('Configuration validation failed', { error: error.message });
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

module.exports = config;
