/**
 * Handler Timeout Middleware
 * Prevents handlers from running indefinitely and causing memory leaks
 * Phase 28: Refactored with constants, structured logging, and performance tracking
 * @module middleware/handlerTimeout
 */

const logger = require('../../common/helpers/logger');
const { HTTP_STATUS } = require('../../common/constants/app.constants');

// ========================================
// CONSTANTS
// ========================================

// Timeout durations (in milliseconds)
const TIMEOUT_DURATIONS = {
  DEFAULT_HANDLER: parseInt(process.env.HANDLER_TIMEOUT) || 30000,
  DEFAULT_WEBHOOK: parseInt(process.env.WEBHOOK_TIMEOUT) || 30000,
  SERVER_BUFFER: 5000  // Additional buffer for server timeout
};

// HTTP status codes
const STATUS_CODES = {
  GATEWAY_TIMEOUT: HTTP_STATUS.GATEWAY_TIMEOUT
};

// Error messages
const ERROR_MESSAGES = {
  HANDLER_TIMEOUT: 'exceeded timeout of',
  GATEWAY_TIMEOUT: 'Gateway Timeout',
  REQUEST_TIMEOUT: 'Request processing exceeded timeout limit'
};

// Log context labels
const LOG_CONTEXT = {
  HANDLER_TIMEOUT: 'Handler timeout exceeded',
  REQUEST_TIMEOUT: 'Request timeout exceeded',
  OPERATION_TIMEOUT: 'Operation timeout exceeded'
};

// ========================================
// HANDLER TIMEOUT WRAPPER
// ========================================

/**
 * Wrap an async handler with timeout protection
 * @param {Function} handler - The async handler function to wrap
 * @param {Number} timeoutMs - Timeout in milliseconds (default: 30000ms = 30s)
 * @param {String} handlerName - Name of the handler for logging
 * @returns {Function} Wrapped handler with timeout protection
 */ 
function withTimeout(handler, timeoutMs = TIMEOUT_DURATIONS.DEFAULT_HANDLER, handlerName = 'handler') {
  return async (...args) => {
    const startTime = Date.now();
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Handler "${handlerName}" ${ERROR_MESSAGES.HANDLER_TIMEOUT} ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      // Race between handler execution and timeout
      const result = await Promise.race([
        handler(...args),
        timeoutPromise
      ]);
      
      const processingTime = Date.now() - startTime;
      logger.debug('Handler execution completed', { 
        handlerName, 
        processingTime: `${processingTime}ms`,
        timeout: `${timeoutMs}ms`
      });
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error.message.includes(ERROR_MESSAGES.HANDLER_TIMEOUT)) {
        // Log additional context if available
        const req = args.find(arg => arg && arg.method && arg.path);
        logger.error(LOG_CONTEXT.HANDLER_TIMEOUT, {
          handlerName,
          timeout: `${timeoutMs}ms`,
          processingTime: `${processingTime}ms`,
          method: req?.method,
          path: req?.path,
          ip: req?.ip,
          businessId: req?.businessId ? req.businessId.toString() : undefined
        });
      }
      throw error;
    }
  };
}

// ========================================
// WEBHOOK TIMEOUT MIDDLEWARE
// ========================================

/**
 * Express middleware to add timeout to webhook handlers
 * @param {Number} timeoutMs - Timeout in milliseconds (default: 30000ms = 30s)
 */
