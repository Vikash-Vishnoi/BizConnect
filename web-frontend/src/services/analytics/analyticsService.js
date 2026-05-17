/**
 * Analytics Service
 * 
 * @module services/analytics/analyticsService
 * @description Comprehensive analytics service for tracking, reporting, and analyzing
 * business metrics including messages, campaigns, conversations, quality scores, and spending.
 * Provides real-time analytics, historical trends, and exportable reports.
 * 
 * @features
 * - Dashboard and overview analytics
 * - Daily metrics and time-series data
 * - Conversation and message analytics
 * - Campaign performance tracking
 * - Template usage analytics
 * - Quality metrics and trends
 * - Reaction analytics (P1 feature)
 * - Conversation quality scoring (P2 feature)
 * - Enhanced audit log exports (P3 feature)
 * - Spending analytics and forecasting
 * - Data export functionality
 * 
 * @api-endpoints
 * Core Analytics:
 * - GET /analytics/overview - Overview metrics
 * - GET /analytics/dashboard - Dashboard data
 * - GET /analytics/daily - Daily analytics
 * - GET /analytics/summary - Period summary
 * - GET /analytics/daily-metrics - Daily metrics
 * - GET /analytics/recent-activity - Recent activity feed
 * - GET /analytics/conversations - Conversation analytics
 * - GET /analytics/messages - Message analytics
 * - GET /analytics/quality - Quality analytics
 * - GET /analytics/trends - Trend analysis
 * - GET /analytics/status-distribution - Status breakdown
 * - GET /analytics/campaign-performance - Campaign performance
 * - GET /analytics/campaigns - Campaign analytics
 * - GET /analytics/templates - Template analytics
 * - GET /analytics/history - Historical data
 * - GET /analytics/timeseries - Time-series data
 * - POST /analytics/export - Export analytics data
 * - DELETE /analytics/cache - Clear cache
 * 
 * Reaction Analytics (P1):
 * - GET /conversations/:id/reactions - Conversation reactions
 * - GET /analytics/reactions/summary/:businessId - Reaction summary
 * - GET /analytics/reactions/trends - Reaction trends
 * 
 * Quality Metrics (P2):
 * - GET /analytics/conversations/:id/quality - Conversation quality score
 * - GET /analytics/quality/business/:businessId - Business quality metrics
 * - GET /analytics/quality/trends - Quality trends
 * 
 * Audit Logs (P3):
 * - POST /analytics/audit-logs/export - Export audit logs
 * - GET /analytics/audit-logs/stats - Audit statistics
 * - GET /analytics/audit-logs/business/:businessId - Business audit logs
 * - GET /analytics/audit-logs/user/:userId - User audit logs
 * - GET /analytics/audit-logs/actions - Audit action types
 * - GET /analytics/audit-logs/resource-types - Audit resource types
 * 
 * Spending Analytics:
 * - GET /analytics/spending - Spending analytics
 * - GET /analytics/spending/breakdown - Spending breakdown
 * - GET /analytics/spending/forecast - Spending forecast
 * 
 * @example
 * import * as analyticsService from './analyticsService';
 * 
 * // Get dashboard analytics for last 7 days
 * const data = await analyticsService.getDashboardAnalytics({ period: '7d' });
 * 
 * // Get campaign performance
 * const performance = await analyticsService.getCampaignPerformance({ 
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31'
 * });
 * 
 * // Export analytics
 * await analyticsService.exportAnalytics({
 *   type: 'campaigns',
 *   format: 'csv',
 *   period: '30d'
 * });
 */

import { get, post, del } from '../api';

/**
 * @constant {Object} ANALYTICS_ENDPOINTS - API endpoint paths
 */
