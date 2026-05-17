/**
 * 💬 Inbox & Conversation Service
 * Handles all inbox and messaging-related API calls
 * Supports real-time messaging, conversation management, and WhatsApp features
 * 
 * @module services/messaging/inboxService
 */

import { get, post, put, del } from '../api';

// ============================================
// Conversation Management
// ============================================

/**
 * Get inbox conversations with filters and pagination
 * @param {Object} [params] - Query parameters
 * @param {string} [params.status] - Filter by status (open, closed, pending)
 * @param {boolean} [params.unreadOnly] - Show only unread conversations
 * @param {string} [params.search] - Search by contact name or phone
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Items per page
 * @returns {Promise<Object>} Paginated conversations list
 */
export const getConversations = async (params) => {
  return await get('/conversations', params);
};

/**
 * Get inbox statistics overview
 * @returns {Promise<Object>} Stats (total, unread, open, closed)
 */
export const getInboxStats = async () => {
  return await get('/conversations/stats');
};

/**
 * Get conversation details by ID
 * @param {string} id - Conversation ID
 * @returns {Promise<Object>} Full conversation details with contact info
 */
export const getConversationById = async (id) => {
  return await get(`/conversations/${id}`);
};

/**
 * Get conversation profile history (name/photo changes)
 * @param {string} id - Conversation ID
 * @returns {Promise<Array>} Profile change history
 */
export const getProfileHistory = async (id) => {
  return await get(`/conversations/${id}/profile-history`);
};

/**
 * Mark conversation as read
 * @param {string} id - Conversation ID
 * @returns {Promise<Object>} Update confirmation
 */
export const markAsRead = async (id) => {
  return await post(`/conversations/${id}/read`);
};

/**
 * Update conversation status (open, closed, pending)
 * @param {string} id - Conversation ID
 * @param {string} status - New status value
 * @returns {Promise<Object>} Updated conversation
 */
export const updateConversationStatus = async (id, status) => {
  return await post(`/conversations/${id}/status`, { status });
};

/**
 * Block conversation
 */
export const blockConversation = async (id) => {
  return await post(`/conversations/${id}/block`);
};

/**
 * Unblock conversation
 */
export const unblockConversation = async (id) => {
  return await post(`/conversations/${id}/unblock`);
};

// ============================================
// Messaging
// ============================================

/**
 * Get messages for conversation with pagination
 * @param {string} id - Conversation ID
 * @param {Object} [params] - Query parameters (before, after, limit)
 * @returns {Promise<Object>} Paginated messages list
 */
export const getMessages = async (id, params) => {
  return await get(`/conversations/${id}/messages`, params);
};

/**
 * Send text message
 * @param {string} id - Conversation ID
 * @param {Object} data - Message data
 * @param {string} data.text - Message text content
 * @param {string} [data.previewUrl] - Enable link preview
 * @returns {Promise<Object>} Sent message details
 */
export const sendMessage = async (id, data) => {
  return await post(`/conversations/${id}/messages`, data);
};

/**
 * Send audio message
 */
export const sendAudioMessage = async (id, audioId) => {
  return await post(`/conversations/${id}/messages/audio`, { audioId });
};

/**
 * Send contact card
 */
export const sendContactCard = async (id, contacts) => {
  return await post(`/conversations/${id}/messages/contact`, { contacts });
};

/**
 * Send location
 */
export const sendLocation = async (id, data) => {
  return await post(`/conversations/${id}/messages/location`, data);
};

/**
 * Reply to message
 */
export const replyToMessage = async (id, messageId, text) => {
  return await post(`/conversations/${id}/messages/reply`, { messageId, text });
};

/**
 * Add reaction to message
 */
export const addReaction = async (id, messageId, emoji) => {
  return await post(`/conversations/${id}/messages/reaction`, { messageId, emoji });
};

/**
 * Send button message
 */
export const sendButtonMessage = async (id, data) => {
  return await post(`/conversations/${id}/messages/button`, data);
};

/**
 * Send list message
 */
export const sendListMessage = async (id, data) => {
  return await post(`/conversations/${id}/messages/list`, data);
};

/**
 * Send CTA URL button
 */
export const sendCTAButton = async (id, data) => {
  return await post(`/conversations/${id}/messages/cta`, data);
};

/**
 * Get messaging window status
 */
export const getWindowStatus = async (id) => {
  return await get(`/conversations/${id}/window-status`);
};

/**
 * Extend messaging window (24-hour window)
 * @param {string} id - Conversation ID
 * @returns {Promise<Object>} Updated window status
 */
export const extendWindow = async (id) => {
  return await post(`/conversations/${id}/extend-window`);
};

/**
 * Archive conversation
 * @param {string} id - Conversation ID
 * @returns {Promise<Object>} Archive confirmation
 */
export const archiveConversation = async (id) => {
  return await post(`/conversations/${id}/archive`);
};

/**
 * Unarchive conversation
 * @param {string} id - Conversation ID
 * @returns {Promise<Object>} Unarchive confirmation
 */
export const unarchiveConversation = async (id) => {
  return await post(`/conversations/${id}/unarchive`);
};

/**
 * Assign conversation to team member
 * @param {string} id - Conversation ID
 * @param {string} userId - User ID to assign to
 * @returns {Promise<Object>} Assignment confirmation
 */
export const assignConversation = async (id, userId) => {
  return await post(`/conversations/${id}/assign`, { userId });
};

/**
 * Add note to conversation
 * @param {string} id - Conversation ID
 * @param {string} note - Note content
 * @returns {Promise<Object>} Created note
 */
export const addNote = async (id, note) => {
  return await post(`/conversations/${id}/notes`, { note });
};

/**
 * Get conversation notes
 * @param {string} id - Conversation ID
 * @returns {Promise<Array>} List of notes
 */
export const getNotes = async (id) => {
  return await get(`/conversations/${id}/notes`);
};

// Default export with all inbox service methods
export default {
  // Conversation management
  getConversations,
  getInboxStats,
  getConversationById,
  getProfileHistory,
  markAsRead,
  updateConversationStatus,
  blockConversation,
  unblockConversation,
  archiveConversation,
  unarchiveConversation,
  assignConversation,
  addNote,
  getNotes,
  
  // Messaging
  getMessages,
  sendMessage,
  sendAudioMessage,
  sendContactCard,
  sendLocation,
  replyToMessage,
  addReaction,
  sendButtonMessage,
  sendListMessage,
  sendCTAButton,
  
  // Window management
  getWindowStatus,
  extendWindow,
};

