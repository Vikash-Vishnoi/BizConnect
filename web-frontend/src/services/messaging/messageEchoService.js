/**
 * 🔄 Message Echo Service
 * 
 * Handles message echoes (messages sent from other channels like web WhatsApp).
 * Tracks messages that originate from sources other than this application.
 * Essential for multi-channel message tracking and preventing duplicate sends.
 * 
 * @module messageEchoService
 */

import { get, put } from '../api';

/**
 * Default pagination limit for echo queries
 */
const DEFAULT_ECHO_LIMIT = 50;
const MAX_ECHO_LIMIT = 100;

/**
 * Get message echoes with optional filtering
 * 
 * @async
 * @param {Object} [params={}] - Query parameters
 * @param {number} [params.limit] - Number of echoes to retrieve
 * @param {number} [params.offset] - Pagination offset
 * @param {string} [params.conversationId] - Filter by conversation
 * @param {boolean} [params.processed] - Filter by processed status
 * @returns {Promise<Object>} Paginated list of message echoes
 * @throws {Error} If API request fails
 * 
 * @example
 * const echoes = await getMessageEchoes({ limit: 20, processed: false });
 */
export const getMessageEchoes = async (params = {}) => {
  return await get('/message-echoes', params);
};

/**
 * Get message echoes for a specific conversation
 * 
 * @async
 * @param {string} conversationId - Conversation ID
 * @param {number} [limit=50] - Number of echoes to retrieve
 * @returns {Promise<Array>} List of message echoes for conversation
 * @throws {Error} If conversationId is invalid or request fails
 * 
 * @example
 * const echoes = await getConversationEchoes('conv_123', 25);
 */
export const getConversationEchoes = async (conversationId, limit = DEFAULT_ECHO_LIMIT) => {
  return await get(`/message-echoes/conversation/${conversationId}`, { limit });
};

/**
 * Get unprocessed message echoes for processing queue
 * 
 * @async
 * @param {number} [limit=100] - Number of unprocessed echoes to retrieve
 * @returns {Promise<Array>} List of unprocessed message echoes
 * @throws {Error} If request fails
 * 
 * @example
 * const pending = await getUnprocessedEchoes(50);
 * // Process each echo...
 * await Promise.all(pending.map(echo => markEchoProcessed(echo.id)));
 */
export const getUnprocessedEchoes = async (limit = MAX_ECHO_LIMIT) => {
  return await get('/message-echoes/unprocessed', { limit });
};

/**
 * Mark message echo as processed
 * 
 * @async
 * @param {string} id - Message echo ID
 * @returns {Promise<Object>} Updated message echo
 * @throws {Error} If echo not found or request fails
 * 
 * @example
 * await markEchoProcessed('echo_123');
 */
export const markEchoProcessed = async (id) => {
  return await put(`/message-echoes/${id}/mark-processed`);
};

/**
 * Get message echo statistics and metrics
 * 
 * @async
 * @returns {Promise<Object>} Echo statistics
 * @returns {number} return.total - Total number of echoes
 * @returns {number} return.processed - Number of processed echoes
 * @returns {number} return.unprocessed - Number of unprocessed echoes
 * @returns {number} return.todayCount - Echoes received today
 * @throws {Error} If request fails
 * 
 * @example
 * const stats = await getEchoStats();
 * console.log(`${stats.unprocessed} echoes pending processing`);
 */
export const getEchoStats = async () => {
  return await get('/message-echoes/stats');
};

// Default export for consistency with other services
export default {
  getMessageEchoes,
  getConversationEchoes,
  getUnprocessedEchoes,
  markEchoProcessed,
  getEchoStats
};

