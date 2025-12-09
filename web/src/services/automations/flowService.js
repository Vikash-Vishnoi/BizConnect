/**
 * 🔄 Flows Service
 * Handles WhatsApp Flows API calls
 */

import { get, post, put } from '../api';

/**
 * Get flows list
 */
export const getFlows = async (params) => {
  return await get('/flows', params);
};

/**
 * Get flow by ID
 */
export const getFlowById = async (id) => {
  return await get(`/flows/${id}`);
};

/**
 * Create new flow
 */
export const createFlow = async (data) => {
  return await post('/flows', data);
};

/**
 * Update flow
 */
export const updateFlow = async (id, data) => {
  return await put(`/flows/${id}`, data);
};

/**
 * Publish flow
 */
export const publishFlow = async (id) => {
  return await post(`/flows/${id}/publish`);
};

/**
 * Deprecate flow
 */
export const deprecateFlow = async (id) => {
  return await post(`/flows/${id}/deprecate`);
};

/**
 * Send flow message
 */
export const sendFlow = async (id, data) => {
  return await post(`/flows/${id}/send`, data);
};

/**
 * Get flow responses
 */
export const getFlowResponses = async (id, params) => {
  return await get(`/flows/${id}/responses`, params);
};

/**
 * Get flow analytics
 */
export const getFlowAnalytics = async (id) => {
  return await get(`/flows/${id}/analytics`);
};

/**
 * Get flows summary stats
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
 */
export const testFlowDataEndpoint = async (flowId, testPayload) => {
  return await post(`/flows/${flowId}/data-endpoint/test`, testPayload);
};

