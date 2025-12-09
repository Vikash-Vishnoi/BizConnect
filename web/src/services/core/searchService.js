/**
 * 🔍 Search Service
 * Handles search functionality
 */

import { get } from '../api';

/**
 * Search messages
 */
export const searchMessages = async (params) => {
  return await get('/search/messages', params);
};

/**
 * Search conversations
 */
export const searchConversations = async (params) => {
  return await get('/search/conversations', params);
};

/**
 * Combined search
 */
export const combinedSearch = async (params) => {
  return await get('/search/combined', params);
};

