/**
 * Response Handler Utility
 * Standardized API response formatting
 * 
 * @module common/utils/responseHandler
 */

const { HTTP_STATUS } = require('../constants/app.constants');

/**
 * Send success response
 * @param {object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {object} meta - Additional metadata (pagination, etc.)
 */
function success(res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK, meta = {}) {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  // Add metadata if provided
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send created response (201)
 * @param {object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 */
function created(res, data, message = 'Resource created successfully') {
  return success(res, data, message, HTTP_STATUS.CREATED);
}

/**
 * Send no content response (204)
 * @param {object} res - Express response object
 */
function noContent(res) {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}

/**
 * Send paginated response
 * @param {object} res - Express response object
 * @param {Array} data - Array of items
 * @param {object} pagination - Pagination info
 * @param {string} message - Success message
 */
function paginated(res, data, pagination, message = 'Success') {
  const { page, limit, total, totalPages } = pagination;

  return success(res, data, message, HTTP_STATUS.OK, {
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: parseInt(total, 10),
      totalPages: parseInt(totalPages, 10),
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

/**
 * Send error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Application error code
 * @param {*} details - Additional error details
 */
function error(
  res,
  message = 'An error occurred',
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  errorCode = null,
  details = null
) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errorCode) {
    response.errorCode = errorCode;
  }

  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send validation error response
 * @param {object} res - Express response object
 * @param {Array} errors - Array of validation errors
 * @param {string} message - Error message
 */
function validationError(res, errors = [], message = 'Validation failed') {
  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send unauthorized error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function unauthorized(res, message = 'Authentication required') {
  return error(res, message, HTTP_STATUS.UNAUTHORIZED, 'AUTH_UNAUTHORIZED');
}

/**
 * Send forbidden error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function forbidden(res, message = 'Access forbidden') {
  return error(res, message, HTTP_STATUS.FORBIDDEN, 'AUTH_FORBIDDEN');
}

/**
 * Send not found error response
 * @param {object} res - Express response object
 * @param {string} resource - Resource name
 */
function notFound(res, resource = 'Resource') {
  return error(res, `${resource} not found`, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
}

/**
 * Send conflict error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function conflict(res, message = 'Resource already exists') {
  return error(res, message, HTTP_STATUS.CONFLICT, 'CONFLICT');
}

/**
 * Send rate limit error response
 * @param {object} res - Express response object
 * @param {number} retryAfter - Seconds until retry allowed
 */
function rateLimitExceeded(res, retryAfter = 60) {
  res.set('Retry-After', retryAfter);
  return error(
    res,
    'Too many requests, please try again later',
    HTTP_STATUS.TOO_MANY_REQUESTS,
    'RATE_LIMIT_EXCEEDED',
    { retryAfter }
  );
}

/**
 * Send bad request error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function badRequest(res, message = 'Bad request') {
  return error(res, message, HTTP_STATUS.BAD_REQUEST, 'BAD_REQUEST');
}

/**
 * Send internal server error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function internalError(res, message = 'Internal server error') {
  return error(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR');
}

/**
 * Send service unavailable error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function serviceUnavailable(res, message = 'Service temporarily unavailable') {
  return error(res, message, HTTP_STATUS.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE');
}

/**
 * Calculate pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
function calculatePagination(total, page, limit) {
  const totalPages = Math.ceil(total / limit) || 1;
  
  return {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total: parseInt(total, 10),
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

module.exports = {
  success,
  created,
  noContent,
  paginated,
  error,
  validationError,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  rateLimitExceeded,
  badRequest,
  internalError,
  serviceUnavailable,
  calculatePagination,
};
