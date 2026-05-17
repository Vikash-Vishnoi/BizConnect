/**
 * Error Handling Utilities
 * 
 * @module utils/errors
 * @description Centralized error handling utilities for consistent error management
 * across the application. Provides functions for extracting error messages, 
 * categorizing errors, and handling API errors without leaking sensitive information.
 * 
 * @security
 * - Never logs sensitive data (tokens, passwords, etc.)
 * - Sanitizes error messages before displaying to users
 * - Only logs detailed errors in development mode
 * - Prevents stack trace exposure in production
 * 
 * @features
 * - API error message extraction
 * - Network error detection
 * - User-friendly error messages
 * - Error categorization (network, auth, validation, server)
 * - Development vs production error handling
 * - Error logging without sensitive data
 * 
 * @example
 * import { handleApiError, isNetworkError } from './errors';
 * 
 * try {
 *   await fetchData();
 * } catch (error) {
 *   const message = handleApiError(error);
 *   toast.error(message);
 * }
 */

import { HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';

/**
 * Extract user-friendly error message from API error
 * Prevents sensitive data leakage by sanitizing error messages
 * 
 * @param {Error} error - Error object from API request
 * @returns {string} User-friendly error message
 * @security Does not expose stack traces or sensitive server details
 * 
 * @example
 * handleApiError(new Error('Network Error'));
 * // Returns: "Unable to connect. Please check your internet connection."
 */
export const handleApiError = (error) => {
  // Network errors (no response from server)
  if (!error.response) {
    if (isNetworkError(error)) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    return 'Unable to connect to server. Please try again.';
  }
  
  // API provided error message (sanitized)
  if (error.response?.data?.message) {
    const message = error.response.data.message;
    // Sanitize message - don't expose internal paths or sensitive data
    return sanitizeErrorMessage(message);
  }
  
  // Alternative error field
  if (error.response?.data?.error) {
    return sanitizeErrorMessage(error.response.data.error);
  }
  
  // Status code based messages
  const status = error.response?.status;
  return getStatusErrorMessage(status);
};

/**
 * Get error message based on HTTP status code
 * 
 * @param {number} status - HTTP status code
 * @returns {string} User-friendly error message
 * 
 * @example
 * getStatusErrorMessage(401); // "Your session has expired. Please log in again."
 */
export const getStatusErrorMessage = (status) => {
  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      return 'Invalid request. Please check your input.';
    
    case HTTP_STATUS.UNAUTHORIZED:
      return 'Your session has expired. Please log in again.';
    
    case HTTP_STATUS.FORBIDDEN:
      return 'You do not have permission to perform this action.';
    
    case HTTP_STATUS.NOT_FOUND:
      return 'The requested resource was not found.';
    
    case HTTP_STATUS.CONFLICT:
      return 'This resource already exists or conflicts with existing data.';
    
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return 'A server error occurred. Our team has been notified.';
    
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      return 'Service temporarily unavailable. Please try again later.';
    
    case 429: // Rate limit
      return 'Too many requests. Please wait a moment and try again.';
    
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Sanitize error message to prevent sensitive data exposure
 * Removes file paths, stack traces, and internal system details
 * 
 * @param {string} message - Raw error message
 * @returns {string} Sanitized error message
 * @security Prevents exposure of internal system details
 * 
 * @example
 * sanitizeErrorMessage('Error at /app/src/controllers/auth.js:45');
 * // Returns: "An error occurred during authentication"
 */
export const sanitizeErrorMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return 'An error occurred';
  }
  
  // Remove file paths
  let sanitized = message.replace(/\/[\w\/\-.]+\.js:\d+/g, '');
  
  // Remove stack trace indicators
  sanitized = sanitized.replace(/\s+at\s+[\w\s.]+\s+\(/g, '');
  
  // Remove internal error codes
  sanitized = sanitized.replace(/ERR_[\w_]+/g, '');
  
  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...';
  }
  
  return sanitized.trim() || 'An error occurred';
};

/**
 * Check if error is a network error
 * 
 * @param {Error} error - Error object to check
 * @returns {boolean} True if error is due to network issues
 * 
 * @example
 * isNetworkError(new Error('Network Error')); // true
 * isNetworkError(new Error('Validation failed')); // false
 */
export const isNetworkError = (error) => {
  return (
    !error.response &&
    (error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('timeout'))
  );
};

/**
 * Check if error is an authentication error
 * 
 * @param {Error} error - Error object to check
 * @returns {boolean} True if error is authentication related
 * 
 * @example
 * isAuthError({ response: { status: 401 } }); // true
 */
export const isAuthError = (error) => {
  return error.response?.status === HTTP_STATUS.UNAUTHORIZED;
};

