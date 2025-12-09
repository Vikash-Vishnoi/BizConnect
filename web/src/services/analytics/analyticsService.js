/**
 * 📊 Analytics Service
 * Handles all analytics-related API calls
 */

import { get, post, del } from '../api';

/**
 * Get analytics overview
 */
export const getAnalyticsOverview = async (params) => {
  return await get('/analytics/overview', params);
};

/**
 * Get dashboard analytics
 */
export const getDashboardAnalytics = async (params) => {
  return await get('/analytics/dashboard', params);
};

/**
 * Get daily analytics
 */
export const getDailyAnalytics = async (params) => {
  return await get('/analytics/daily', params);
};

/**
 * Get analytics summary
 */
export const getAnalyticsSummary = async (period) => {
  return await get('/analytics/summary', { period });
};

/**
 * Get daily metrics
 */
export const getDailyMetrics = async (params) => {
  return await get('/analytics/daily-metrics', params);
};

/**
 * Get recent activity
 */
export const getRecentActivity = async (limit = 10) => {
  return await get('/analytics/recent-activity', { limit });
};

/**
 * Get conversation analytics
 */
export const getConversationAnalytics = async (params) => {
  return await get('/analytics/conversations', params);
};

/**
 * Get message analytics
 */
export const getMessageAnalytics = async (params) => {
  return await get('/analytics/messages', params);
};

/**
 * Clear analytics cache
 */
export const clearAnalyticsCache = async () => {
  return await del('/analytics/cache');
};

/**
 * Get quality analytics
 */
export const getQualityAnalytics = async () => {
  return await get('/analytics/quality');
};

/**
 * Get trends
 */
export const getTrends = async (params) => {
  return await get('/analytics/trends', params);
};

/**
 * Get status distribution
 */
export const getStatusDistribution = async () => {
  return await get('/analytics/status-distribution');
};

/**
 * Get campaign performance
 */
export const getCampaignPerformance = async (params) => {
  return await get('/analytics/campaign-performance', params);
};

/**
 * Get campaign analytics
 */
export const getCampaignAnalytics = async () => {
  return await get('/analytics/campaigns');
};

/**
 * Get template analytics
 */
export const getTemplateAnalytics = async (params) => {
  return await get('/analytics/templates', params);
};

/**
 * Get analytics history
 */
export const getAnalyticsHistory = async (params) => {
  return await get('/analytics/history', params);
};

/**
 * Export analytics data
 */
export const exportAnalytics = async (data) => {
  return await post('/analytics/export', data);
};

// ============================================
// P1 FEATURE: Reaction Analytics
// ============================================

/**
 * Get conversation reactions
 */
export const getConversationReactions = async (conversationId) => {
  return await get(`/conversations/${conversationId}/reactions`);
};

/**
 * Get reaction analytics summary
 */
export const getReactionSummary = async (businessId) => {
  return await get(`/analytics/reactions/summary/${businessId}`);
};

/**
 * Get reaction trends
 */
export const getReactionTrends = async (params = {}) => {
  return await get('/analytics/reactions/trends', params);
};

// ============================================
// P2 FEATURE: Conversation Quality Metrics
// ============================================

/**
 * Get conversation quality score
 */
export const getConversationQuality = async (conversationId) => {
  return await get(`/analytics/conversations/${conversationId}/quality`);
};

/**
 * Get business quality metrics
 */
export const getBusinessQualityMetrics = async (businessId, params = {}) => {
  return await get(`/analytics/quality/business/${businessId}`, params);
};

/**
 * Get quality trends over time
 */
export const getQualityTrends = async (params = {}) => {
  return await get('/analytics/quality/trends', params);
};

// ============================================
// P3 FEATURE: Enhanced Audit Exports
// ============================================

/**
 * Export audit logs
 */
export const exportAuditLogs = async (filters, format = 'csv') => {
  return await post('/analytics/audit-logs/export', { filters, format }, {
    responseType: 'blob' // For file download
  });
};

/**
 * Get audit log statistics
 */
export const getAuditStats = async (params = {}) => {
  return await get('/analytics/audit-logs/stats', params);
};

/**
 * Get business audit logs
 */
export const getBusinessAuditLogs = async (businessId, params = {}) => {
  return await get(`/analytics/audit-logs/business/${businessId}`, params);
};

/**
 * Get user audit logs
 */
export const getUserAuditLogs = async (userId, params = {}) => {
  return await get(`/analytics/audit-logs/user/${userId}`, params);
};

/**
 * Get all audit action types
 */
export const getAuditActions = async () => {
  return await get('/analytics/audit-logs/actions');
};

/**
 * Get all audit resource types
 */
export const getAuditResourceTypes = async () => {
  return await get('/analytics/audit-logs/resource-types');
};

/**
 * Get time-series analytics
 */
export const getTimeseriesAnalytics = async (params) => {
  return await get('/analytics/timeseries', params);
};

/**
 * Get spending analytics
 */
export const getSpendingAnalytics = async (params) => {
  return await get('/analytics/spending', params);
};

/**
 * Get spending breakdown
 */
export const getSpendingBreakdown = async (params) => {
  return await get('/analytics/spending/breakdown', params);
};

/**
 * Get spending forecast
 */
export const getSpendingForecast = async () => {
  return await get('/analytics/spending/forecast');
};

