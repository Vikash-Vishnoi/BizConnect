/**
 * Response Formatter Middleware
 * Standardizes all API responses across the application
 * Phase 28: Refactored with constants, structured logging, and performance tracking
 * 
 * USAGE GUIDE:
 * 
 * SUCCESS RESPONSES:
 * - res.success(data, 'Message')              → 200 OK
 * - res.created(data, 'Created message')      → 201 Created
 * - res.accepted(data, 'Accepted message')    → 202 Accepted
 * - res.noContent()                           → 204 No Content
 * 
 * PAGINATED RESPONSES:
 * - res.paginated(items, page, limit, total, meta)
 * 
 * ERROR RESPONSES (Use sparingly - prefer throwing errors with asyncHandler):
 * - res.badRequest('Message', details)        → 400 Bad Request
 * - res.unauthorized('Message')               → 401 Unauthorized
 * - res.forbidden('Message')                  → 403 Forbidden
 * - res.notFound('Resource name')             → 404 Not Found
 * - res.conflict('Message', details)          → 409 Conflict
 * - res.validationError(errors)               → 422 Validation Error
 * - res.serverError('Message', details)       → 500 Server Error
 * 
 * BEST PRACTICES:
 * ✅ return res.success(data, 'Success message');
 * ✅ return res.created(newUser, 'User created');
 * ✅ return res.paginated(items, page, limit, total);
 * 
 * ❌ res.status(200).json({ success: true, data });  // Don't do this
 * ❌ res.json({ error: 'Error message' });           // Don't do this
 * 
 * NOTE: For complex error handling, prefer using error classes with asyncHandler
 * from errorHandler.js instead of calling res.error methods directly.
 * 
 * Attaches helper methods to res object for consistent response formatting
 */

const logger = require('../../common/helpers/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../../common/constants/app.constants');

// ========================================
// CONSTANTS
// ========================================

// Default messages
const DEFAULT_MESSAGES = {
  SUCCESS: 'Success',
  RESOURCE_CREATED: 'Resource created successfully',
  REQUEST_ACCEPTED: 'Request accepted',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  RESOURCE_NOT_FOUND: 'Resource not found',
  RESOURCE_CONFLICT: 'Resource conflict',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error'
};

// Default resource name
const DEFAULT_RESOURCE = 'Resource';

// Pagination defaults
const PAGINATION_DEFAULTS = {
  MIN_PAGE: 1,
  MIN_TOTAL: 0
};

// Environment check
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Log context labels
const LOG_CONTEXT = {
  API_ERROR_RESPONSE: 'API Error Response'
};

// ========================================
// RESPONSE FORMATTER MIDDLEWARE
// ========================================

/**
 * Attach response helper methods to Express response object
 */
