/**
 * API Response Helpers
 * Standardized response formatting utilities
 */

const { HTTP_STATUS } = require('../constants');

/**
 * Success response helper
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const successResponse = (res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Error response helper
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {string} errorCode - Application error code
 * @param {number} statusCode - HTTP status code
 * @param {object} details - Additional error details
 */
const errorResponse = (
  res,
  message = 'An error occurred',
  errorCode = 'INTERNAL_ERROR',
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details = null
) => {
  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Created response helper
 * @param {object} res - Express response object
 * @param {object} data - Created resource data
 * @param {string} message - Success message
 */
const createdResponse = (res, data, message = 'Resource created successfully') => {
  return successResponse(res, data, message, HTTP_STATUS.CREATED);
};

/**
 * No content response helper
 * @param {object} res - Express response object
 */
const noContentResponse = res => {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

/**
 * Paginated response helper
 * @param {object} res - Express response object
 * @param {Array} items - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 */
const paginatedResponse = (
  res,
  items,
  page,
  limit,
  total,
  message = 'Data retrieved successfully'
) => {
  const totalPages = Math.ceil(total / limit);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
};

/**
 * Validation error response helper
 * @param {object} res - Express response object
 * @param {Array|object} errors - Validation errors
 */
const validationErrorResponse = (res, errors) => {
  return errorResponse(
    res,
    'Validation failed',
    'VALIDATION_ERROR',
    HTTP_STATUS.BAD_REQUEST,
    errors
  );
};

/**
 * Not found response helper
 * @param {object} res - Express response object
 * @param {string} resource - Resource name
 */
const notFoundResponse = (res, resource = 'Resource') => {
  return errorResponse(
    res,
    `${resource} not found`,
    'RESOURCE_NOT_FOUND',
    HTTP_STATUS.NOT_FOUND
  );
};

/**
 * Unauthorized response helper
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
const unauthorizedResponse = (res, message = 'Authentication required') => {
  return errorResponse(res, message, 'UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED);
};

/**
 * Forbidden response helper
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
const forbiddenResponse = (res, message = 'Access denied') => {
  return errorResponse(res, message, 'FORBIDDEN', HTTP_STATUS.FORBIDDEN);
};

/**
 * Conflict response helper
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
const conflictResponse = (res, message = 'Resource already exists') => {
  return errorResponse(res, message, 'RESOURCE_CONFLICT', HTTP_STATUS.CONFLICT);
};

/**
 * Rate limit response helper
 * @param {object} res - Express response object
 */
const rateLimitResponse = res => {
  return errorResponse(
    res,
    'Too many requests. Please try again later',
    'RATE_LIMIT_EXCEEDED',
    HTTP_STATUS.TOO_MANY_REQUESTS
  );
};

module.exports = {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  rateLimitResponse,
};
