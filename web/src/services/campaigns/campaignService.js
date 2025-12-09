/**
 * 🎯 Campaigns Service
 * Handles all campaign-related API calls
 */

import { get, post, put, del } from '../api';

/**
 * Get campaigns list
 */
export const getCampaigns = async (params) => {
  return await get('/campaigns', params);
};

/**
 * Get campaign by ID
 */
export const getCampaignById = async (id) => {
  return await get(`/campaigns/${id}`);
};

/**
 * Create new campaign
 */
export const createCampaign = async (data) => {
  return await post('/campaigns', data);
};

/**
 * Update campaign
 */
export const updateCampaign = async (id, data) => {
  return await put(`/campaigns/${id}`, data);
};

/**
 * Start campaign
 */
export const startCampaign = async (id) => {
  return await post(`/campaigns/${id}/start`);
};

/**
 * Pause campaign
 */
export const pauseCampaign = async (id) => {
  return await post(`/campaigns/${id}/pause`);
};

/**
 * Resume campaign
 */
export const resumeCampaign = async (id) => {
  return await post(`/campaigns/${id}/resume`);
};

/**
 * Cancel campaign
 */
export const cancelCampaign = async (id) => {
  return await post(`/campaigns/${id}/cancel`);
};

/**
 * Get campaign statistics
 */
export const getCampaignStats = async (id) => {
  return await get(`/campaigns/${id}/stats`);
};

/**
 * Get campaign recipients
 */
export const getCampaignRecipients = async (id, params) => {
  return await get(`/campaigns/${id}/recipients`, params);
};

/**
 * Get failed campaign recipients
 */
export const getFailedRecipients = async (id, params) => {
  return await get(`/campaigns/${id}/failed`, params);
};

/**
 * Retry failed campaign recipients
 */
export const retryFailedRecipients = async (id) => {
  return await post(`/campaigns/${id}/retry`);
};

