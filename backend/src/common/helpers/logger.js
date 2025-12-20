const winston = require('winston');
const path = require('path');
const config = require('../../config/server.config');

/**
 * Production-Ready Logger with Multi-Business Support
 * 
 * Uses Winston for structured logging with different transports
 * based on environment (development vs production)
 * 
 * Log Levels: error, warn, info, http, verbose, debug, silly
 * Production: Only error and warn
 * Development: All levels
 * 
 * GDPR Compliant: Masks PII (phone numbers, emails, names) in logs
 * Multi-Business: Includes business context in logs
 * 
 * @module common/helpers/logger
 */

// Sensitive field patterns for PII detection
const SENSITIVE_FIELDS = ['phoneNumber', 'phone', 'from', 'to', 'email', 'name', 'contactName'];

// PII masking configuration
const PII_MASK_CONFIG = {
  PHONE_VISIBLE_CHARS: 4,
  PHONE_MASK_LENGTH: 6,
  NAME_MASK_LENGTH: 6,
  EMAIL_USERNAME_MASK_LENGTH: 3,
};

/**
 * Mask PII data for GDPR compliance
 * @param {string} value - The value to mask
 * @param {string} type - Type of PII (phone, email, name)
 * @returns {string} Masked value
 */
function maskPII(value, type = 'auto') {
  if (!value || typeof value !== 'string') {
    return value;
  }

  // Auto-detect type if not specified
  if (type === 'auto') {
    if (/^\+?\d{10,15}$/.test(value)) {
      type = 'phone';
    } else if (/@/.test(value)) {
      type = 'email';
    } else {
      type = 'name';
    }
  }

  switch (type) {
    case 'phone':
      // Show last 4 digits: +1234567890 -> +******7890
      if (value.length > PII_MASK_CONFIG.PHONE_VISIBLE_CHARS) {
        const visiblePart = value.slice(-PII_MASK_CONFIG.PHONE_VISIBLE_CHARS);
        const prefix = value.startsWith('+') ? '+' : '';
        const maskLength = Math.min(PII_MASK_CONFIG.PHONE_MASK_LENGTH, value.length - PII_MASK_CONFIG.PHONE_VISIBLE_CHARS);
        return `${prefix}${'*'.repeat(maskLength)}${visiblePart}`;
      }
      return '*'.repeat(value.length);

    case 'email':
      // Show first char and domain: user@example.com -> u***@example.com
      const parts = value.split('@');
      if (parts.length === 2) {
        const username = parts[0];
        const maskedUsername = username.length > 1 
          ? username[0] + '*'.repeat(Math.min(PII_MASK_CONFIG.EMAIL_USERNAME_MASK_LENGTH, username.length - 1))
          : '*';
        return `${maskedUsername}@${parts[1]}`;
      }
      return '*'.repeat(value.length);

    case 'name':
      // Show first and last char: John Doe -> J******e
      if (value.length > 2) {
        const maskLength = Math.min(PII_MASK_CONFIG.NAME_MASK_LENGTH, value.length - 2);
        return value[0] + '*'.repeat(maskLength) + value[value.length - 1];
      }
      return '*'.repeat(value.length);

    default:
      return value;
  }
}

/**
 * Recursively mask PII in objects
 * @param {*} obj - Object to scan for PII
 * @param {Array} sensitiveFields - Field names containing PII
 * @returns {*} Object with masked PII
 */
function maskPIIInObject(obj, sensitiveFields = SENSITIVE_FIELDS) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskPIIInObject(item, sensitiveFields));
  }

  const masked = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      // Determine type based on field name
      let type = 'auto';
      if (lowerKey.includes('phone') || lowerKey === 'from' || lowerKey === 'to') {
        type = 'phone';
      } else if (lowerKey.includes('email')) {
        type = 'email';
      } else if (lowerKey.includes('name')) {
        type = 'name';
      }
      
      masked[key] = typeof value === 'string' ? maskPII(value, type) : value;
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskPIIInObject(value, sensitiveFields);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

// Custom format to mask PII before logging
const maskPIIFormat = winston.format((info) => {
  // Mask PII in the entire log object
  const masked = maskPIIInObject(info);
  return masked;
})();

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  maskPIIFormat, // Apply PII masking
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (config.isProduction() ? 'error' : 'info'),
  format: logFormat,
  defaultMeta: { 
    service: 'whatsapp-marketing-api',
    environment: config.nodeEnv,
    multiBusinessEnabled: config.multiBusinessEnabled,
  },
  transports: [],
});

// Production transports: File logging
if (config.isProduction()) {
  const logDir = process.env.LOG_FILE_PATH || path.join(__dirname, '../logs');
  const maxFileSize = parseInt(process.env.LOG_MAX_FILE_SIZE) || 10485760; // Default 10MB
  const maxFiles = parseInt(process.env.LOG_MAX_FILES) || 10;
  
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: maxFileSize,
    maxFiles: Math.min(5, maxFiles),
    tailable: true
  }));
  
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    maxsize: maxFileSize,
    maxFiles: maxFiles,
    tailable: true
  }));
  
  if (process.env.ENABLE_CONSOLE_LOGGING === 'true') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple()
    }));
  }
} else {
  // Development: Console logging with colors
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Helper methods for common logging patterns

/**
 * Log API request
 */
logger.logRequest = (req, res, duration) => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  };

  // Add business context if available
  if (req.businessId) {
    logData.businessId = req.businessId;
  }

  // Add user context if available
  if (req.user?.id) {
    logData.userId = req.user.id;
  }

  logger.http('API Request', logData);
};

/**
 * Log business operation
 */
logger.logBusiness = (businessId, operation, details = {}) => {
  logger.info('Business Operation', {
    businessId,
    operation,
    ...details
  });
};

/**
 * Log WhatsApp API call
 */
logger.logWhatsAppAPI = (method, endpoint, status, details = {}) => {
  logger.info('WhatsApp API Call', {
    method,
    endpoint,
    status,
    ...details
  });
};

/**
 * Log webhook event
 */
logger.logWebhook = (phoneNumberId, eventType, details = {}) => {
  logger.info('Webhook Event', {
    phoneNumberId,
    eventType,
    ...details
  });
};

/**
 * Log authentication event
 */
logger.logAuth = (userId, action, success, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Authentication Event', {
    userId,
    action,
    success,
    ...details
  });
};

/**
 * Log campaign event
 */
logger.logCampaign = (campaignId, event, details = {}) => {
  logger.info('Campaign Event', {
    campaignId,
    event,
    ...details
  });
};

/**
 * Log automation event
 */
logger.logAutomation = (ruleId, event, details = {}) => {
  logger.info('Automation Event', {
    ruleId,
    event,
    ...details
  });
};

/**
 * Log database operation error
 */
logger.logDatabaseError = (operation, error, details = {}) => {
  logger.error('Database Error', {
    operation,
    error: error.message,
    stack: error.stack,
    ...details
  });
};

/**
 * Log security event (rate limiting, unauthorized access, etc.)
 */
logger.logSecurity = (eventType, details = {}) => {
  logger.warn('Security Event', {
    eventType,
    timestamp: new Date().toISOString(),
    ...details
  });
};

/**
 * Utility functions for manual PII masking
 * Export for use in other parts of the application
 */
logger.maskPII = maskPII;
logger.maskPIIInObject = maskPIIInObject;

// Export logger
module.exports = logger;
