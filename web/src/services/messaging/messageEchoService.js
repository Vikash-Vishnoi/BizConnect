import { get, put } from '../api';

/**
 * 🔄 Message Echo Service
 * Handles message echoes (messages sent from other channels)
 */

/**
 * Get message echoes
 */
export const getMessageEchoes = async (params = {}) => {
  return await get('/message-echoes', params);
};

/**
 * Get message echoes for a conversation
 */
export const getConversationEchoes = async (conversationId, limit = 50) => {
  return await get(`/message-echoes/conversation/${conversationId}`, { limit });
};

/**
 * Get unprocessed message echoes
 */
export const getUnprocessedEchoes = async (limit = 100) => {
  return await get('/message-echoes/unprocessed', { limit });
};

/**
 * Mark message echo as processed
 */
export const markEchoProcessed = async (id) => {
  return await put(`/message-echoes/${id}/mark-processed`);
};

/**
 * Get message echo statistics
 */
export const getEchoStats = async () => {
  return await get('/message-echoes/stats');
};

