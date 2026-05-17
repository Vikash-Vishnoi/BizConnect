/**
 * ⚙️ User Preferences Service
 * 
 * Manages user communication preferences, opt-in/opt-out status, and consent tracking.
 * Provides GDPR-compliant consent management and user blocking capabilities.
 * 
 * @module services/core/userPreferenceService
 * 
 * @description
 * This service handles all operations related to user preferences and consent management,
 * including opt-in/out tracking, user blocking, preference updates, and statistics retrieval.
 * 
 * @features
 * - User preference management (get, update, list)
 * - Opt-in/opt-out consent tracking with source attribution
 * - User blocking and unblocking
 * - Preference statistics and reporting
 * - GDPR compliance support
 * - Bulk preference retrieval with filtering
 * 
 * @api
 * Base Path: /user-preferences
 * - GET    / - List all preferences with optional filters
 * - GET    /:phoneNumber - Get specific user preference
 * - PUT    /:phoneNumber - Update user preference
 * - POST   /:phoneNumber/opt-in - Opt-in user with source tracking
 * - POST   /:phoneNumber/opt-out - Opt-out user with reason
 * - GET    /opted-in - List opted-in users
 * - GET    /opted-out - List opted-out users
 * - GET    /stats - Get preference statistics
 * - POST   /:phoneNumber/block - Block user with reason
 * - POST   /:phoneNumber/unblock - Unblock user
 * 
 * @example
 * // Opt-in user with source tracking
 * await optInUser('+1234567890', 'WEBSITE_FORM');
 * 
 * // Get opted-in users
 * const optedInUsers = await getOptedInUsers();
 * 
 * // Block user with reason
 * await blockUser('+1234567890', 'Spam reports');
 */

import { get, put, post } from '../api';

/**
 * Get user preferences list with optional filters
 * 
 * @param {Object} [params={}] - Query parameters for filtering
 * @param {string} [params.status] - Filter by status (opted-in, opted-out, blocked)
 * @param {string} [params.source] - Filter by opt-in source
 * @param {number} [params.page] - Page number for pagination
 * @param {number} [params.limit] - Items per page
 * @returns {Promise<Object>} User preferences list with pagination metadata
 */
export const getUserPreferences = async (params = {}) => {
  return await get('/user-preferences', params);
};

/**
 * Get user preference by phone number
 * 
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @returns {Promise<Object>} User preference details including opt-in status and history
 */
export const getUserPreference = async (phoneNumber) => {
  return await get(`/user-preferences/${phoneNumber}`);
};

/**
 * Update user preference settings
 * 
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {Object} updates - Preference updates
 * @param {boolean} [updates.notificationsEnabled] - Enable/disable notifications
 * @param {string[]} [updates.preferredChannels] - Preferred communication channels
 * @param {Object} [updates.metadata] - Custom metadata
 * @returns {Promise<Object>} Updated preference object
 */
export const updateUserPreference = async (phoneNumber, updates) => {
  return await put(`/user-preferences/${phoneNumber}`, updates);
};

/**
 * Opt-in user for communications with source tracking
 * 
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {string} [source='MANUAL'] - Opt-in source (MANUAL, WEBSITE_FORM, API, QR_CODE, KEYWORD)
 * @returns {Promise<Object>} Updated preference with opt-in timestamp
 */
export const optInUser = async (phoneNumber, source = 'MANUAL') => {
  return await post(`/user-preferences/${phoneNumber}/opt-in`, { source });
};

/**
 * Opt-out user from communications with reason tracking
 * 
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {string} reason - Reason for opt-out (user_request, spam_report, invalid_number)
 * @returns {Promise<Object>} Updated preference with opt-out timestamp
 */
export const optOutUser = async (phoneNumber, reason) => {
  return await post(`/user-preferences/${phoneNumber}/opt-out`, { reason });
};

/**
 * Get list of all opted-in users
 * 
 * @returns {Promise<Object[]>} Array of opted-in user preferences
 */
export const getOptedInUsers = async () => {
  return await get('/user-preferences/opted-in');
};

/**
 * Get list of all opted-out users
 * 
 * @returns {Promise<Object[]>} Array of opted-out user preferences
 */
export const getOptedOutUsers = async () => {
  return await get('/user-preferences/opted-out');
};

/**
 * Get user preference statistics and metrics
 * 
 * @returns {Promise<Object>} Statistics including total, opted-in, opted-out, and blocked counts
 */
export const getPreferenceStats = async () => {
  return await get('/user-preferences/stats');
};

/**
 * Block user from all communications
 * 
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {string} reason - Reason for blocking (spam, abuse, invalid_number)
 * @returns {Promise<Object>} Updated preference with blocked status
 */
export const blockUser = async (phoneNumber, reason) => {
  return await post(`/user-preferences/${phoneNumber}/block`, { reason });
};

/**
 * Unblock previously blocked user
 * 
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {Promise<Object>} Updated preference with unblocked status
 */
export const unblockUser = async (phoneNumber) => {
  return await post(`/user-preferences/${phoneNumber}/unblock`);
};

