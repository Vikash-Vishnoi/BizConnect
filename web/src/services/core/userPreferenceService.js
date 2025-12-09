import { get, put, post } from '../api';

/**
 * ⚙️ User Preferences Service
 * Handles user preferences, opt-in/out, and consent management
 */

/**
 * Get user preferences list
 */
export const getUserPreferences = async (params = {}) => {
  return await get('/user-preferences', params);
};

/**
 * Get user preference by phone number
 */
export const getUserPreference = async (phoneNumber) => {
  return await get(`/user-preferences/${phoneNumber}`);
};

/**
 * Update user preference
 */
export const updateUserPreference = async (phoneNumber, updates) => {
  return await put(`/user-preferences/${phoneNumber}`, updates);
};

/**
 * Opt in user
 */
export const optInUser = async (phoneNumber, source = 'MANUAL') => {
  return await post(`/user-preferences/${phoneNumber}/opt-in`, { source });
};

/**
 * Opt out user
 */
export const optOutUser = async (phoneNumber, reason) => {
  return await post(`/user-preferences/${phoneNumber}/opt-out`, { reason });
};

/**
 * Get opted-in users
 */
export const getOptedInUsers = async () => {
  return await get('/user-preferences/opted-in');
};

/**
 * Get opted-out users
 */
export const getOptedOutUsers = async () => {
  return await get('/user-preferences/opted-out');
};

/**
 * Get user preference statistics
 */
export const getPreferenceStats = async () => {
  return await get('/user-preferences/stats');
};

/**
 * Block user
 */
export const blockUser = async (phoneNumber, reason) => {
  return await post(`/user-preferences/${phoneNumber}/block`, { reason });
};

/**
 * Unblock user
 */
export const unblockUser = async (phoneNumber) => {
  return await post(`/user-preferences/${phoneNumber}/unblock`);
};

