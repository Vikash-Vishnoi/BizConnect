/**
 * Handler Timeout Middleware
 * Prevents handlers from running indefinitely and causing memory leaks
 * @module middleware/handlerTimeout
 */

// Configuration from environment variables
const DEFAULT_TIMEOUT = parseInt(process.env.HANDLER_TIMEOUT) || 30000;
const DEFAULT_WEBHOOK_TIMEOUT = parseInt(process.env.WEBHOOK_TIMEOUT) || 30000;

/**
 * Wrap an async handler with timeout protection
 * @param {Function} handler - The async handler function to wrap
 * @param {Number} timeoutMs - Timeout in milliseconds (default: 30000ms = 30s)
 * @param {String} handlerName - Name of the handler for logging
 * @returns {Function} Wrapped handler with timeout protection
 */ 
function withTimeout(handler, timeoutMs = DEFAULT_TIMEOUT, handlerName = 'handler') {
  return async (...args) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Handler "${handlerName}" exceeded timeout of ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      // Race between handler execution and timeout
      return await Promise.race([
        handler(...args),
        timeoutPromise
      ]);
    } catch (error) {
      if (error.message.includes('exceeded timeout')) {
        console.error(`⏱️  TIMEOUT: ${handlerName} took longer than ${timeoutMs}ms`);
        // Log additional context if available
        const req = args.find(arg => arg && arg.method && arg.path);
        if (req) {
          console.error(`   Path: ${req.method} ${req.path}`);
          console.error(`   IP: ${req.ip}`);
        }
      }
      throw error;
    }
  };
}

/**
 * Express middleware to add timeout to webhook handlers
 * @param {Number} timeoutMs - Timeout in milliseconds (default: 30000ms = 30s)
 */
function webhookTimeoutMiddleware(timeoutMs = DEFAULT_WEBHOOK_TIMEOUT) {
  return (req, res, next) => {
    // Set a server timeout slightly higher than our timeout
    req.setTimeout(timeoutMs + 5000);
    res.setTimeout(timeoutMs + 5000);

    // Track if response was sent
    let responseSent = false;
    
    // Wrap res.send, res.json, etc to track response
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.sendStatus;
    
    res.send = function(...args) {
      responseSent = true;
      return originalSend.apply(this, args);
    };
    
    res.json = function(...args) {
      responseSent = true;
      return originalJson.apply(this, args);
    };
    
    res.sendStatus = function(...args) {
      responseSent = true;
      return originalStatus.apply(this, args);
    };

    // Set timeout for this specific request
    const timeoutId = setTimeout(() => {
      if (!responseSent) {
        console.error(`⏱️  REQUEST TIMEOUT: ${req.method} ${req.path}`, {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          timeout: `${timeoutMs}ms`
        });
        
        // Send timeout response if not already sent
        if (!res.headersSent) {
          res.status(504).json({
            error: 'Gateway Timeout',
            message: 'Request processing exceeded timeout limit'
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

/**
 * Wrap webhook handler functions with timeout protection
 * @param {Object} handlers - Object containing handler functions
 * @param {Number} timeoutMs - Timeout in milliseconds
 * @returns {Object} Handlers wrapped with timeout protection
 */
function wrapWebhookHandlers(handlers, timeoutMs = DEFAULT_WEBHOOK_TIMEOUT) {
  const wrappedHandlers = {};
  
  for (const [name, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function') {
      wrappedHandlers[name] = withTimeout(handler, timeoutMs, name);
    } else {
      wrappedHandlers[name] = handler;
    }
  }
  
  return wrappedHandlers;
}

/**
 * Create a timeout controller for manual control
 * Useful for long-running operations with progress updates
 */
class TimeoutController {
  constructor(timeoutMs = DEFAULT_TIMEOUT, name = 'operation') {
    this.timeoutMs = timeoutMs;
    this.name = name;
    this.startTime = Date.now();
    this.timeoutId = null;
    this.aborted = false;
  }

  start(onTimeout) {
    this.timeoutId = setTimeout(() => {
      this.aborted = true;
      console.error(`⏱️  TIMEOUT: ${this.name} exceeded ${this.timeoutMs}ms`);
      if (onTimeout) {
        onTimeout();
      }
    }, this.timeoutMs);
  }

  extend(additionalMs) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      const remaining = this.timeoutMs - (Date.now() - this.startTime);
      this.timeoutMs = remaining + additionalMs;
      this.start();
    }
  }

  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
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