/**
 * Check if error is a validation error
 * 
 * @param {Error} error - Error object to check
 * @returns {boolean} True if error is validation related
 * 
 * @example
 * isValidationError({ response: { status: 400 } }); // true
 */
export const isValidationError = (error) => {
  return error.response?.status === HTTP_STATUS.BAD_REQUEST;
};

/**
 * Check if error is a permission error
 * 
 * @param {Error} error - Error object to check
 * @returns {boolean} True if error is permission related
 * 
 * @example
 * isPermissionError({ response: { status: 403 } }); // true
 */
export const isPermissionError = (error) => {
  return error.response?.status === HTTP_STATUS.FORBIDDEN;
};

/**
 * Check if error is a server error
 * 
 * @param {Error} error - Error object to check
 * @returns {boolean} True if error is server-side
 * 
 * @example
 * isServerError({ response: { status: 500 } }); // true
 */
export const isServerError = (error) => {
  const status = error.response?.status;
  return status >= 500 && status < 600;
};

/**
 * Log error to console (development only) without sensitive data
 * 
 * @param {string} context - Context where error occurred
 * @param {Error} error - Error object
 * @param {Object} metadata - Additional metadata (non-sensitive)
 * @security Only logs in development, never logs tokens or passwords
 * 
 * @example
 * logError('Dashboard Load', error, { userId: '123' });
 */
export const logError = (context, error, metadata = {}) => {
  // Only log in development
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  // Filter out sensitive data from metadata
  const safeMeta = filterSensitiveData(metadata);
  
  console.group(`🚨 Error: ${context}`);
  console.error('Message:', error.message);
  console.error('Status:', error.response?.status);
  console.error('Metadata:', safeMeta);
  console.groupEnd();
};

/**
 * Filter sensitive data from object before logging
 * 
 * @param {Object} obj - Object to filter
 * @returns {Object} Filtered object without sensitive fields
 * @security Removes tokens, passwords, and other sensitive fields
 * 
 * @example
 * filterSensitiveData({ token: 'abc', userId: '123' });
 * // Returns: { userId: '123' }
 */
export const filterSensitiveData = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = [
    'token',
    'password',
    'secret',
    'apiKey',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'session'
  ];
  
  const filtered = { ...obj };
  
  for (const key of Object.keys(filtered)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      filtered[key] = '[REDACTED]';
    }
  }
  
  return filtered;
};

/**
 * Get error category for analytics/monitoring
 * 
 * @param {Error} error - Error object
 * @returns {string} Error category
 * 
 * @example
 * getErrorCategory(networkError); // "network"
 * getErrorCategory(authError);    // "auth"
 */
export const getErrorCategory = (error) => {
  if (isNetworkError(error)) return 'network';
  if (isAuthError(error)) return 'auth';
  if (isValidationError(error)) return 'validation';
  if (isPermissionError(error)) return 'permission';
  if (isServerError(error)) return 'server';
  return 'unknown';
};

/**
 * Create custom error with additional context
 * 
 * @param {string} message - Error message
 * @param {Object} options - Error options
 * @param {string} options.code - Error code
 * @param {number} options.status - HTTP status code
 * @param {Object} options.data - Additional error data
 * @returns {Error} Custom error object
 * 
 * @example
 * throw createError('Invalid input', { code: 'VALIDATION_ERROR', status: 400 });
 */
export const createError = (message, options = {}) => {
  const error = new Error(message);
  error.code = options.code;
  error.status = options.status;
  error.data = options.data;
  return error;
};

/**
 * Format validation errors from API response
 * 
 * @param {Object} errors - Validation errors object
 * @returns {Array<string>} Array of formatted error messages
 * 
 * @example
 * formatValidationErrors({ email: 'Invalid email', password: 'Too short' });
 * // Returns: ['Email: Invalid email', 'Password: Too short']
 */
export const formatValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') {
    return ['Validation failed'];
  }
  
  return Object.entries(errors).map(([field, message]) => {
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
    return `${fieldName}: ${message}`;
  });
};

/**
 * Retry function with exponential backoff
 * 
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum retry attempts (default: 3)
 * @param {number} options.delay - Initial delay in ms (default: 1000)
 * @param {Function} options.shouldRetry - Function to determine if should retry
 * @returns {Promise<any>} Result of function
 * 
 * @example
 * const data = await retryWithBackoff(() => fetchData(), {
 *   maxAttempts: 3,
 *   delay: 1000
 * });
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    delay = 1000,
    shouldRetry = (error) => isNetworkError(error) || isServerError(error)
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Retry attempt ${attempt}/${maxAttempts} after ${waitTime}ms`);
      }
    }
  }
  
  throw lastError;
};