const ANALYTICS_ENDPOINTS = {
  BASE: '/analytics',
  OVERVIEW: '/analytics/overview',
  DASHBOARD: '/analytics/dashboard',
  DAILY: '/analytics/daily',
  SUMMARY: '/analytics/summary',
  DAILY_METRICS: '/analytics/daily-metrics',
  RECENT_ACTIVITY: '/analytics/recent-activity',
  CONVERSATIONS: '/analytics/conversations',
  MESSAGES: '/analytics/messages',
  QUALITY: '/analytics/quality',
  TRENDS: '/analytics/trends',
  STATUS_DISTRIBUTION: '/analytics/status-distribution',
  CAMPAIGN_PERFORMANCE: '/analytics/campaign-performance',
  CAMPAIGNS: '/analytics/campaigns',
  TEMPLATES: '/analytics/templates',
  HISTORY: '/analytics/history',
  TIMESERIES: '/analytics/timeseries',
  SPENDING: '/analytics/spending',
  SPENDING_BREAKDOWN: '/analytics/spending/breakdown',
  SPENDING_FORECAST: '/analytics/spending/forecast',
  EXPORT: '/analytics/export',
  CACHE: '/analytics/cache',
  REACTIONS_SUMMARY: '/analytics/reactions/summary',
  REACTIONS_TRENDS: '/analytics/reactions/trends',
  QUALITY_BUSINESS: '/analytics/quality/business',
  QUALITY_TRENDS: '/analytics/quality/trends',
  AUDIT_EXPORT: '/analytics/audit-logs/export',
  AUDIT_STATS: '/analytics/audit-logs/stats',
  AUDIT_BUSINESS: '/analytics/audit-logs/business',
  AUDIT_USER: '/analytics/audit-logs/user',
  AUDIT_ACTIONS: '/analytics/audit-logs/actions',
  AUDIT_RESOURCE_TYPES: '/analytics/audit-logs/resource-types'
};

/**
 * @constant {number} DEFAULT_ACTIVITY_LIMIT - Default limit for recent activity
 */
const DEFAULT_ACTIVITY_LIMIT = 10;

/**
 * @constant {number} DEFAULT_HISTORY_LIMIT - Default limit for capability history
 */
const DEFAULT_HISTORY_LIMIT = 50;

/**
 * Get analytics overview with key metrics
 * @param {Object} params - Query parameters (period, startDate, endDate)
 * @returns {Promise<Object>} Overview metrics
 */
export const getAnalyticsOverview = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.OVERVIEW, params);
};

/**
 * Get dashboard analytics with charts and summaries
 * @param {Object} params - Query parameters (range, startDate, endDate)
 * @returns {Promise<Object>} Dashboard analytics data
 */
export const getDashboardAnalytics = async (params) => {
  // Add view=dashboard to params to match backend expectations
  return await get(ANALYTICS_ENDPOINTS.BASE, { ...params, view: 'dashboard' });
};

/**
 * Get daily analytics breakdown
 * @param {Object} params - Query parameters (date, metrics)
 * @returns {Promise<Object>} Daily analytics
 */
export const getDailyAnalytics = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.DAILY, params);
};

/**
 * Get analytics summary for a period
 * @param {string} period - Time period ('7d', '30d', '90d', 'all')
 * @returns {Promise<Object>} Analytics summary
 */
export const getAnalyticsSummary = async (period) => {
  return await get(ANALYTICS_ENDPOINTS.SUMMARY, { period });
};

/**
 * Get daily metrics with trends
 * @param {Object} params - Query parameters (startDate, endDate)
 * @returns {Promise<Object>} Daily metrics data
 */
export const getDailyMetrics = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.DAILY_METRICS, params);
};

/**
 * Get recent activity feed
 * @param {number} limit - Maximum number of activities (default: 10)
 * @returns {Promise<Array>} Recent activities
 */
export const getRecentActivity = async (limit = DEFAULT_ACTIVITY_LIMIT) => {
  return await get(ANALYTICS_ENDPOINTS.RECENT_ACTIVITY, { limit });
};

/**
 * Get conversation analytics with engagement metrics
 * @param {Object|string} params - Query parameters (period, status, userId) or period string
 * @returns {Promise<Object>} Conversation analytics
 */
