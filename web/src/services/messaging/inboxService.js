/**
 * 💬 Inbox & Conversation Service
 * Handles all inbox and messaging-related API calls
 */

import { get, post, put, del } from '../api';

/**
 * Get inbox conversations
 */
export const getConversations = async (params) => {
  return await get('/conversations', params);
};

/**
 * Get inbox statistics
 */
export const getInboxStats = async () => {
  return await get('/conversations/stats');
};

/**
 * Get conversation by ID
 */
export const getConversationById = async (id) => {
  return await get(`/conversations/${id}`);
};

/**
 * Get conversation profile history
 */
export const getProfileHistory = async (id) => {
  return await get(`/conversations/${id}/profile-history`);
};

/**
 * Mark conversation as read
 */
export const markAsRead = async (id) => {
  return await post(`/conversations/${id}/read`);
};

/**
 * Update conversation status
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

/**
 * Get messages for conversation
 */
export const getMessages = async (id, params) => {
  return await get(`/conversations/${id}/messages`, params);
};

/**
 * Send text message
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
 * Extend messaging window
 */
export const extendWindow = async (id) => {
  return await post(`/conversations/${id}/extend-window`);
};

