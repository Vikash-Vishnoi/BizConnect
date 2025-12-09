/**
 * ✅ Opt-In Service
 * Handles opt-in consent management
 */

import { get, post, put } from '../api';

/**
 * Get opt-in consents list
 */
export const getOptIns = async (params) => {
  return await get('/opt-in', params);
};

/**
 * Get opt-in status for contact
 */
export const getOptInStatus = async (phoneNumber) => {
  return await get(`/opt-in/${phoneNumber}`);
};

/**
 * Grant opt-in consent
 */
export const grantOptIn = async (phoneNumber, data) => {
  return await post(`/opt-in/${phoneNumber}/grant`, data);
};

/**
 * Revoke opt-in consent
 */
export const revokeOptIn = async (phoneNumber, reason) => {
  return await post(`/opt-in/${phoneNumber}/revoke`, { reason });
};

/**
 * Process opt-out request
 */
export const processOptOut = async (phoneNumber, reason) => {
  return await post(`/opt-in/${phoneNumber}/opt-out`, { reason });
};

/**
 * Process opt-in request
 */
export const processOptIn = async (phoneNumber, channel) => {
  return await post(`/opt-in/${phoneNumber}/opt-in`, { channel });
};

/**
 * Verify opt-in consent
 */
export const verifyOptIn = async (phoneNumber, evidence) => {
  return await post(`/opt-in/${phoneNumber}/verify`, { evidence });
};

/**
 * Update opt-in preferences
 */
export const updateOptInPreferences = async (phoneNumber, preferences) => {
  return await put(`/opt-in/${phoneNumber}/preferences`, { preferences });
};

/**
 * Flag opt-in for review
 */
export const flagOptIn = async (phoneNumber, reason) => {
  return await post(`/opt-in/${phoneNumber}/flag`, { reason });
};

/**
 * Get opt-in statistics
 */
export const getOptInStats = async () => {
  return await get('/opt-in/stats');
};

/**
 * Get opt-in history
 */
export const getOptInHistory = async (phoneNumber) => {
  return await get(`/opt-in/${phoneNumber}/history`);
};

/**
 * Bulk import opt-ins
 */
export const bulkImportOptIns = async (optIns) => {
  return await post('/opt-in/bulk-import', { optIns });
};

/**
 * Get contacts by opt-in channel
 */
export const getContactsByChannel = async (channel, params) => {
  return await get(`/opt-in/channel/${channel}/contacts`, params);
};

/**
 * Detect opt-out intent in message
 */
export const detectOptOut = async (messageText) => {
  return await post('/opt-in/detect-optout', { messageText });
};

/**
 * Get opt-out patterns
 */
export const getOptOutPatterns = async () => {
  return await get('/opt-in/opt-out-patterns');
};

/**
 * Update opt-out patterns
 */
export const updateOptOutPatterns = async (patterns) => {
  return await put('/opt-in/opt-out-patterns', { patterns });
};

/**
 * Get opted-out contacts
 */
export const getOptedOutContacts = async (params) => {
  return await get('/opt-in/opted-out', params);
};

/**
 * Resubscribe contact
 */
export const resubscribeContact = async (data) => {
  return await post('/opt-in/resubscribe', data);
};

