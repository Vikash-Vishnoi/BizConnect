/**
 * 🔄 Flows Service
 * Handles WhatsApp Flows API calls for interactive message flows
 * 
 * @module services/automations/flowService
 */

import { get, post, put, del } from '../api';

/**
 * Get flows list
 * @param {Object} [params] - Query parameters (page, limit, status, etc.)
 * @returns {Promise<Object>} Paginated flows list
 */
export const getFlows = async (params) => {
  return await get('/flows', params);
};

/**
 * Get flow by ID
 * @param {string} id - Flow ID
 * @returns {Promise<Object>} Flow details
 */
export const getFlowById = async (id) => {
  return await get(`/flows/${id}`);
};

/**
 * Create new flow
 * @param {Object} data - Flow data (name, description, screens, etc.)
 * @returns {Promise<Object>} Created flow
 */
export const createFlow = async (data) => {
  return await post('/flows', data);
};

/**
 * Update flow
 * @param {string} id - Flow ID
 * @param {Object} data - Updated flow data
 * @returns {Promise<Object>} Updated flow
 */
export const updateFlow = async (id, data) => {
  return await put(`/flows/${id}`, data);
};

/**
 * Publish flow to WhatsApp
 * @param {string} id - Flow ID
 * @returns {Promise<Object>} Published flow with WhatsApp flow ID
 */
export const publishFlow = async (id) => {
  return await post(`/flows/${id}/publish`);
};

/**
 * Deprecate published flow
 * @param {string} id - Flow ID
 * @returns {Promise<Object>} Deprecated flow
 */
export const deprecateFlow = async (id) => {
  return await post(`/flows/${id}/deprecate`);
};

/**
 * Send flow message to recipient
 * @param {string} id - Flow ID
 * @param {Object} data - Recipient and message data
 * @returns {Promise<Object>} Message send response
 */
export const sendFlow = async (id, data) => {
  return await post(`/flows/${id}/send`, data);
};

/**
 * Get flow responses from users
 * @param {string} id - Flow ID
 * @param {Object} [params] - Query parameters
 * @returns {Promise<Object>} Flow responses
 */
export const getFlowResponses = async (id, params) => {
  return await get(`/flows/${id}/responses`, params);
};

/**
 * Get flow analytics
 * @param {string} id - Flow ID
 * @returns {Promise<Object>} Flow analytics data
 */
export const getFlowAnalytics = async (id) => {
  return await get(`/flows/${id}/analytics`);
};

/**
 * Get flows summary statistics
 * @returns {Promise<Object>} Summary stats for all flows
 */
export const getFlowsSummary = async () => {
  return await get('/flows/stats/summary');
};

// ============================================
// P0 FEATURE: Flow Publishing to WhatsApp
// ============================================

/**
 * Validate flow structure before publishing
 */
export const validateFlow = async (flowId) => {
  return await post(`/flows/${flowId}/validate`);
};

/**
 * Unpublish/deprecate a published flow
 */
export const unpublishFlow = async (flowId) => {
  return await put(`/flows/${flowId}/unpublish`);
};

/**
 * Get flow preview URL
 */
export const getFlowPreviewUrl = async (flowId) => {
  return await get(`/flows/${flowId}/preview`);
};

// ============================================
// P2 FEATURE: Flow Analytics Dashboard
// ============================================

/**
 * Get flow completion statistics
 */
export const getFlowCompletionStats = async (flowId, params = {}) => {
  return await get(`/flows/${flowId}/analytics/completion`, params);
};

/**
 * Get flow abandonment analysis
 */
export const getFlowAbandonmentAnalysis = async (flowId, params = {}) => {
  return await get(`/flows/${flowId}/analytics/abandonment`, params);
};

/**
 * Get flow performance report
 */
export const getFlowPerformanceReport = async (flowId, params = {}) => {
  return await get(`/flows/${flowId}/analytics/performance`, params);
};

/**
 * Get flow trends over time
 */
export const getFlowTrends = async (flowId, params = {}) => {
  return await get(`/flows/${flowId}/analytics/trends`, params);
};

/**
 * Get business-wide flow analytics
 */
export const getBusinessFlowAnalytics = async (businessId, params = {}) => {
  return await get(`/business/${businessId}/flows/analytics`, params);
};

// ============================================
// P3 FEATURE: Dynamic Flow Data Endpoints
// ============================================

/**
 * Get flow data endpoint configuration
 */
export const getFlowDataEndpoint = async (flowId) => {
  return await get(`/flows/${flowId}/data-endpoint`);
};

/**
 * Set flow data endpoint URL
 */
export const setFlowDataEndpoint = async (flowId, endpointUrl) => {
  return await put(`/flows/${flowId}/data-endpoint`, { endpointUrl });
};

/**
 * Remove flow data endpoint
 */
export const removeFlowDataEndpoint = async (flowId) => {
  return await del(`/flows/${flowId}/data-endpoint`);
};

/**
 * Test flow data endpoint
 * @param {string} flowId - Flow ID
 * @param {Object} testPayload - Test data payload
 * @returns {Promise<Object>} Test results
 */
export const testFlowDataEndpoint = async (flowId, testPayload) => {
  return await post(`/flows/${flowId}/data-endpoint/test`, testPayload);
};

// Default export with all flow service methods
export default {
  getFlows,
  getFlowById,
  createFlow,
  updateFlow,
  publishFlow,
  deprecateFlow,
  sendFlow,
  getFlowResponses,
  getFlowAnalytics,
  getFlowsSummary,
  validateFlow,
  unpublishFlow,
  getFlowPreviewUrl,
  getFlowCompletionStats,
  getFlowAbandonmentAnalysis,
  getFlowPerformanceReport,
  getFlowTrends,
  getBusinessFlowAnalytics,
  getFlowDataEndpoint,
  setFlowDataEndpoint,
  removeFlowDataEndpoint,
  testFlowDataEndpoint,
};

