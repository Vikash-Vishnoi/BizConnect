/**
 * Request Logging Middleware
 * Logs all API requests with timing, user info, and error tracking
 * 
 * FEATURES:
 * - Unique request ID generation for tracing
 * - Request/response timing with duration metrics
 * - PII-safe logging (sanitizes sensitive data)
 * - Performance monitoring integration
 * - Error tracking and categorization
 * 
 * MIDDLEWARE ORDER:
 * Should be applied early in middleware chain:
 * 1. helmet() - Security headers
 * 2. cors() - CORS configuration
 * 3. express.json() - Body parsing
 * 4. requestLogger ← HERE
 * 5. performanceMonitor
 * 6. rateLimiter
 * 7. auditLogger
 * 
 * USAGE:
 * - Automatically logs all requests
 * - req.requestId available for correlation
 * - Duration tracked automatically
 * - Integrates with logger.js for PII masking
 */

const logger = require('../../common/helpers/logger');
const { v4: uuidv4 } = require('uuid');
const { deepSanitize } = require('../../common/helpers/sanitizer');
const { HTTP_STATUS, ERROR_CODES } = require('../../common/constants');

// ============================================
// CONSTANTS
// ============================================

// Log levels
const LOG_LEVEL = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
};

// Emojis for different response types
const LOG_EMOJI = {
  SUCCESS: '✅',
  REDIRECT: '↪️ ',
  CLIENT_ERROR: '⚠️ ',
  SERVER_ERROR: '❌',
  SLOW_REQUEST: '🐌',
  INCOMING: '➡️ ',
};

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLD = {
  SLOW_REQUEST: 3000,
  SLOWER_THAN_ONE_SECOND: 1000,
};

// Request body size limits (in bytes)
const MAX_BODY_LOG_SIZE = 10240; // 10KB

// Audit paths - sensitive operations that require audit logging
const AUDIT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/business/credentials',
  '/api/business/phone',
  '/api/campaigns',
  '/api/templates',
  '/api/automations',
  '/api/bulk',
  '/api/contacts/import',
  '/api/contacts/bulk',
];

// HTTP methods that require auditing
const AUDIT_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Sensitive paths that should not have body logged
const SENSITIVE_PATHS = ['/login', '/register', '/password'];

// Status code ranges
const STATUS_CODE_RANGE = {
  SUCCESS_MIN: 200,
  SUCCESS_MAX: 299,
  REDIRECT_MIN: 300,
  REDIRECT_MAX: 399,
  CLIENT_ERROR_MIN: 400,
  CLIENT_ERROR_MAX: 499,
  SERVER_ERROR_MIN: 500,
};

// Hourly statistics reset interval (in milliseconds)
const HOURLY_RESET_INTERVAL = 60 * 60 * 1000; // 1 hour

/**
 * Request logger middleware
 * Logs incoming requests and their responses with timing information
 */ 
