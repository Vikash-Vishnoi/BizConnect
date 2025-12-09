/**
 * 💾 Automation Service
 * Handles automation rules and saved replies
 */

import { get, post, put, del, patch } from '../api';

/**
 * Get automation rules
 */
export const getAutomations = async (params) => {
  return await get('/automations', params);
};

/**
 * Get automation by ID
 */
export const getAutomationById = async (id) => {
  return await get(`/automations/${id}`);
};

/**
 * Create automation rule
 */
export const createAutomation = async (data) => {
  return await post('/automations', data);
};

/**
 * Update automation rule
 */
export const updateAutomation = async (id, data) => {
  return await put(`/automations/${id}`, data);
};

/**
 * Delete automation rule
 */
export const deleteAutomation = async (id) => {
  return await del(`/automations/${id}`);
};

/**
 * Toggle automation status
 */
export const toggleAutomation = async (id) => {
  return await patch(`/automations/${id}/toggle`);
};

/**
 * Get automation logs
 */
export const getAutomationLogs = async (id, params) => {
  return await get(`/automations/${id}/logs`, params);
};

/**
 * Get automation statistics
 */
export const getAutomationStats = async () => {
  return await get('/automations/stats/overview');
};

/**
 * Get saved replies
 */
export const getSavedReplies = async (params) => {
  return await get('/saved-replies', params);
};

/**
 * Get saved reply by ID
 */
export const getSavedReplyById = async (id) => {
  return await get(`/saved-replies/${id}`);
};

/**
 * Create saved reply
 */
export const createSavedReply = async (data) => {
  return await post('/saved-replies', data);
};

/**
 * Update saved reply
 */
export const updateSavedReply = async (id, data) => {
  return await put(`/saved-replies/${id}`, data);
};

/**
 * Track saved reply usage
 */
export const trackSavedReplyUsage = async (id) => {
  return await post(`/saved-replies/${id}/use`);
};

/**
 * Get popular saved replies
 */
export const getPopularReplies = async (limit = 10) => {
  return await get('/saved-replies/stats/popular', { limit });
};

/**
 * Get scheduled messages
 */
export const getScheduledMessages = async (params) => {
  return await get('/scheduled-messages', params);
};

/**
 * Get scheduled message by ID
 */
export const getScheduledMessageById = async (id) => {
  return await get(`/scheduled-messages/${id}`);
};

/**
 * Create scheduled message
 */
export const createScheduledMessage = async (data) => {
  return await post('/scheduled-messages', data);
};

/**
 * Update scheduled message
 */
export const updateScheduledMessage = async (id, data) => {
  return await put(`/scheduled-messages/${id}`, data);
};

/**
 * Cancel scheduled message
 */
export const cancelScheduledMessage = async (id) => {
  return await del(`/scheduled-messages/${id}`);
};

/**
 * Get scheduled messages summary
 */
export const getScheduledMessagesSummary = async () => {
  return await get('/scheduled-messages/stats/summary');
};

