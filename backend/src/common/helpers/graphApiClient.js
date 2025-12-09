const axios = require('axios');

const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const MAX_RETRIES = parseInt(process.env.API_MAX_RETRIES) || 3;
const RETRY_DELAY = parseInt(process.env.API_RETRY_DELAY) || 1000;
 
/**
 * Make a request to WhatsApp Graph API with retry logic
 * @param {string} endpoint - API endpoint (e.g., '/{waba-id}/conversation_analytics')
 * @param {object} params - Query parameters
 * @param {string} accessToken - WhatsApp Business API access token
 * @returns {Promise<object>} API response data
 */
const makeGraphAPIRequest = async (endpoint, params = {}, accessToken) => {
  if (!accessToken) {
    throw new Error('Access token is required for Graph API requests');
  }

  const url = `${GRAPH_API_BASE}${endpoint}`;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`📡 Graph API Request (Attempt ${attempt}/${MAX_RETRIES}):`, url);
      
      const response = await axios.get(url, {
        params,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: parseInt(process.env.GRAPH_API_TIMEOUT) || 30000
      });

      console.log('✅ Graph API Request successful');
      return response.data;

    } catch (error) {
      lastError = error;

      // Handle rate limiting (error code 4 or 17)
      if (error.response?.data?.error?.code === 4 || error.response?.data?.error?.code === 17) {
        console.warn(`⚠️  Rate limit hit, retrying in ${RETRY_DELAY * attempt}ms...`);
        await sleep(RETRY_DELAY * attempt);
        continue;
      }

      // Handle temporary errors (5xx)
      if (error.response?.status >= 500) {
        console.warn(`⚠️  Server error (${error.response.status}), retrying...`);
        await sleep(RETRY_DELAY * attempt);
        continue;
      }

      // For other errors, don't retry
      break;
    }
  }

  // All retries failed
  console.error('❌ Graph API Request failed:', lastError.message);
  
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
const getConversationAnalytics = async (wabaId, options, accessToken) => {
  const { start, end, granularity, phoneNumbers, conversationTypes, conversationDirections, conversationCategories } = options;

  const params = {
    start,
    end,
    granularity: granularity || 'DAILY'
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

  return await makeGraphAPIRequest(`/${wabaId}/conversation_analytics`, params, accessToken);
};

/**
 * Get message analytics from WhatsApp Graph API
 * @param {string} wabaId - WhatsApp Business Account ID
 * @param {object} options - Analytics options
 * @returns {Promise<object>} Message analytics data
 */
const getMessageAnalytics = async (wabaId, options, accessToken) => {
  const { start, end, granularity, phoneNumbers, messageTypes } = options;

  const params = {
    start,
    end,
    granularity: granularity || 'DAILY'
  };

  if (phoneNumbers && phoneNumbers.length > 0) {
    params.phone_numbers = JSON.stringify(phoneNumbers);
  }

  if (messageTypes && messageTypes.length > 0) {
    params.message_types = JSON.stringify(messageTypes);
  }

  return await makeGraphAPIRequest(`/${wabaId}/message_analytics`, params, accessToken);
};

/**
 * Sleep helper for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  makeGraphAPIRequest,
  getConversationAnalytics,
  getMessageAnalytics
};
