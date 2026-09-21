/**
 * 🔐 Centralized API Service
 * Handles all HTTP requests with authentication, error handling, and consistent patterns
 * 
 * Features:
 * - Automatic token injection
 * - Request/response interceptors
 * - Centralized error handling
 * - Loading state management
 * - Retry logic for failed requests
 * 
 * @module services/api
 */

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT, API_RETRY_ATTEMPTS, API_RETRY_DELAY } from '../config/api';
import { STORAGE_KEYS, HTTP_STATUS, ERROR_MESSAGES, ENV } from '../config/constants';

/**
 * Create axios instance with default config
 * @constant {Object}
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Adds authentication token and business context to all requests
 */
/**
 * Request Interceptor
 * Adds authentication token and business context to all requests
 * 
 * @param {Object} config - Axios request configuration
 * @returns {Object} Enhanced configuration with auth headers
 * @description
 * - Injects JWT token from storage for authentication
 * - Adds business ID header for multi-tenant support
 * - Logs requests in development mode
 * - Handles user data parsing errors gracefully
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add business ID from user context if available
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user.businessId) {
          config.headers['X-Business-ID'] = user.businessId;
        }
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }

    // Log request in development
    if (ENV.DEBUG) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles errors, token refresh, and logging
 * 
 * @param {Object} response - Axios response object
 * @returns {Object} Response data
 * @description
 * - Logs successful responses in development mode
 * - Handles 401 Unauthorized by clearing auth and redirecting to login
 * - Handles 403 Forbidden with silent endpoint support for business APIs
 * - Handles 429 Rate Limiting with user-friendly warnings
 * - Handles 500 Server Errors with detailed logging
 * - Provides comprehensive error context in debug mode
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (ENV.DEBUG) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Handle 401 Unauthorized - Token expired
    if (status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { token, refreshToken: newRefreshToken } = response.data.data;

        // Save new tokens
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

        // Update the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Clear auth data and redirect to login if refresh fails
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Handle 403 Forbidden - Insufficient permissions
    if (status === HTTP_STATUS.FORBIDDEN) {
      // Suppress logging for expected 403s (business context during auth)
      const isSilentEndpoint = error.config?.url?.includes('/business/');
      if (!isSilentEndpoint) {
        console.error('🚫 Access Denied:', error.response.data);
      }
    }

    // Handle 429 Too Many Requests - Rate limiting
    if (status === 429) {
      console.warn('⚠️ Rate limit exceeded. Please try again later.');
    }

    // Handle 500 Server Error
    if (status === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      console.error('💥 Server Error:', error.response.data);
    }

    // Log error (suppress for expected silent endpoints)
    const isSilentError = status === HTTP_STATUS.FORBIDDEN && error.config?.url?.includes('/business/');
    if (!isSilentError && ENV.DEBUG) {
      console.error('❌ API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Extract user-friendly error message from API response
 * 
 * @param {Error} error - Error object from API request
 * @returns {string} User-friendly error message
 * @description
 * Extracts error messages in priority order:
 * 1. error.response.data.message (API error message)
 * 2. error.response.data.error (alternative API error field)
 * 3. Network error handling
 * 4. HTTP status-based messages (401, 403, 404, 500+)
 * 5. Generic error message fallback
 */
