/**
 * 💬 Inbox & Conversation Service
 * Handles all inbox and messaging-related API calls
 */

import { get, post, put, del } from '../api';

/**
 * Get inbox conversations
 */
export const getConversations = async (params) => {
  return await get('/inbox', params);
};

/**
 * Get inbox statistics
 */
export const getInboxStats = async () => {
  return await get('/inbox/stats');
};

/**
 * Get conversation by ID
 */
export const getConversationById = async (id) => {
  return await get(`/inbox/${id}`);
};

/**
 * Get conversation profile history
 */
export const getProfileHistory = async (id) => {
  return await get(`/inbox/${id}/profile-history`);
};

/**
 * Mark conversation as read
 */
export const markAsRead = async (id) => {
  return await post(`/inbox/${id}/read`);
};

/**
 * Update conversation status
 */
export const updateConversationStatus = async (id, status) => {
  return await post(`/inbox/${id}/status`, { status });
};

/**
 * Block conversation
 */
export const blockConversation = async (id) => {
  return await post(`/inbox/${id}/block`);
};

/**
 * Unblock conversation
 */
export const unblockConversation = async (id) => {
  return await post(`/inbox/${id}/unblock`);
};

/**
 * Get messages for conversation
 */
export const getMessages = async (id, params) => {
  return await get(`/inbox/${id}/messages`, params);
};

/**
 * Send text message
 */
export const sendMessage = async (id, data) => {
  return await post(`/inbox/${id}/messages`, data);
};

/**
 * Send audio message
 */
export const sendAudioMessage = async (id, audioId) => {
  return await post(`/inbox/${id}/messages/audio`, { audioId });
};

/**
 * Send contact card
 */
export const sendContactCard = async (id, contacts) => {
  return await post(`/inbox/${id}/messages/contact`, { contacts });
};

/**
 * Send location
 */
export const sendLocation = async (id, data) => {
  return await post(`/inbox/${id}/messages/location`, data);
};

/**
 * Reply to message
 */
export const replyToMessage = async (id, messageId, text) => {
  return await post(`/inbox/${id}/messages/reply`, { messageId, text });
};

/**
 * Add reaction to message
 */
export const addReaction = async (id, messageId, emoji) => {
  return await post(`/inbox/${id}/messages/reaction`, { messageId, emoji });
};

/**
 * Send button message
 */
export const sendButtonMessage = async (id, data) => {
  return await post(`/inbox/${id}/messages/button`, data);
};

/**
 * Send list message
 */
export const sendListMessage = async (id, data) => {
  return await post(`/inbox/${id}/messages/list`, data);
};

/**
 * Send CTA URL button
 */
export const sendCTAButton = async (id, data) => {
  return await post(`/inbox/${id}/messages/cta`, data);
};

/**
 * Get messaging window status
 */
export const getWindowStatus = async (id) => {
  return await get(`/inbox/${id}/window-status`);
};

/**
 * Extend messaging window
 */
export const extendWindow = async (id) => {
  return await post(`/inbox/${id}/extend-window`);
};