function webhookTimeoutMiddleware(timeoutMs = TIMEOUT_DURATIONS.DEFAULT_WEBHOOK) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Set a server timeout slightly higher than our timeout
    const serverTimeout = timeoutMs + TIMEOUT_DURATIONS.SERVER_BUFFER;
    req.setTimeout(serverTimeout);
    res.setTimeout(serverTimeout);

    // Track if response was sent
    let responseSent = false;
    
    // Wrap res.send, res.json, etc to track response
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.sendStatus;
    
    res.send = function(...args) {
      responseSent = true;
      const processingTime = Date.now() - startTime;
      logger.debug('Response sent', { 
        method: req.method, 
        path: req.path, 
        processingTime: `${processingTime}ms` 
      });
      return originalSend.apply(this, args);
    };
    
    res.json = function(...args) {
      responseSent = true;
      const processingTime = Date.now() - startTime;
      logger.debug('JSON response sent', { 
        method: req.method, 
        path: req.path, 
        processingTime: `${processingTime}ms` 
      });
      return originalJson.apply(this, args);
    };
    
    res.sendStatus = function(...args) {
      responseSent = true;
      return originalStatus.apply(this, args);
    };

    // Set timeout for this specific request
    const timeoutId = setTimeout(() => {
      if (!responseSent) {
        const processingTime = Date.now() - startTime;
        
        logger.error(LOG_CONTEXT.REQUEST_TIMEOUT, {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          timeout: `${timeoutMs}ms`,
          processingTime: `${processingTime}ms`,
          businessId: req.businessId ? req.businessId.toString() : undefined
        });
        
        // Send timeout response if not already sent
        if (!res.headersSent) {
          res.status(STATUS_CODES.GATEWAY_TIMEOUT).json({
            error: ERROR_MESSAGES.GATEWAY_TIMEOUT,
            message: ERROR_MESSAGES.REQUEST_TIMEOUT
          });
        }
      }
    }, timeoutMs);

    // Clear timeout on response finish
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
}

// ========================================
// WEBHOOK HANDLER WRAPPER
// ========================================

/**
 * Wrap webhook handler functions with timeout protection
 * @param {Object} handlers - Object containing handler functions
 * @param {Number} timeoutMs - Timeout in milliseconds
 * @returns {Object} Handlers wrapped with timeout protection
 */
function wrapWebhookHandlers(handlers, timeoutMs = TIMEOUT_DURATIONS.DEFAULT_WEBHOOK) {
  const startTime = Date.now();
  const wrappedHandlers = {};
  
  try {
    for (const [name, handler] of Object.entries(handlers)) {
      if (typeof handler === 'function') {
        wrappedHandlers[name] = withTimeout(handler, timeoutMs, name);
      } else {
        wrappedHandlers[name] = handler;
      }
    }
    
    const processingTime = Date.now() - startTime;
    logger.debug('Webhook handlers wrapped', { 
      handlerCount: Object.keys(wrappedHandlers).length,
      processingTime: `${processingTime}ms`
    });
    
    return wrappedHandlers;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error wrapping webhook handlers', { 
      error: error.message, 
      processingTime: `${processingTime}ms` 
    });
    throw error;
  }
}

// ========================================
// TIMEOUT CONTROLLER
// ========================================

/**
 * Create a timeout controller for manual control
 * Useful for long-running operations with progress updates
 */
class TimeoutController {
  constructor(timeoutMs = TIMEOUT_DURATIONS.DEFAULT_HANDLER, name = 'operation') {
    this.timeoutMs = timeoutMs;
    this.name = name;
    this.startTime = Date.now();
    this.timeoutId = null;
    this.aborted = false;
  }

  start(onTimeout) {
    this.timeoutId = setTimeout(() => {
      this.aborted = true;
      const elapsed = this.getElapsedTime();
      
      logger.error(LOG_CONTEXT.OPERATION_TIMEOUT, {
        name: this.name,
        timeout: `${this.timeoutMs}ms`,
        elapsed: `${elapsed}ms`
      });
      
      if (onTimeout) {
        try {
          onTimeout();
        } catch (error) {
          logger.error('Error in timeout callback', { 
            name: this.name, 
            error: error.message 
          });
        }
      }
    }, this.timeoutMs);
  }

  extend(additionalMs) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      const remaining = this.timeoutMs - (Date.now() - this.startTime);
      this.timeoutMs = remaining + additionalMs;
      
      logger.debug('Timeout extended', { 
        name: this.name, 
        additionalMs: `${additionalMs}ms`, 
        newTimeout: `${this.timeoutMs}ms` 
      });
      
      this.start();
    }
  }

  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      
      const elapsed = this.getElapsedTime();
      logger.debug('Timeout cancelled', { 
        name: this.name, 
        elapsed: `${elapsed}ms` 
      });
    }
  }

  isAborted() {
    return this.aborted;
  }

  getElapsedTime() {
    return Date.now() - this.startTime;
  }

  getRemainingTime() {
    return Math.max(0, this.timeoutMs - this.getElapsedTime());
  }
}

module.exports = {
  withTimeout,
  webhookTimeoutMiddleware,
  wrapWebhookHandlers,
  TimeoutController
};