export const getConversationAnalytics = async (params) => {
  // Handle case where params is just a string (e.g. '7d')
  const queryParams = typeof params === 'string' ? { period: params } : params;
  return await get(ANALYTICS_ENDPOINTS.CONVERSATIONS, queryParams);
};

/**
 * Get message analytics with delivery rates
 * @param {Object} params - Query parameters (period, type, status)
 * @returns {Promise<Object>} Message analytics
 */
export const getMessageAnalytics = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.MESSAGES, params);
};

/**
 * Clear analytics cache
 * @returns {Promise<Object>} Cache clear confirmation
 */
export const clearAnalyticsCache = async () => {
  return await del(ANALYTICS_ENDPOINTS.CACHE);
};

/**
 * Get quality analytics metrics
 * @returns {Promise<Object>} Quality analytics
 */
export const getQualityAnalytics = async () => {
  return await get(ANALYTICS_ENDPOINTS.QUALITY);
};

/**
 * Get analytics trends over time
 * @param {Object} params - Query parameters (metric, period)
 * @returns {Promise<Object>} Trend data
 */
export const getTrends = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.TRENDS, params);
};

/**
 * Get status distribution breakdown
 * @returns {Promise<Object>} Status distribution
 */
export const getStatusDistribution = async () => {
  return await get(ANALYTICS_ENDPOINTS.STATUS_DISTRIBUTION);
};

/**
 * Get campaign performance metrics
 * @param {Object} params - Query parameters (startDate, endDate, campaignId)
 * @returns {Promise<Object>} Campaign performance data
 */
export const getCampaignPerformance = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.CAMPAIGN_PERFORMANCE, params);
};

/**
 * Get campaign analytics with detailed metrics
 * @param {Object} params - Query parameters (period, status)
 * @returns {Promise<Object>} Campaign analytics
 */
export const getCampaignAnalytics = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.CAMPAIGNS, params);
};

/**
 * Get template usage analytics
 * @param {Object} params - Query parameters (period, templateId)
 * @returns {Promise<Object>} Template analytics
 */
export const getTemplateAnalytics = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.TEMPLATES, params);
};

/**
 * Get analytics history
 * @param {Object} params - Query parameters (startDate, endDate, type)
 * @returns {Promise<Array>} Historical analytics data
 */
export const getAnalyticsHistory = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.HISTORY, params);
};

/**
 * Export analytics data
 * @param {Object} data - Export configuration (type, format, period)
 * @returns {Promise<Blob>} Exported file
 */
export const exportAnalytics = async (data) => {
  return await post(ANALYTICS_ENDPOINTS.EXPORT, data);
};

// ============================================
// P1 FEATURE: Reaction Analytics
// ============================================

/**
 * Get reactions for a specific conversation
 * @param {string} conversationId - Conversation identifier
 * @returns {Promise<Array>} Conversation reactions
 */
export const getConversationReactions = async (conversationId) => {
  return await get(`/conversations/${conversationId}/reactions`);
};

/**
 * Get reaction summary for a business
 * @param {string} businessId - Business identifier
 * @returns {Promise<Object>} Reaction summary statistics
 */
export const getReactionSummary = async (businessId) => {
  return await get(`${ANALYTICS_ENDPOINTS.REACTIONS_SUMMARY}/${businessId}`);
};

/**
 * Get reaction trends over time
 * @param {Object} params - Query parameters (period, reactionType)
 * @returns {Promise<Object>} Reaction trends data
 */
export const getReactionTrends = async (params = {}) => {
  return await get(ANALYTICS_ENDPOINTS.REACTIONS_TRENDS, params);
};

// ============================================
// P2 FEATURE: Conversation Quality Metrics
// ============================================

/**
 * Get quality score for a specific conversation
 * @param {string} conversationId - Conversation identifier
 * @returns {Promise<Object>} Conversation quality score and factors
 */
