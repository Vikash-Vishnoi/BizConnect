/**
 * Opt-In Service
 * 
 * @module services/business/optInService
 * @description Service for managing opt-in consent, opt-out detection, and contact preferences.
 * Ensures GDPR and WhatsApp policy compliance for marketing communications.
 * 
 * @features
 * - Opt-in consent management
 * - Opt-out detection and processing
 * - Contact preference management
 * - Bulk opt-in imports
 * - Opt-in verification and evidence tracking
 * - Channel-based contact filtering
 * - Opt-out pattern detection
 * 
 * @api-endpoints
 * Core Opt-In:
 * - GET /opt-in - List all opt-ins
 * - GET /opt-in/:phoneNumber - Get opt-in status
 * - POST /opt-in/:phoneNumber/grant - Grant opt-in
 * - POST /opt-in/:phoneNumber/revoke - Revoke opt-in
 * - POST /opt-in/:phoneNumber/opt-out - Process opt-out
 * - POST /opt-in/:phoneNumber/opt-in - Process opt-in
 * 
 * Verification & Preferences:
 * - POST /opt-in/:phoneNumber/verify - Verify opt-in
 * - PUT /opt-in/:phoneNumber/preferences - Update preferences
 * - POST /opt-in/:phoneNumber/flag - Flag for review
 * 
 * Statistics & History:
 * - GET /opt-in/stats - Get statistics
 * - GET /opt-in/:phoneNumber/history - Get history
 * 
 * Bulk & Channel:
 * - POST /opt-in/bulk-import - Bulk import
 * - GET /opt-in/channel/:channel/contacts - Get contacts by channel
 * 
 * Opt-Out Detection:
 * - POST /opt-in/detect-optout - Detect opt-out intent
 * - GET /opt-in/opt-out-patterns - Get patterns
 * - PUT /opt-in/opt-out-patterns - Update patterns
 * - GET /opt-in/opted-out - Get opted-out contacts
 * - POST /opt-in/resubscribe - Resubscribe contact
 * 
 * @example
 * import * as optInService from './optInService';
 * 
 * // Check opt-in status
 * const status = await optInService.getOptInStatus('+1234567890');
 * 
 * // Process opt-out
 * await optInService.processOptOut('+1234567890', 'User requested');
 */

import { get, post, put } from '../api';

/**
 * @constant {Object} OPT_IN_ENDPOINTS - API endpoint paths for opt-in service
 */\nconst OPT_IN_ENDPOINTS = {
  BASE: '/opt-in',
  GRANT: '/grant',
  REVOKE: '/revoke',
  OPT_OUT: '/opt-out',
  OPT_IN: '/opt-in',
  VERIFY: '/verify',
  PREFERENCES: '/preferences',
  FLAG: '/flag',
  STATS: '/opt-in/stats',
  HISTORY: '/history',
  BULK_IMPORT: '/opt-in/bulk-import',
  CHANNEL: '/opt-in/channel',
  CONTACTS: '/contacts',
  DETECT_OPTOUT: '/opt-in/detect-optout',
  OPT_OUT_PATTERNS: '/opt-in/opt-out-patterns',
  OPTED_OUT: '/opt-in/opted-out',
  RESUBSCRIBE: '/opt-in/resubscribe'
};

/**
 * Get opt-in consents list\n * @param {Object} params - Query parameters (page, limit, status, channel)
 * @returns {Promise<Array>} List of opt-in consents
 */
export const getOptIns = async (params) => {
  return await get(OPT_IN_ENDPOINTS.BASE, params);
};

/**
 * Get opt-in status for contact
 * @param {string} phoneNumber - Contact phone number
 * @returns {Promise<Object>} Opt-in status (status, channel, grantedAt, expiresAt)
 */
export const getOptInStatus = async (phoneNumber) => {
  return await get(`${OPT_IN_ENDPOINTS.BASE}/${phoneNumber}`);
};

/**
 * Grant opt-in consent
 * @param {string} phoneNumber - Contact phone number
 * @param {Object} data - Opt-in data (channel, evidence, expiresAt)
 * @returns {Promise<Object>} Created opt-in consent
 */
export const grantOptIn = async (phoneNumber, data) => {
  return await post(`${OPT_IN_ENDPOINTS.BASE}/${phoneNumber}${OPT_IN_ENDPOINTS.GRANT}`, data);
};

/**
 * Revoke opt-in consent
 * @param {string} phoneNumber - Contact phone number
 * @param {string} reason - Revocation reason
 * @returns {Promise<Object>} Revocation result
 */
export const revokeOptIn = async (phoneNumber, reason) => {
  return await post(`${OPT_IN_ENDPOINTS.BASE}/${phoneNumber}${OPT_IN_ENDPOINTS.REVOKE}`, { reason });
};

/**
 * Process opt-out request
 * @param {string} phoneNumber - Contact phone number
 * @param {string} reason - Opt-out reason
 * @returns {Promise<Object>} Opt-out processing result
 */
export const processOptOut = async (phoneNumber, reason) => {
  return await post(`${OPT_IN_ENDPOINTS.BASE}/${phoneNumber}${OPT_IN_ENDPOINTS.OPT_OUT}`, { reason });
};

