/**
 * Request Logging Middleware
 * Logs all API requests with timing, user info, and error tracking
 */

const logger = require('../../utils/helpers/logger');
const { v4: uuidv4 } = require('uuid');

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

  // Log incoming request (debug level)
  logger.debug('Incoming Request', {
    ...requestInfo,
    headers: process.env.LOG_HEADERS === 'true' ? req.headers : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: shouldLogBody(req) ? sanitizeBody(req.body) : undefined
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
      success: statusCode < 400
    };

    // Determine log level based on status code
    let logLevel = 'info';
    let logMessage = 'Request Completed';

    if (statusCode >= 500) {
      logLevel = 'error';
      logMessage = 'Request Failed (Server Error)';
      // Include response body for errors in development
      if (process.env.NODE_ENV !== 'production' && res.responseBody) {
        logData.response = res.responseBody;
      }
    } else if (statusCode >= 400) {
      logLevel = 'warn';
      logMessage = 'Request Failed (Client Error)';
      // Include error details
      if (res.responseBody && res.responseBody.error) {
        logData.errorCode = res.responseBody.error.code;
        logData.errorMessage = res.responseBody.error.message;
      }
    } else if (statusCode >= 300) {
      logMessage = 'Request Redirected';
    }

    // Add performance warning for slow requests (> 3 seconds)
    if (duration > 3000) {
      logLevel = 'warn';
      logMessage += ' (SLOW)';
      logData.performanceWarning = true;
    }

    // Log the request result
    logger[logLevel](logMessage, logData);

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
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'accessToken'];

  // Remove or mask sensitive fields
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
};

/**
 * Determine if request should be logged to audit trail
 * Audit trail for sensitive operations
 */
const shouldAudit = (req) => {
  const auditPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/business/credentials',
    '/api/campaigns',
    '/api/templates',
    '/api/automations',
    '/api/bulk'
  ];

  // Check if path matches audit patterns
  return auditPaths.some(path => req.path.startsWith(path)) && 
         ['POST', 'PUT', 'DELETE'].includes(req.method);
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
