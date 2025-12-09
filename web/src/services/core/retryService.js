/**
 * 🔄 Message Retry Service (P1 Feature)
 * Handles message retry operations
 */

import { get, post } from '../api';

/**
 * Retry a single failed message
 */
export const retryMessage = async (messageId) => {
  return await post(`/messages/${messageId}/retry`);
};

/**
 * Bulk retry multiple messages
 */
export const bulkRetryMessages = async (messageIds) => {
  return await post('/messages/retry/bulk', { messageIds });
};

/**
 * Get retry history for a message
 */
export const getRetryHistory = async (messageId) => {
  return await get(`/messages/${messageId}/retry/history`);
};

/**
 * Get all failed messages
 */
export const getFailedMessages = async (params = {}) => {
  return await get('/messages/failed', params);
};

/**
 * Get retry statistics
 */
export const getRetryStats = async (params = {}) => {
  return await get('/messages/retry/stats', params);
};