/**
 * Process opt-in request
 * @param {string} phoneNumber - Contact phone number
 * @param {string} channel - Opt-in channel (whatsapp, web, sms)
 * @returns {Promise<Object>} Opt-in processing result
 */
export const processOptIn = async (phoneNumber, channel) => {
  return await post(`${OPT_IN_ENDPOINTS.BASE}/${phoneNumber}${OPT_IN_ENDPOINTS.OPT_IN}`, { channel });
};

/**
 * Verify opt-in consent with evidence
 * @param {string} phoneNumber - Contact phone number
 * @param {string} evidence - Evidence of consent (URL, screenshot, timestamp)
 * @returns {Promise<Object>} Verification result
 */
export const verifyOptIn = async (phoneNumber, evidence) => {
  return await post(`${OPT_IN_ENDPOINTS.BASE}/${phoneNumber}${OPT_IN_ENDPOINTS.VERIFY}`, { evidence });
};

/**
 * Update opt-in preferences
 * @param {string} phoneNumber - Contact phone number
 * @param {Object} preferences - Preference settings (channels, frequency, topics)
 * @returns {Promise<Object>} Updated preferences
 */
export const updateOptInPreferences = async (phoneNumber, preferences) => {
  return await put(`${OPT_IN_ENDPOINTS.BASE}/${phoneNumber}${OPT_IN_ENDPOINTS.PREFERENCES}`, { preferences });
};

/**
 * Flag opt-in for review
 * @param {string} phoneNumber - Contact phone number
 * @param {string} reason - Flag reason (suspicious, invalid, missing_evidence)
 * @returns {Promise<Object>} Flag result
 */
export const flagOptIn = async (phoneNumber, reason) => {
  return await post(`${OPT_IN_ENDPOINTS.BASE}/${phoneNumber}${OPT_IN_ENDPOINTS.FLAG}`, { reason });
};

/**
 * Get opt-in statistics
 * @returns {Promise<Object>} Statistics (total, active, pending, revoked, by_channel)
 */
export const getOptInStats = async () => {
  return await get(OPT_IN_ENDPOINTS.STATS);
};

/**
 * Get opt-in history for contact
 * @param {string} phoneNumber - Contact phone number
 * @returns {Promise<Array>} History records (action, timestamp, reason)
 */
export const getOptInHistory = async (phoneNumber) => {
  return await get(`${OPT_IN_ENDPOINTS.BASE}/${phoneNumber}${OPT_IN_ENDPOINTS.HISTORY}`);
};

/**
 * Bulk import opt-ins
 * @param {Array} optIns - Array of opt-in records (phoneNumber, channel, evidence, grantedAt)
 * @returns {Promise<Object>} Import result (imported, failed, errors)
 */
export const bulkImportOptIns = async (optIns) => {
  return await post(OPT_IN_ENDPOINTS.BULK_IMPORT, { optIns });
};

/**
 * Get contacts by opt-in channel
 * @param {string} channel - Opt-in channel (whatsapp, web, sms)
 * @param {Object} params - Query parameters (page, limit, status)
 * @returns {Promise<Array>} Contacts list
 */
export const getContactsByChannel = async (channel, params) => {
  return await get(`${OPT_IN_ENDPOINTS.CHANNEL}/${channel}${OPT_IN_ENDPOINTS.CONTACTS}`, params);
};

/**
 * Detect opt-out intent in message
 * @param {string} messageText - Message text to analyze
 * @returns {Promise<Object>} Detection result (isOptOut, confidence, matchedPattern)
 */
export const detectOptOut = async (messageText) => {
  return await post(OPT_IN_ENDPOINTS.DETECT_OPTOUT, { messageText });
};

/**
 * Get opt-out patterns
 * @returns {Promise<Array>} Opt-out keyword patterns (pattern, language, regex)
 */
export const getOptOutPatterns = async () => {
  return await get(OPT_IN_ENDPOINTS.OPT_OUT_PATTERNS);
};

/**
 * Update opt-out patterns
 * @param {Array} patterns - New patterns array (pattern, language, regex)
 * @returns {Promise<Array>} Updated patterns
 */
export const updateOptOutPatterns = async (patterns) => {
  return await put(OPT_IN_ENDPOINTS.OPT_OUT_PATTERNS, { patterns });
};

/**
 * Get opted-out contacts list
 * @param {Object} params - Query parameters (page, limit, fromDate, toDate)
 * @returns {Promise<Array>} Opted-out contacts
 */
export const getOptedOutContacts = async (params) => {
  return await get(OPT_IN_ENDPOINTS.OPTED_OUT, params);
};

/**
 * Resubscribe opted-out contact
 * @param {Object} data - Resubscribe data (phoneNumber, channel, evidence, reason)
 * @returns {Promise<Object>} Resubscription result
 */
export const resubscribeContact = async (data) => {
  return await post(OPT_IN_ENDPOINTS.RESUBSCRIBE, data);
};

export default {
  getOptIns,
  getOptInStatus,
  grantOptIn,
  revokeOptIn,
  processOptOut,
  processOptIn,
  verifyOptIn,
  updateOptInPreferences,
  flagOptIn,
  getOptInStats,
  getOptInHistory,
  bulkImportOptIns,
  getContactsByChannel,
  detectOptOut,
  getOptOutPatterns,
  updateOptOutPatterns,
  getOptedOutContacts,
  resubscribeContact
};