export const getErrorMessage = (error) => {
  // API provided error message
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Alternative error field
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  // Network errors
  if (!error.response) {
    return 'Unable to connect to server. Please check your internet connection.';
  }

  // Status code based messages
  const status = error.response.status;
  switch (status) {
    case HTTP_STATUS.UNAUTHORIZED:
      return 'Session expired. Please log in again.';
    case HTTP_STATUS.FORBIDDEN:
      return 'You do not have permission to perform this action.';
    case HTTP_STATUS.NOT_FOUND:
      return 'The requested resource was not found.';
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return 'Server error. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
};

/**
 * Check if error is a network error
 * @param {Error} error - Error object to check
 * @returns {boolean} True if error is due to network issues
 */
export const isNetworkError = (error) => {
  return !error.response && error.message === 'Network Error';
};

/**
 * Format query parameters for GET requests
 * 
 * @param {Object} params - Query parameters object
 * @returns {string} URL-encoded query string
 * @description
 * Filters out null, undefined, and empty string values before encoding
 */
export const buildQueryString = (params) => {
  const filtered = Object.entries(params || {})
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  return new URLSearchParams(filtered).toString();
};

/**
 * Generic GET request
 * 
 * @param {string} url - API endpoint path
 * @param {Object} [params={}] - Query parameters
 * @param {Object} [config={}] - Axios request configuration
 * @returns {Promise<any>} Response data
 */
export const get = async (url, params = {}, config = {}) => {
  try {
    const queryString = buildQueryString(params);
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    const response = await apiClient.get(fullUrl, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Generic POST request
 * 
 * @param {string} url - API endpoint path
 * @param {Object} [data={}] - Request body data
 * @param {Object} [config={}] - Axios request configuration
 * @returns {Promise<any>} Response data
 */
export const post = async (url, data = {}, config = {}) => {
  try {
    const response = await apiClient.post(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Generic PUT request
 * 
 * @param {string} url - API endpoint path
 * @param {Object} [data={}] - Request body data
 * @param {Object} [config={}] - Axios request configuration
 * @returns {Promise<any>} Response data
 */
export const put = async (url, data = {}, config = {}) => {
  try {
    const response = await apiClient.put(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Generic PATCH request
 * 
 * @param {string} url - API endpoint path
 * @param {Object} [data={}] - Request body data
 * @param {Object} [config={}] - Axios request configuration
 * @returns {Promise<any>} Response data
 */
export const patch = async (url, data = {}, config = {}) => {
  try {
    const response = await apiClient.patch(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Generic DELETE request
 * 
 * @param {string} url - API endpoint path
 * @param {Object} [config={}] - Axios request configuration
 * @returns {Promise<any>} Response data
 */
export const del = async (url, config = {}) => {
  try {
    const response = await apiClient.delete(url, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Upload file with progress tracking
 * 
 * @param {string} url - Upload endpoint path
 * @param {FormData} formData - FormData object containing file and metadata
 * @param {Function} [onProgress] - Callback function for upload progress (0-100)
 * @returns {Promise<any>} Response data with uploaded file details
 */
export const uploadFile = async (url, formData, onProgress) => {
  try {
    const response = await apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Download file from server
 * 
 * @param {string} url - Download endpoint path
 * @param {string} [filename='download'] - Downloaded file name
 * @returns {Promise<boolean>} True if download successful
 * @description
 * Creates a temporary blob URL and triggers browser download dialog
 */
export const downloadFile = async (url, filename) => {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    // Create blob link to download
    const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = urlBlob;
    link.setAttribute('download', filename || 'download');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(urlBlob);

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Batch multiple requests with Promise.all
 * 
 * @param {Promise[]} requests - Array of request promises
 * @returns {Promise<any[]>} Array of response data
 * @throws {Error} If any request fails, all pending requests are rejected
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Batch requests with Promise.all
 */
export const batchRequests = async (requests) => {
  try {
    return await Promise.all(requests);
  } catch (error) {
    console.error('Batch request failed:', error);
    throw error;
  }
};

/**
 * Retry failed request with exponential backoff
 * @param {Function} requestFn - Function that returns a Promise
 * @param {number} [maxRetries] - Maximum number of retry attempts
 * @param {number} [delay] - Initial delay between retries in milliseconds
 * @returns {Promise} Result of successful request
 * @throws {Error} Last error if all retries fail
 */
export const retryRequest = async (
  requestFn,
  maxRetries = API_RETRY_ATTEMPTS,
  delay = API_RETRY_DELAY
) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const backoffDelay = delay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
};

export default apiClient;