export const getConversationQuality = async (conversationId) => {
  return await get(`/analytics/conversations/${conversationId}/quality`);
};

/**
 * Get business-level quality metrics
 * @param {string} businessId - Business identifier
 * @param {Object} params - Query parameters (period, threshold)
 * @returns {Promise<Object>} Business quality metrics
 */
export const getBusinessQualityMetrics = async (businessId, params = {}) => {
  return await get(`${ANALYTICS_ENDPOINTS.QUALITY_BUSINESS}/${businessId}`, params);
};

/**
 * Get quality trends over time
 * @param {Object} params - Query parameters (period, metric)
 * @returns {Promise<Object>} Quality trend data
 */
export const getQualityTrends = async (params = {}) => {
  return await get(ANALYTICS_ENDPOINTS.QUALITY_TRENDS, params);
};

// ============================================
// P3 FEATURE: Enhanced Audit Exports
// ============================================

/**
 * Export audit logs to file
 * @param {Object} filters - Filter criteria
 * @param {string} format - Export format (csv, json, xlsx)
 * @returns {Promise<Blob>} Exported audit log file
 */
export const exportAuditLogs = async (filters, format = 'csv') => {
  return await post(ANALYTICS_ENDPOINTS.AUDIT_EXPORT, { filters, format }, {
    responseType: 'blob'
  });
};

/**
 * Get audit log statistics
 * @param {Object} params - Query parameters (period, groupBy)
 * @returns {Promise<Object>} Audit statistics
 */
export const getAuditStats = async (params = {}) => {
  return await get(ANALYTICS_ENDPOINTS.AUDIT_STATS, params);
};

/**
 * Get audit logs for a specific business
 * @param {string} businessId - Business identifier
 * @param {Object} params - Query parameters (startDate, endDate, action, limit)
 * @returns {Promise<Array>} Business audit logs
 */
export const getBusinessAuditLogs = async (businessId, params = {}) => {
  return await get(`${ANALYTICS_ENDPOINTS.AUDIT_BUSINESS}/${businessId}`, params);
};

/**
 * Get audit logs for a specific user
 * @param {string} userId - User identifier
 * @param {Object} params - Query parameters (startDate, endDate, action, limit)
 * @returns {Promise<Array>} User audit logs
 */
export const getUserAuditLogs = async (userId, params = {}) => {
  return await get(`${ANALYTICS_ENDPOINTS.AUDIT_USER}/${userId}`, params);
};

/**
 * Get available audit action types
 * @returns {Promise<Array>} List of action types
 */
export const getAuditActions = async () => {
  return await get(ANALYTICS_ENDPOINTS.AUDIT_ACTIONS);
};

/**
 * Get available audit resource types
 * @returns {Promise<Array>} List of resource types
 */
export const getAuditResourceTypes = async () => {
  return await get(ANALYTICS_ENDPOINTS.AUDIT_RESOURCE_TYPES);
};

/**
 * Get time-series analytics data
 * @param {Object} params - Query parameters (metric, startDate, endDate, interval)
 * @returns {Promise<Array>} Time-series data points
 */
export const getTimeseriesAnalytics = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.TIMESERIES, params);
};

/**
 * Get spending analytics overview
 * @param {Object} params - Query parameters (period, category)
 * @returns {Promise<Object>} Spending analytics
 */
export const getSpendingAnalytics = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.SPENDING, params);
};

/**
 * Get detailed spending breakdown
 * @param {Object} params - Query parameters (period, groupBy)
 * @returns {Promise<Object>} Spending breakdown by category
 */
export const getSpendingBreakdown = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.SPENDING_BREAKDOWN, params);
};

/**
 * Get spending forecast
 * @param {Object} params - Query parameters (period, model)
 * @returns {Promise<Object>} Spending forecast data
 */
export const getSpendingForecast = async (params) => {
  return await get(ANALYTICS_ENDPOINTS.SPENDING_FORECAST, params);
};

