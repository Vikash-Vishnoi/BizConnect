/**
 * Centralized Error Handler Middleware
 * Provides consistent error responses across the application
 * 
 * USAGE PATTERNS (Recommended):
 * 
 * 1. WITH ASYNCHANDLER (Recommended for all async routes):
 *    router.get('/path', asyncHandler(async (req, res) => {
 *      if (!data) throw new NotFoundError('Data');
 *      if (invalid) throw new ValidationError('Invalid input', details);
 *      res.success(data);
 *    }));
 * 
 * 2. THROW ERROR CLASSES (Inside asyncHandler):
 *    throw new ValidationError('Message', details);
 *    throw new NotFoundError('Resource name');
 *    throw new AuthenticationError('Custom message');
 *    throw new ConflictError('Message', details);
 * 
 * 3. AVOID MANUAL ERROR RESPONSES:
 *    ❌ res.status(400).json({ error: 'Bad request' });
 *    ✅ throw new ValidationError('Bad request');
 * 
 * Available Error Classes:
 * - ValidationError (422) - Invalid input data
 * - AuthenticationError (401) - Auth required/failed
 * - AuthorizationError (403) - Access denied
 * - NotFoundError (404) - Resource not found
 * - ConflictError (409) - Duplicate/conflict
 * - DatabaseError (500) - DB operation failed
 * - ExternalAPIError (502) - External API failure
 * - RateLimitError (429) - Too many requests
 * - AppError (custom) - Generic operational error
 * 
 * Phase 3: Database Connection & Error Handling Standardization
 * Phase 28: Refactored with constants, structured logging, and performance tracking
 */

const logger = require('../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../common/constants/app.constants');

// ========================================
// CONSTANTS
// ========================================

// Default error messages
const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  ACCESS_DENIED: 'Access denied',
  NOT_FOUND: 'not found',
  TOO_MANY_REQUESTS: 'Too many requests',
  VALIDATION_FAILED: 'Validation failed',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  INVALID_TOKEN: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  AUTHENTICATION_FAILED: 'Authentication failed',
  JWT_ERROR: 'JsonWebTokenError',
  TOKEN_EXPIRED_ERROR: 'TokenExpiredError',
  CAST_ERROR: 'CastError',
  MONGO_DUPLICATE_KEY_ERROR: 11000
};

// Log context labels
const LOG_CONTEXT = {
  ERROR_DEV: 'Error (Development)',
  ERROR_PROD: 'Error (Production)',
  UNEXPECTED_ERROR: 'Unexpected error',
  UNHANDLED_REJECTION: 'Unhandled Promise Rejection',
  UNCAUGHT_EXCEPTION: 'Uncaught Exception'
};

// Default status code
const DEFAULT_STATUS_CODE = HTTP_STATUS.INTERNAL_SERVER_ERROR;

// ========================================
// ERROR TYPES
// ========================================

/**
 * Error types for consistent handling
 */
const ErrorTypes = {
  VALIDATION_ERROR: 'ValidationError',
  AUTHENTICATION_ERROR: 'AuthenticationError',
  AUTHORIZATION_ERROR: 'AuthorizationError',
  NOT_FOUND_ERROR: 'NotFoundError',
  CONFLICT_ERROR: 'ConflictError',
  DATABASE_ERROR: 'DatabaseError',
  EXTERNAL_API_ERROR: 'ExternalAPIError',
  RATE_LIMIT_ERROR: 'RateLimitError',
  INTERNAL_ERROR: 'InternalError'
};

// ========================================
// CUSTOM ERROR CLASSES
// ========================================

/**
 * Custom Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode, type = ErrorTypes.INTERNAL_ERROR, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Specific error classes
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, ErrorTypes.VALIDATION_ERROR, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = ERROR_MESSAGES.AUTHENTICATION_REQUIRED) {
    super(message, HTTP_STATUS.UNAUTHORIZED, ErrorTypes.AUTHENTICATION_ERROR);
  }
}

class AuthorizationError extends AppError {
  constructor(message = ERROR_MESSAGES.ACCESS_DENIED) {
    super(message, HTTP_STATUS.FORBIDDEN, ErrorTypes.AUTHORIZATION_ERROR);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} ${ERROR_MESSAGES.NOT_FOUND}`, HTTP_STATUS.NOT_FOUND, ErrorTypes.NOT_FOUND_ERROR);
  }
}

class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, HTTP_STATUS.CONFLICT, ErrorTypes.CONFLICT_ERROR, details);
  }
}

class DatabaseError extends AppError {
  constructor(message, details = null) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ErrorTypes.DATABASE_ERROR, details);
  }
}

class ExternalAPIError extends AppError {
  constructor(service, message, details = null) {
    super(`${service} API error: ${message}`, HTTP_STATUS.BAD_GATEWAY, ErrorTypes.EXTERNAL_API_ERROR, details);
  }
}

class RateLimitError extends AppError {
  constructor(message = ERROR_MESSAGES.TOO_MANY_REQUESTS, retryAfter = null) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, ErrorTypes.RATE_LIMIT_ERROR, { retryAfter });
  }
}

// ========================================
// ERROR HANDLERS
// ========================================

/**
 * Handle Mongoose validation errors
 */