const requestLogger = (req, res, next) => {
  const processingStartTime = Date.now();

  try {
    // Generate unique request ID
    const requestId = uuidv4();
    req.requestId = requestId;

    // Store request start time
    const startTime = Date.now();

    // Extract relevant request information
    const requestInfo = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      contentType: req.get('content-type'),
      userId: req.user?._id?.toString(),
      businessId: req.user?.businessId?.toString() || req.businessId?.toString(),
      userType: req.user?.userType
    };

    // Log incoming request
    const logLevel = process.env.NODE_ENV === 'development' ? LOG_LEVEL.INFO : LOG_LEVEL.DEBUG;
    logger[logLevel](`${LOG_EMOJI.INCOMING} ${req.method} ${req.path}`, {
      ...requestInfo,
      headers: process.env.LOG_HEADERS === 'true' ? req.headers : undefined,
      query: Object.keys(req.query).length > 0 ? deepSanitize(req.query) : undefined,
      body: shouldLogBody(req) ? deepSanitize(req.body) : undefined
    });

    // Capture the original res.json to intercept responses
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override res.json
    res.json = function(data) {
      res.responseBody = data;
      return originalJson(data);
    };

    // Override res.send
    res.send = function(data) {
      res.responseBody = data;
      return originalSend(data);
    };

    // Log response when finished
    res.on('finish', () => {
      try {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        const logData = {
          ...requestInfo,
          statusCode,
          duration: `${duration}ms`,
          durationNum: duration,
          success: statusCode < STATUS_CODE_RANGE.CLIENT_ERROR_MIN,
          contentLength: res.get('content-length')
        };

        // Determine log level based on status code
        let logLevel = LOG_LEVEL.INFO;
        let emoji = LOG_EMOJI.SUCCESS;
        let logMessage = 'Request Completed';

        if (statusCode >= STATUS_CODE_RANGE.SERVER_ERROR_MIN) {
          logLevel = LOG_LEVEL.ERROR;
          emoji = LOG_EMOJI.SERVER_ERROR;
          logMessage = 'Server Error';
          // Include response body for errors
          if (res.responseBody) {
            logData.response = deepSanitize(res.responseBody);
          }
        } else if (statusCode >= STATUS_CODE_RANGE.CLIENT_ERROR_MIN) {
          logLevel = LOG_LEVEL.WARN;
          emoji = LOG_EMOJI.CLIENT_ERROR;
          logMessage = 'Client Error';
          // Include error details
          if (res.responseBody) {
            if (res.responseBody.error) {
              logData.errorCode = res.responseBody.error.code;
              logData.errorMessage = res.responseBody.error.message;
            } else if (typeof res.responseBody === 'string') {
              logData.errorMessage = res.responseBody;
            }
          }
        } else if (statusCode >= STATUS_CODE_RANGE.REDIRECT_MIN) {
          emoji = LOG_EMOJI.REDIRECT;
          logMessage = 'Redirect';
        } else if (statusCode >= STATUS_CODE_RANGE.SUCCESS_MIN) {
          emoji = LOG_EMOJI.SUCCESS;
          logMessage = 'Success';
        }

        // Add performance warning for slow requests
        if (duration > PERFORMANCE_THRESHOLD.SLOW_REQUEST) {
          logLevel = LOG_LEVEL.WARN;
          emoji = LOG_EMOJI.SLOW_REQUEST;
          logMessage += ' (SLOW)';
          logData.performanceWarning = true;
        } else if (duration > PERFORMANCE_THRESHOLD.SLOWER_THAN_ONE_SECOND) {
          logData.performanceNote = 'slower_than_1s';
        }

        // Log the request result with emoji
        logger[logLevel](`${emoji} ${req.method} ${req.path} ${statusCode} ${duration}ms`, logData);

        // Log to separate audit trail for specific endpoints
        if (shouldAudit(req)) {
          logger.info('Audit Trail', {
            requestId,
            userId: requestInfo.userId?.toString(),
            businessId: requestInfo.businessId?.toString(),
            action: `${req.method} ${req.path}`,
            statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error('Error logging response', {
          requestId: req.requestId,
          error: error.message,
          stack: error.stack
        });
      }
    });

    // Handle errors
    res.on('error', (error) => {
      try {
        const duration = Date.now() - startTime;
        
        logger.error('Request Error', {
          ...requestInfo,
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack
        });
      } catch (logError) {
        logger.error('Error logging request error', {
          requestId: req.requestId,
          error: logError.message
        });
      }
    });

    const processingTime = Date.now() - processingStartTime;
    logger.debug('Request logger processing completed', {
      requestId,
      processingTime: `${processingTime}ms`
    });

    next();
  } catch (error) {
    logger.error('Error in requestLogger middleware', {
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
    next(error);
  }
};

/**
 * Determine if request body should be logged
 * Skip logging for sensitive endpoints or large payloads
 */
const shouldLogBody = (req) => {
  try {
    // Never log authentication credentials or sensitive paths
    const hasSensitivePath = SENSITIVE_PATHS.some(path => req.path.includes(path));
    if (hasSensitivePath) {
      return false;
    }

    // Skip if body is too large
    if (req.body) {
      const bodySize = JSON.stringify(req.body).length;
      if (bodySize > MAX_BODY_LOG_SIZE) {
        return false;
      }
    }

    // Only log in development or if explicitly enabled
    return process.env.NODE_ENV === 'development' || process.env.LOG_REQUEST_BODY === 'true';
  } catch (error) {
    // If JSON.stringify fails, don't log body
    logger.debug('Error checking body log eligibility', {
      error: error.message
    });
    return false;
  }
};

/**
 * Sanitize request body to remove sensitive information
 * Note: Now using deepSanitize from sanitizer.js for better coverage
 */
const sanitizeBody = (body) => {
  return deepSanitize(body);
};

/**
 * Determine if request should be logged to audit trail
 * Audit trail for sensitive operations
 */
const shouldAudit = (req) => {
  try {
    // Check if path matches audit patterns
    return AUDIT_PATHS.some(path => req.path.startsWith(path)) && 
           AUDIT_METHODS.includes(req.method);
  } catch (error) {
    logger.debug('Error checking audit eligibility', {
      error: error.message
    });
    return false;
  }
};

/**
 * Error tracking middleware
 * Specifically logs errors with detailed context
 */
const errorLogger = (err, req, res, next) => {
  const processingStartTime = Date.now();

  try {
    logger.error('Unhandled Error', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      userId: req.user?._id?.toString(),
      businessId: req.user?.businessId?.toString() || req.businessId?.toString(),
      error: err.message,
      errorCode: err.code || ERROR_CODES.INTERNAL_ERROR,
      statusCode: err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    const processingTime = Date.now() - processingStartTime;
    logger.debug('Error logger processing completed', {
      requestId: req.requestId,
      processingTime: `${processingTime}ms`
    });
  } catch (logError) {
    logger.error('Error in errorLogger middleware', {
      error: logError.message,
      originalError: err.message
    });
  }

  // Pass to next error handler
  next(err);
};

/**
 * Performance monitoring middleware
 * Tracks slow routes and database queries
 */
const performanceMonitor = (req, res, next) => {
  const processingStartTime = Date.now();

  try {
    const startTime = Date.now();

    // Track database query count (if mongoose debug is enabled)
    let queryCount = 0;
    const originalQuery = req.db?.query;
    if (originalQuery) {
      req.db.query = function(...args) {
        queryCount++;
        return originalQuery.apply(this, args);
      };
    }

    res.on('finish', () => {
      try {
        const duration = Date.now() - startTime;

        // Log performance metrics for slow requests
        if (duration > PERFORMANCE_THRESHOLD.SLOWER_THAN_ONE_SECOND) {
          logger.warn('Slow Request Detected', {
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            userId: req.user?._id?.toString(),
            businessId: req.user?.businessId?.toString() || req.businessId?.toString(),
            duration: `${duration}ms`,
            queryCount: queryCount > 0 ? queryCount : undefined,
            performanceIssue: true
          });
        }
      } catch (error) {
        logger.error('Error in performance monitor finish handler', {
          requestId: req.requestId,
          error: error.message
        });
      }
    });

    const processingTime = Date.now() - processingStartTime;
    logger.debug('Performance monitor processing completed', {
      requestId: req.requestId,
      processingTime: `${processingTime}ms`
    });

    next();
  } catch (error) {
    logger.error('Error in performanceMonitor middleware', {
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
    next(error);
  }
};

/**
 * Request counter for metrics
 * Tracks request volume by endpoint and method
 */
const requestCounter = (() => {
  const counts = new Map();
  let lastReset = Date.now();

  // Reset counters every hour
  setInterval(() => {
    try {
      const hourlyStats = Array.from(counts.entries()).map(([key, count]) => ({
        endpoint: key,
        count
      }));

      if (hourlyStats.length > 0) {
        logger.info('Hourly Request Statistics', {
          stats: hourlyStats,
          period: 'last_hour',
          timestamp: new Date().toISOString()
        });
      }

      counts.clear();
      lastReset = Date.now();
    } catch (error) {
      logger.error('Error resetting hourly request statistics', {
        error: error.message
      });
    }
  }, HOURLY_RESET_INTERVAL);

  return (req, res, next) => {
    try {
      const key = `${req.method} ${req.path}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      next();
    } catch (error) {
      logger.error('Error in requestCounter middleware', {
        error: error.message,
        errorCode: ERROR_CODES.INTERNAL_ERROR
      });
      next(error);
    }
  };
})();

module.exports = {
  requestLogger,
  errorLogger,
  performanceMonitor,
  requestCounter
};
