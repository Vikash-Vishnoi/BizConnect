/**
 * Campaign Service
 * 
 * @module services/campaigns/campaignService
 * @description Service layer for campaign management operations including CRUD, lifecycle management,
 * statistics, recipient tracking, and retry functionality. Handles all campaign-related API calls.
 * 
 * @features
 * - Campaign CRUD operations (create, read, update, delete)
 * - Campaign lifecycle management (start, pause, resume, cancel)
 * - Campaign statistics and analytics
 * - Recipient management and tracking
 * - Failed recipient retry functionality
 * - Batch operations support
 * - Pagination and filtering
 * 
 * @api-endpoints
 * - GET    /campaigns                  - List all campaigns
 * - GET    /campaigns/:id              - Get campaign by ID
 * - POST   /campaigns                  - Create new campaign
 * - PUT    /campaigns/:id              - Update campaign
 * - POST   /campaigns/:id/start        - Start campaign
 * - POST   /campaigns/:id/pause        - Pause campaign
 * - POST   /campaigns/:id/resume       - Resume campaign
 * - POST   /campaigns/:id/cancel       - Cancel campaign
 * - GET    /campaigns/:id/stats        - Get campaign statistics
 * - GET    /campaigns/:id/recipients   - Get campaign recipients
 * - GET    /campaigns/:id/failed       - Get failed recipients
 * - POST   /campaigns/:id/retry        - Retry failed recipients
 * 
 * @example
 * import * as campaignService from './campaignService';
 * 
 * // Create new campaign
 * const campaign = await campaignService.createCampaign({
 *   name: 'Summer Sale',
 *   templateId: '123',
 *   targetAudience: ['contact1', 'contact2']
 * });
 * 
 * // Start campaign
 * await campaignService.startCampaign(campaign.id);
 * 
 * // Get statistics
 * const stats = await campaignService.getCampaignStats(campaign.id);
 */

import { get, post, put, del } from '../api';

/**
 * @constant {Object} CAMPAIGN_ENDPOINTS - API endpoint paths
 */
const CAMPAIGN_ENDPOINTS = {
  BASE: '/campaigns',
  START: '/start',
  PAUSE: '/pause',
  RESUME: '/resume',
  CANCEL: '/cancel',
  STATS: '/stats',
  RECIPIENTS: '/recipients',
  FAILED: '/failed',
  RETRY: '/retry'
};

/**
 * @typedef {Object} CampaignSchedule
 * @property {'immediate' | 'scheduled'} type
 * @property {string} [scheduledFor]
 * @property {string} [scheduledTime]
 */

/**
 * @typedef {Object} CampaignStats
 * @property {number} total
 * @property {number} sent
 * @property {number} delivered
 * @property {number} read
 * @property {number} failed
 * @property {number} pending
 */

/**
 * @typedef {Object} CampaignSettings
 * @property {number} sendRate
 * @property {boolean} retryFailed
 * @property {number} maxRetries
 */

/**
 * @typedef {Object} Campaign
 * @property {string} _id
 * @property {string} name
 * @property {string} [description]
 * @property {'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'failed'} status
 * @property {string} templateId
 * @property {string} [startedAt]
 * @property {string} [completedAt]
 * @property {CampaignSchedule} schedule
 * @property {boolean} usesSeparateRecipients
 * @property {CampaignStats} stats
 * @property {CampaignSettings} settings
 * @property {string} userId
 * @property {string} businessId
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Get campaigns list with optional filtering and pagination
 * @param {Object} params - Query parameters (page, limit, status, search)
 * @returns {Promise<Object>} Campaigns list with pagination metadata
 */
export const getCampaigns = async (params) => {
  return await get(CAMPAIGN_ENDPOINTS.BASE, params);
};

/**
 * Get campaign by ID
 * @param {string} id - Campaign ID
 * @param {Object} params - Optional query parameters (includeRecipients, etc.)
 * @returns {Promise<Object>} Campaign object with full details
 */
export const getCampaignById = async (id, params = {}) => {
  return await get(`${CAMPAIGN_ENDPOINTS.BASE}/${id}`, params);
};

/**
 * Create new campaign
 * @param {Object} data - Campaign data (name, templateId, targetAudience, schedule)
 * @returns {Promise<Object>} Created campaign object
 */
export const createCampaign = async (data) => {
  return await post(CAMPAIGN_ENDPOINTS.BASE, data);
};

/**
 * Update campaign
 * @param {string} id - Campaign ID
 * @param {Object} data - Updated campaign data
 * @returns {Promise<Object>} Updated campaign object
 */
export const updateCampaign = async (id, data) => {
  return await put(`${CAMPAIGN_ENDPOINTS.BASE}/${id}`, data);
};

/**
 * Delete campaign (typically for draft campaigns only)
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteCampaign = async (id) => {
  return await del(`${CAMPAIGN_ENDPOINTS.BASE}/${id}`);
};

/**
 * Start campaign execution
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Campaign status update
 */
export const startCampaign = async (id) => {
  return await post(`${CAMPAIGN_ENDPOINTS.BASE}/${id}${CAMPAIGN_ENDPOINTS.START}`);
};

/**
 * Pause running campaign
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Campaign status update
 */
export const pauseCampaign = async (id) => {
  return await post(`${CAMPAIGN_ENDPOINTS.BASE}/${id}${CAMPAIGN_ENDPOINTS.PAUSE}`);
};

/**
 * Resume paused campaign
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Campaign status update
 */
export const resumeCampaign = async (id) => {
  return await post(`${CAMPAIGN_ENDPOINTS.BASE}/${id}${CAMPAIGN_ENDPOINTS.RESUME}`);
};

/**
 * Cancel campaign permanently
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Campaign status update
 */
export const cancelCampaign = async (id) => {
  return await post(`${CAMPAIGN_ENDPOINTS.BASE}/${id}${CAMPAIGN_ENDPOINTS.CANCEL}`);
};

/**
 * Get campaign statistics and analytics
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Campaign statistics (sent, delivered, failed, etc.)
 */
export const getCampaignStats = async (id) => {
  return await get(`${CAMPAIGN_ENDPOINTS.BASE}/${id}${CAMPAIGN_ENDPOINTS.STATS}`);
};

/**
 * Get campaign recipients with pagination
 * @param {string} id - Campaign ID
 * @param {Object} params - Query parameters (page, limit, status)
 * @returns {Promise<Object>} Recipients list with pagination
 */
export const getCampaignRecipients = async (id, params) => {
  return await get(`${CAMPAIGN_ENDPOINTS.BASE}/${id}${CAMPAIGN_ENDPOINTS.RECIPIENTS}`, params);
};

/**
 * Get failed campaign recipients
 * @param {string} id - Campaign ID
 * @param {Object} params - Query parameters (page, limit)
 * @returns {Promise<Object>} Failed recipients list with error details
 */
export const getFailedRecipients = async (id, params) => {
  return await get(`${CAMPAIGN_ENDPOINTS.BASE}/${id}${CAMPAIGN_ENDPOINTS.FAILED}`, params);
};

/**
 * Retry failed campaign recipients
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Retry operation status
 */
export const retryFailedRecipients = async (id) => {
  return await post(`${CAMPAIGN_ENDPOINTS.BASE}/${id}${CAMPAIGN_ENDPOINTS.RETRY}`);
};

