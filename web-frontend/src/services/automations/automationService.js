/**
 * 🤖 Automation Service
 * Handles automation rules, saved replies, and scheduled messages
 * 
 * @module services/automations/automationService
 */

import { get, post, put, del, patch } from '../api';

// ============================================
// Automation Rules
// ============================================

/**
 * Get automation rules
 * @param {Object} [params] - Query parameters
 * @returns {Promise<Object>} Automation rules list
 */
export const getAutomations = async (params) => {
  return await get('/automations', params);
};

/**
 * Get automation by ID
 * @param {string} id - Automation ID
 * @returns {Promise<Object>} Automation details
 */
export const getAutomationById = async (id) => {
  return await get(`/automations/${id}`);
};

/**
 * Create automation rule
 * @param {Object} data - Automation data (trigger, conditions, actions)
 * @returns {Promise<Object>} Created automation
 */
export const createAutomation = async (data) => {
  return await post('/automations', data);
};

/**
 * Update automation rule
 * @param {string} id - Automation ID
 * @param {Object} data - Updated automation data
 * @returns {Promise<Object>} Updated automation
 */
export const updateAutomation = async (id, data) => {
  return await put(`/automations/${id}`, data);
};

/**
 * Delete automation rule
 * @param {string} id - Automation ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteAutomation = async (id) => {
  return await del(`/automations/${id}`);
};

/**
 * Toggle automation status (enable/disable)
 * @param {string} id - Automation ID
 * @returns {Promise<Object>} Updated automation with new status
 */
export const toggleAutomation = async (id) => {
  return await patch(`/automations/${id}/toggle`);
};

/**
 * Get automation execution logs
 * @param {string} id - Automation ID
 * @param {Object} [params] - Query parameters
 * @returns {Promise<Object>} Automation logs
 */
export const getAutomationLogs = async (id, params) => {
  return await get(`/automations/${id}/logs`, params);
};

/**
 * Get automation statistics
 * @returns {Promise<Object>} Overview statistics for all automations
 */
export const getAutomationStats = async () => {
  return await get('/automations/stats/overview');
};

// ============================================
// Saved Replies
// ============================================

/**
 * Get saved replies
 * @param {Object} [params] - Query parameters
 * @returns {Promise<Object>} Saved replies list
 */
export const getSavedReplies = async (params) => {
  return await get('/saved-replies', params);
};

/**
 * Get saved reply by ID
 * @param {string} id - Saved reply ID
 * @returns {Promise<Object>} Saved reply details
 */
export const getSavedReplyById = async (id) => {
  return await get(`/saved-replies/${id}`);
};

/**
 * Create saved reply
 * @param {Object} data - Saved reply data (title, content, category)
 * @returns {Promise<Object>} Created saved reply
 */
export const createSavedReply = async (data) => {
  return await post('/saved-replies', data);
};

/**
 * Update saved reply
 * @param {string} id - Saved reply ID
 * @param {Object} data - Updated saved reply data
 * @returns {Promise<Object>} Updated saved reply
 */
export const updateSavedReply = async (id, data) => {
  return await put(`/saved-replies/${id}`, data);
};

/**
 * Delete saved reply
 * @param {string} id - Saved reply ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteSavedReply = async (id) => {
  return await del(`/saved-replies/${id}`);
};

/**
 * Track saved reply usage
 * @param {string} id - Saved reply ID
 * @returns {Promise<Object>} Usage tracking confirmation
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
  return await get('/scheduled', params);
};

/**
 * Get scheduled message by ID
 */
export const getScheduledMessageById = async (id) => {
  return await get(`/scheduled/${id}`);
};

/**
 * Create scheduled message
 */
export const createScheduledMessage = async (data) => {
  return await post('/scheduled', data);
};

/**
 * Update scheduled message
 */
export const updateScheduledMessage = async (id, data) => {
  return await put(`/scheduled/${id}`, data);
};

/**
 * Cancel scheduled message
 */
export const cancelScheduledMessage = async (id) => {
  return await del(`/scheduled/${id}`);
};

/**
 * Get scheduled messages summary
 * @returns {Promise<Object>} Summary statistics for scheduled messages
 */
export const getScheduledMessagesSummary = async () => {
  return await get('/scheduled/stats/summary');
};

// Default export with all automation service methods
export default {
  // Automation rules
  getAutomations,
  getAutomationById,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  getAutomationLogs,
  getAutomationStats,
  
  // Saved replies
  getSavedReplies,
  getSavedReplyById,
  createSavedReply,
  updateSavedReply,
  deleteSavedReply,
  trackSavedReplyUsage,
  getPopularReplies,
  
  // Scheduled messages
  getScheduledMessages,
  getScheduledMessageById,
  createScheduledMessage,
  updateScheduledMessage,
  cancelScheduledMessage,
  getScheduledMessagesSummary,
};