const responseFormatter = (req, res, next) => {
  const startTime = Date.now();
  
  /**
   * Send success response
   * @param {*} data - Response data (optional)
   * @param {string} message - Success message (optional)
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  res.success = function(data = null, message = DEFAULT_MESSAGES.SUCCESS, statusCode = HTTP_STATUS.OK) {
    const processingTime = Date.now() - startTime;
    
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    // Only add data if it's not null/undefined
    if (data !== null && data !== undefined) {
      response.data = data;
    }

    logger.debug('Success response sent', {
      path: req.path,
      method: req.method,
      statusCode,
      processingTime: `${processingTime}ms`,
      businessId: req.businessId ? req.businessId.toString() : undefined
    });

    return this.status(statusCode).json(response);
  };

  /**
   * Send error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {*} details - Error details (optional, only in development)
   * @param {string} errorCode - Error code (optional)
   */
  res.error = function(message = DEFAULT_MESSAGES.INTERNAL_SERVER_ERROR, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null, errorCode = null) {
    const processingTime = Date.now() - startTime;
    
    const response = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };

    // Add error code if provided
    if (errorCode) {
      response.errorCode = errorCode;
    }

    // Add details only if provided and not in production
    if (details && !IS_PRODUCTION) {
      response.details = details;
    }

    // Log error for monitoring
    logger.error(LOG_CONTEXT.API_ERROR_RESPONSE, {
      path: req.path,
      method: req.method,
      statusCode,
      message,
      processingTime: `${processingTime}ms`,
      businessId: req.businessId ? req.businessId.toString() : undefined
    });

    return this.status(statusCode).json(response);
  };

  /**
   * Send paginated response with metadata
   * @param {Array} items - Array of items for current page
   * @param {number} page - Current page number
   * @param {number} limit - Items per page
   * @param {number} total - Total number of items
   * @param {Object} meta - Additional metadata (optional)
   */
  res.paginated = function(items = [], page = 1, limit = 10, total = 0, meta = {}) {
    const processingTime = Date.now() - startTime;
    
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;
    const hasPrevious = page > PAGINATION_DEFAULTS.MIN_PAGE;

    const response = {
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasMore,
        hasPrevious
      },
      timestamp: new Date().toISOString()
    };

    // Add any additional metadata
    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }

    logger.debug('Paginated response sent', {
      path: req.path,
      method: req.method,
      page,
      limit,
      total,
      itemCount: items.length,
      processingTime: `${processingTime}ms`,
      businessId: req.businessId ? req.businessId.toString() : undefined
    });

    return this.status(HTTP_STATUS.OK).json(response);
  };

  /**
   * Send created response (201)
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   */
  res.created = function(data, message = DEFAULT_MESSAGES.RESOURCE_CREATED) {
    return this.success(data, message, HTTP_STATUS.CREATED);
  };

  /**
   * Send accepted response (202)
   * @param {*} data - Response data
   * @param {string} message - Success message
   */
  res.accepted = function(data = null, message = DEFAULT_MESSAGES.REQUEST_ACCEPTED) {
    return this.success(data, message, HTTP_STATUS.ACCEPTED);
  };

  /**
   * Send no content response (204)
   */
  res.noContent = function() {
    const processingTime = Date.now() - startTime;
    
    logger.debug('No content response sent', {
      path: req.path,
      method: req.method,
      processingTime: `${processingTime}ms`,
      businessId: req.businessId ? req.businessId.toString() : undefined
    });
    
    return this.status(HTTP_STATUS.NO_CONTENT).send();
  };

  /**
   * Send bad request error (400)
   * @param {string} message - Error message
   * @param {*} details - Validation details
   */
  res.badRequest = function(message = DEFAULT_MESSAGES.BAD_REQUEST, details = null) {
    return this.error(message, HTTP_STATUS.BAD_REQUEST, details, ERROR_CODES.BAD_REQUEST);
  };

  /**
   * Send unauthorized error (401)
   * @param {string} message - Error message
   */
  res.unauthorized = function(message = DEFAULT_MESSAGES.UNAUTHORIZED) {
    return this.error(message, HTTP_STATUS.UNAUTHORIZED, null, ERROR_CODES.UNAUTHORIZED);
  };

  /**
   * Send forbidden error (403)
   * @param {string} message - Error message
   */
  res.forbidden = function(message = DEFAULT_MESSAGES.FORBIDDEN) {
    return this.error(message, HTTP_STATUS.FORBIDDEN, null, ERROR_CODES.FORBIDDEN);
  };

  /**
   * Send not found error (404)
   * @param {string} resource - Resource name (optional)
   */
  res.notFound = function(resource = DEFAULT_RESOURCE) {
    const message = typeof resource === 'string' && resource !== DEFAULT_RESOURCE
      ? `${resource} not found`
      : DEFAULT_MESSAGES.RESOURCE_NOT_FOUND;
    return this.error(message, HTTP_STATUS.NOT_FOUND, null, ERROR_CODES.NOT_FOUND);
  };

  /**
   * Send conflict error (409)
   * @param {string} message - Error message
   * @param {*} details - Conflict details
   */
  res.conflict = function(message = DEFAULT_MESSAGES.RESOURCE_CONFLICT, details = null) {
    return this.error(message, HTTP_STATUS.CONFLICT, details, ERROR_CODES.CONFLICT);
  };

  /**
   * Send validation error (422)
   * @param {Array|Object} errors - Validation errors
   */
  res.validationError = function(errors) {
    const formattedErrors = Array.isArray(errors) ? errors : [errors];
    return this.error(DEFAULT_MESSAGES.VALIDATION_FAILED, HTTP_STATUS.UNPROCESSABLE_ENTITY, { errors: formattedErrors }, ERROR_CODES.VALIDATION_ERROR);
  };

  /**
   * Send server error (500)
   * @param {string} message - Error message
   * @param {*} details - Error details
   */
  res.serverError = function(message = DEFAULT_MESSAGES.INTERNAL_ERROR, details = null) {
    return this.error(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, details, ERROR_CODES.SERVER_ERROR);
  };

  next();
};

module.exports = responseFormatter;