const handleMongooseValidationError = (err) => {
  const startTime = Date.now();
  
  // Check if err.errors exists and is an object
  if (!err.errors || typeof err.errors !== 'object') {
    logger.warn('ValidationError missing errors object', { 
      errorName: err.name,
      errorMessage: err.message,
      hasErrors: !!err.errors
    });
    return new ValidationError(err.message || ERROR_MESSAGES.VALIDATION_FAILED, []);
  }
  
  const errors = Object.values(err.errors).map(error => ({
    field: error.path,
    message: error.message,
    value: error.value
  }));

  const processingTime = Date.now() - startTime;
  logger.debug('Mongoose validation error processed', { processingTime, errorCount: errors.length });

  return new ValidationError(ERROR_MESSAGES.VALIDATION_FAILED, errors);
};

/**
 * Handle Mongoose duplicate key errors
 */
const handleMongooseDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyPattern)[0];
  const value = err.keyValue[field];
  
  return new ConflictError(
    `A record with ${field} '${value}' already exists`,
    { field, value }
  );
};

/**
 * Handle Mongoose cast errors (invalid ObjectId)
 */
const handleMongooseCastError = (err) => {
  return new ValidationError(
    `Invalid ${err.path}: ${err.value}`,
    { field: err.path, value: err.value }
  );
};

/**
 * Handle JWT errors
 */
const handleJWTError = (err) => {
  const startTime = Date.now();
  
  let result;
  if (err.name === ERROR_MESSAGES.JWT_ERROR) {
    result = new AuthenticationError(ERROR_MESSAGES.INVALID_TOKEN);
  } else if (err.name === ERROR_MESSAGES.TOKEN_EXPIRED_ERROR) {
    result = new AuthenticationError(ERROR_MESSAGES.TOKEN_EXPIRED);
  } else {
    result = new AuthenticationError(ERROR_MESSAGES.AUTHENTICATION_FAILED);
  }
  
  const processingTime = Date.now() - startTime;
  logger.debug('JWT error processed', { processingTime, errorName: err.name });
  
  return result;
};

/**
 * Development error response (with stack trace)
 */
const sendErrorDev = (err, req, res) => {
  const startTime = Date.now();
  
  logger.error(LOG_CONTEXT.ERROR_DEV, {
    error: err.message,
    stack: err.stack,
    type: err.type,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    userId: req.userId ? req.userId.toString() : 'anonymous'
  });

  const processingTime = Date.now() - startTime;
  
  res.status(err.statusCode || DEFAULT_STATUS_CODE).json({
    success: false,
    error: err.message,
    type: err.type,
    details: err.details,
    stack: err.stack,
    request: {
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    },
    processingTime: `${processingTime}ms`
  });
};

/**
 * Production error response (without sensitive data)
 */
const sendErrorProd = (err, req, res) => {
  const startTime = Date.now();
  
  // Log error with context
  logger.error(LOG_CONTEXT.ERROR_PROD, {
    error: err.message,
    type: err.type,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    userId: req.userId ? req.userId.toString() : 'anonymous',
    businessId: req.businessId ? req.businessId.toString() : undefined,
    isOperational: err.isOperational
  });

  const processingTime = Date.now() - startTime;

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      type: err.type,
      ...(err.details && { details: err.details })
    });
  } else {
    // Programming or unknown error: don't leak details
    logger.error(LOG_CONTEXT.UNEXPECTED_ERROR, {
      error: err.message,
      stack: err.stack,
      processingTime: `${processingTime}ms`
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.UNEXPECTED_ERROR,
      type: ErrorTypes.INTERNAL_ERROR
    });
  }
};

/**
 * Global error handler middleware
 * 
 * Usage: app.use(errorHandler);
 * 
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  const startTime = Date.now();
  
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || DEFAULT_STATUS_CODE;
  error.type = err.type || ErrorTypes.INTERNAL_ERROR;

  // Mongoose validation error
  if (err.name === ErrorTypes.VALIDATION_ERROR) {
    error = handleMongooseValidationError(err);
  }

  // Mongoose duplicate key error
  if (err.code === ERROR_MESSAGES.MONGO_DUPLICATE_KEY_ERROR) {
    error = handleMongooseDuplicateKeyError(err);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === ERROR_MESSAGES.CAST_ERROR) {
    error = handleMongooseCastError(err);
  }

  // JWT errors
  if (err.name === ERROR_MESSAGES.JWT_ERROR || err.name === ERROR_MESSAGES.TOKEN_EXPIRED_ERROR) {
    error = handleJWTError(err);
  }

  const processingTime = Date.now() - startTime;
  logger.debug('Error handler processing completed', { 
    processingTime: `${processingTime}ms`,
    errorType: error.type,
    statusCode: error.statusCode
  });

  // Send appropriate response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * 404 Not Found handler
 * 
 * Usage: app.use(notFoundHandler);
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * 
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }));
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    const startTime = Date.now();
    
    logger.error(LOG_CONTEXT.UNHANDLED_REJECTION, {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    const processingTime = Date.now() - startTime;
    logger.debug('Unhandled rejection logged', { processingTime: `${processingTime}ms` });
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    const startTime = Date.now();
    
    logger.error(LOG_CONTEXT.UNCAUGHT_EXCEPTION, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    const processingTime = Date.now() - startTime;
    logger.info('Uncaught exception logged', { processingTime: `${processingTime}ms` });
    
    // Exit process after logging
    process.exit(1);
  });
};

module.exports = {
  // Error handler middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalAPIError,
  RateLimitError,
  
  // Error types
  ErrorTypes,
  
  // Process handlers
  handleUnhandledRejection,
  handleUncaughtException
};
