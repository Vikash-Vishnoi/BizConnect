/**
 * Request Logging Middleware
 * Logs all API requests with timing, user info, and error tracking
 */

const logger = require('../../common/helpers/logger');
const { v4: uuidv4 } = require('uuid');
const { deepSanitize } = require('../../common/helpers/sanitizer');

/**
 * Request logger middleware
 * Logs incoming requests and their responses with timing information
 */ 
const requestLogger = (req, res, next) => {
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
  const logLevel = process.env.NODE_ENV === 'development' ? 'info' : 'debug';
  logger[logLevel](`➡️  ${req.method} ${req.path}`, {
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
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    const logData = {
      ...requestInfo,
      statusCode,
      duration: `${duration}ms`,
      durationNum: duration,
      success: statusCode < 400,
      contentLength: res.get('content-length')
    };

    // Determine log level based on status code
    let logLevel = 'info';
    let emoji = '✅';
    let logMessage = 'Request Completed';

    if (statusCode >= 500) {
      logLevel = 'error';
      emoji = '❌';
      logMessage = 'Server Error';
      // Include response body for errors
      if (res.responseBody) {
        logData.response = deepSanitize(res.responseBody);
      }
    } else if (statusCode >= 400) {
      logLevel = 'warn';
      emoji = '⚠️ ';
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
    } else if (statusCode >= 300) {
      emoji = '↪️ ';
      logMessage = 'Redirect';
    } else if (statusCode >= 200) {
      emoji = '✅';
      logMessage = 'Success';
    }

    // Add performance warning for slow requests
    if (duration > 3000) {
      logLevel = 'warn';
      emoji = '🐌';
      logMessage += ' (SLOW)';
      logData.performanceWarning = true;
    } else if (duration > 1000) {
      logData.performanceNote = 'slower_than_1s';
    }

    // Log the request result with emoji
    logger[logLevel](`${emoji} ${req.method} ${req.path} ${statusCode} ${duration}ms`, logData);

    // Log to separate audit trail for specific endpoints
    if (shouldAudit(req)) {
      logger.info('Audit Trail', {
        requestId,
        userId: requestInfo.userId,
        businessId: requestInfo.businessId,
        action: `${req.method} ${req.path}`,
        statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle errors
  res.on('error', (error) => {
    const duration = Date.now() - startTime;
    
    logger.error('Request Error', {
      ...requestInfo,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack
    });
  });

  next();
};

/**
 * Determine if request body should be logged
 * Skip logging for sensitive endpoints or large payloads
 */
const shouldLogBody = (req) => {
  // Never log authentication credentials
  if (req.path.includes('/login') || req.path.includes('/register')) {
    return false;
  }

  // Skip if body is too large (> 10KB)
  try {
    const bodySize = req.body ? JSON.stringify(req.body).length : 0;
    if (bodySize > 10240) {
      return false;
    }
  } catch (error) {
    // If JSON.stringify fails, don't log body
    return false;
  }

  // Only log in development or if explicitly enabled
  return process.env.NODE_ENV === 'development' || process.env.LOG_REQUEST_BODY === 'true';
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
  const auditPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/business/credentials',
    '/api/v1/business/phone',
    '/api/v1/campaigns',
    '/api/v1/templates',
    '/api/v1/automations',
    '/api/v1/bulk',
    '/api/v1/contacts/import',
    '/api/v1/contacts/bulk',
    // Legacy paths
    '/api/auth/login',
    '/api/auth/register'
  ];

  // Check if path matches audit patterns
  return auditPaths.some(path => req.path.startsWith(path)) && 
         ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
};

/**
 * Error tracking middleware
 * Specifically logs errors with detailed context
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled Error', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    userId: req.user?._id?.toString(),
    businessId: req.user?.businessId?.toString() || req.businessId?.toString(),
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  // Pass to next error handler
  next(err);
};

/**
 * Performance monitoring middleware
 * Tracks slow routes and database queries
 */
const performanceMonitor = (req, res, next) => {
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
    const duration = Date.now() - startTime;

    // Log performance metrics for slow requests
    if (duration > 1000) { // > 1 second
      logger.warn('Slow Request Detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        duration: `${duration}ms`,
        queryCount: queryCount > 0 ? queryCount : undefined,
        performanceIssue: true
      });
    }
  });

  next();
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
    const hourlyStats = Array.from(counts.entries()).map(([key, count]) => ({
      endpoint: key,
      count
    }));

    if (hourlyStats.length > 0) {
      logger.info('Hourly Request Statistics', {
        stats: hourlyStats,
        period: 'last_hour'
      });
    }

    counts.clear();
    lastReset = Date.now();
  }, 60 * 60 * 1000); // Every hour

  return (req, res, next) => {
    const key = `${req.method} ${req.path}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    next();
  };
})();

module.exports = {
  requestLogger,
  errorLogger,
  performanceMonitor,
  requestCounter
};
