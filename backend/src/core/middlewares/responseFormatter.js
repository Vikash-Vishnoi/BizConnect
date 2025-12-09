/**
 * Response Formatter Middleware
 * Standardizes all API responses across the application
 * 
 * Attaches helper methods to res object for consistent response formatting
 */

const logger = require('../../common/helpers/logger');

/**
 * Attach response helper methods to Express response object
 */
const responseFormatter = (req, res, next) => {
  /**
   * Send success response
   * @param {*} data - Response data (optional)
   * @param {string} message - Success message (optional)
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  res.success = function(data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    // Only add data if it's not null/undefined
    if (data !== null && data !== undefined) {
      response.data = data;
    }

    return this.status(statusCode).json(response);
  };

  /**
   * Send error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {*} details - Error details (optional, only in development)
   * @param {string} errorCode - Error code (optional)
   */
  res.error = function(message = 'Internal Server Error', statusCode = 500, details = null, errorCode = null) {
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
    if (details && process.env.NODE_ENV !== 'production') {
      response.details = details;
    }

    // Log error for monitoring
    logger.error('API Error Response', {
      path: req.path,
      method: req.method,
      statusCode,
      message,
      errorCode,
      userId: req.userId || 'anonymous'
    });

    return this.status(statusCode).json(response);
  };

  /**
   * Send paginated response
   * @param {Array} items - Array of items
   * @param {number} page - Current page number
   * @param {number} limit - Items per page
   * @param {number} total - Total number of items
   * @param {Object} meta - Additional metadata (optional)
   */
  res.paginated = function(items, page, limit, total, meta = {}) {
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;
    const hasPrevious = page > 1;

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

    return this.status(200).json(response);
  };

  /**
   * Send created response (201)
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   */
  res.created = function(data, message = 'Resource created successfully') {
    return this.success(data, message, 201);
  };

  /**
   * Send no content response (204)
   */
  res.noContent = function() {
    return this.status(204).send();
  };

  /**
   * Send bad request error (400)
   * @param {string} message - Error message
   * @param {*} details - Validation details
   */
  res.badRequest = function(message = 'Bad request', details = null) {
    return this.error(message, 400, details, 'BAD_REQUEST');
  };

  /**
   * Send unauthorized error (401)
   * @param {string} message - Error message
   */
  res.unauthorized = function(message = 'Unauthorized') {
    return this.error(message, 401, null, 'UNAUTHORIZED');
  };

  /**
   * Send forbidden error (403)
   * @param {string} message - Error message
   */
  res.forbidden = function(message = 'Forbidden') {
    return this.error(message, 403, null, 'FORBIDDEN');
  };

  /**
   * Send not found error (404)
   * @param {string} message - Error message
   */
  res.notFound = function(message = 'Resource not found') {
    return this.error(message, 404, null, 'NOT_FOUND');
  };

  /**
   * Send server error (500)
   * @param {string} message - Error message
   * @param {*} details - Error details
   */
  res.serverError = function(message = 'Internal server error', details = null) {
    return this.error(message, 500, details, 'SERVER_ERROR');
  };

  next();
};

module.exports = responseFormatter;
