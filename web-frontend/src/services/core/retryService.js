/**
 * @module services/core/retryService
 * @description Message retry service for handling failed message recovery and retry operations
 * 
 * @features
 * - Single message retry
 * - Bulk message retry
 * - Retry history tracking
 * - Failed message queries
 * - Retry statistics and analytics
 * 
 * @api
 * - POST /messages/:id/retry - Retry a single failed message
 * - POST /messages/retry/bulk - Retry multiple messages at once
 * - GET /messages/:id/retry/history - Get retry attempt history
 * - GET /messages/failed - Query failed messages with filters
 * - GET /messages/retry/stats - Get retry statistics
 * 
 * @example
 * // Retry a single message
 * await retryMessage('message-id-123');
 * 
 * // Bulk retry
 * await bulkRetryMessages(['msg-1', 'msg-2', 'msg-3']);
 * 
 * // Get failed messages
 * const failed = await getFailedMessages({ 
 *   errorType: 'NETWORK_ERROR', 
 *   page: 1, 
 *   limit: 20 
 * });
 */

import { get, post } from '../api';

/**
 * Retry a single failed message
 * @param {string} messageId - ID of the message to retry
 * @returns {Promise<Object>} Retry response with status
 */
export const retryMessage = async (messageId) => {
  return await post(`/messages/${messageId}/retry`);
};

/**
 * Bulk retry multiple messages at once
 * @param {string[]} messageIds - Array of message IDs to retry
 * @returns {Promise<Object>} Bulk retry response with success count
 */
export const bulkRetryMessages = async (messageIds) => {
  return await post('/messages/retry/bulk', { messageIds });
};

/**
 * Get retry history for a specific message
 * @param {string} messageId - ID of the message
 * @returns {Promise<Object>} Retry history with attempt timestamps and results
 */
export const getRetryHistory = async (messageId) => {
  return await get(`/messages/${messageId}/retry/history`);
};

/**
 * Get all failed messages with optional filters
 * @param {Object} [params={}] - Query parameters
 * @param {string} [params.errorType] - Filter by error type
 * @param {number} [params.page] - Page number for pagination
 * @param {number} [params.limit] - Results per page
 * @returns {Promise<Object>} Failed messages with pagination info
 */
export const getFailedMessages = async (params = {}) => {
  return await get('/messages/failed', params);
};

/**
 * Get retry statistics and metrics
 * @param {Object} [params={}] - Query parameters
 * @param {string} [params.startDate] - Start date for stats
 * @param {string} [params.endDate] - End date for stats
 * @returns {Promise<Object>} Retry statistics (total retries, success rate, etc.)
 */
export const getRetryStats = async (params = {}) => {
  return await get('/messages/retry/stats', params);
};

