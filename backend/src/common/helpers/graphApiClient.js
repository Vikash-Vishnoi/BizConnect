/**
 * WhatsApp Graph API Client
 * Handles requests to WhatsApp Business API with retry logic and error handling
 * Supports multi-business context
 * 
 * @module common/helpers/graphApiClient
 */

const axios = require('axios');
const logger = require('./logger');
const config = require('../../config/server.config');

// Graph API configuration
const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Retry configuration
const RETRY_CONFIG = {
  MAX_RETRIES: parseInt(process.env.API_MAX_RETRIES, 10) || 3,
  RETRY_DELAY: parseInt(process.env.API_RETRY_DELAY, 10) || 1000,
  TIMEOUT: parseInt(process.env.GRAPH_API_TIMEOUT, 10) || 30000,
};

// Graph API error codes
const GRAPH_ERROR_CODES = {
  RATE_LIMIT: [4, 17, 32, 613],
  TEMPORARY: [1, 2],
  INVALID_TOKEN: [190],
  PERMISSION_DENIED: [10, 200, 299],
};

/**
 * Sleep helper for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
 
/**
 * Make a request to WhatsApp Graph API with retry logic
 * @param {string} endpoint - API endpoint (e.g., '/{waba-id}/conversation_analytics')
 * @param {object} params - Query parameters
 * @param {string} accessToken - WhatsApp Business API access token
 * @returns {Promise<object>} API response data
 */
const makeGraphAPIRequest = async (endpoint, params = {}, accessToken, businessId = null) => {
  if (!accessToken) {
    const error = new Error('Access token is required for Graph API requests');
    logger.error('Graph API request failed: missing access token', { endpoint, businessId });
    throw error;
  }

  const url = `${GRAPH_API_BASE}${endpoint}`;
  let lastError;

  for (let attempt = 1; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
    try {
      logger.debug(`Graph API Request (Attempt ${attempt}/${RETRY_CONFIG.MAX_RETRIES})`, { 
        url, 
        endpoint,
        businessId 
      });
      
      const response = await axios.get(url, {
        params,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: RETRY_CONFIG.TIMEOUT,
      });

      logger.debug('Graph API Request successful', { 
        endpoint, 
        status: response.status,
        businessId 
      });
      return response.data;

    } catch (error) {
      lastError = error;
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message;

      // Handle rate limiting
      if (GRAPH_ERROR_CODES.RATE_LIMIT.includes(errorCode)) {
        const retryDelay = RETRY_CONFIG.RETRY_DELAY * attempt;
        logger.warn(`Rate limit hit, retrying in ${retryDelay}ms`, { 
          endpoint, 
          attempt,
          businessId,
          errorCode 
        });
        await sleep(retryDelay);
        continue;
      }

      // Handle temporary errors (5xx or specific error codes)
      if (error.response?.status >= 500 || GRAPH_ERROR_CODES.TEMPORARY.includes(errorCode)) {
        const retryDelay = RETRY_CONFIG.RETRY_DELAY * attempt;
        logger.warn('Server error, retrying', { 
          endpoint, 
          status: error.response?.status,
          attempt,
          businessId,
          errorCode 
        });
        await sleep(retryDelay);
        continue;
      }

      // Handle authentication errors - don't retry
      if (GRAPH_ERROR_CODES.INVALID_TOKEN.includes(errorCode)) {
        logger.error('Graph API authentication failed', { 
          endpoint, 
          businessId,
          errorCode,
          errorMessage 
        });
        throw new Error(`Authentication failed: ${errorMessage || 'Invalid access token'}`);
      }

      // Handle permission errors - don't retry
      if (GRAPH_ERROR_CODES.PERMISSION_DENIED.includes(errorCode)) {
        logger.error('Graph API permission denied', { 
          endpoint, 
          businessId,
          errorCode,
          errorMessage 
        });
        throw new Error(`Permission denied: ${errorMessage || 'Insufficient permissions'}`);
      }

      // For other errors, don't retry
      break;
    }
  }

  // All retries failed
  logger.error('Graph API Request failed', { 
    endpoint, 
    error: lastError.message,
    attempts: RETRY_CONFIG.MAX_RETRIES,
    businessId 
  });
  
  if (lastError.response?.data) {
    throw new Error(lastError.response.data.error?.message || 'Graph API request failed');
  }
  
  throw lastError;
};

/**
 * Get conversation analytics from WhatsApp Graph API
 * @param {string} wabaId - WhatsApp Business Account ID
 * @param {object} options - Analytics options
 * @returns {Promise<object>} Conversation analytics data
 */
const getConversationAnalytics = async (wabaId, options, accessToken, businessId = null) => {
  const { 
    start, 
    end, 
    granularity, 
    phoneNumbers, 
    conversationTypes, 
    conversationDirections, 
    conversationCategories 
  } = options;

  const params = {
    start,
    end,
    granularity: granularity || 'DAILY',
  };

  if (phoneNumbers && phoneNumbers.length > 0) {
    params.phone_numbers = JSON.stringify(phoneNumbers);
  }

  if (conversationTypes && conversationTypes.length > 0) {
    params.conversation_types = JSON.stringify(conversationTypes);
  }

  if (conversationDirections && conversationDirections.length > 0) {
    params.conversation_directions = JSON.stringify(conversationDirections);
  }

  if (conversationCategories && conversationCategories.length > 0) {
    params.conversation_categories = JSON.stringify(conversationCategories);
  }

  return await makeGraphAPIRequest(`/${wabaId}/conversation_analytics`, params, accessToken, businessId);
};

/**
 * Get message analytics from WhatsApp Graph API
 * @param {string} wabaId - WhatsApp Business Account ID
 * @param {object} options - Analytics options
 * @returns {Promise<object>} Message analytics data
 */
const getMessageAnalytics = async (wabaId, options, accessToken, businessId = null) => {
  const { start, end, granularity, phoneNumbers, messageTypes } = options;

  const params = {
    start,
    end,
    granularity: granularity || 'DAILY',
  };

  if (phoneNumbers && phoneNumbers.length > 0) {
    params.phone_numbers = JSON.stringify(phoneNumbers);
  }

  if (messageTypes && messageTypes.length > 0) {
    params.message_types = JSON.stringify(messageTypes);
  }

  return await makeGraphAPIRequest(`/${wabaId}/message_analytics`, params, accessToken, businessId);
};

module.exports = {
  makeGraphAPIRequest,
  getConversationAnalytics,
  getMessageAnalytics,
  GRAPH_API_BASE,
  GRAPH_API_VERSION,
};
