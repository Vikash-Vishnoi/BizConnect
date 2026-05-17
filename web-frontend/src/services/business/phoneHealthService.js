/**
 * Phone Health Service
 * 
 * @module services/business/phoneHealthService
 * @description Service for monitoring WhatsApp Business phone number health, quality ratings,
 * messaging limits, and tier management. Provides comprehensive health monitoring and alerts.
 * 
 * @features
 * - Phone health status monitoring
 * - Health check history and alerts
 * - Health recommendations
 * - Messaging limits and tier tracking
 * - Quality improvement requests
 * - Tier upgrade status monitoring
 * 
 * @api-endpoints
 * Health Monitoring:
 * - GET /phone-health - Get current health status
 * - POST /phone-health/check - Trigger manual health check
 * - GET /phone-health/history - Get health check history
 * - GET /phone-health/recommendations - Get health recommendations
 * 
 * Alerts:
 * - GET /phone-health/alerts - Get health alerts
 * - PATCH /phone-health/alerts/:id/acknowledge - Acknowledge alert
 * 
 * Metrics:
 * - GET /phone-health/metrics - Get health metrics
 * - POST /phone-health/metrics/update - Update metrics manually
 * 
 * Limits & Tier:
 * - GET /phone-health/limits - Get messaging limits
 * - GET /phone-health/tier - Get current tier
 * - GET /phone-health/tier/history - Get tier history
 * - GET /phone-health/tier/upgrade-status - Get upgrade status
 * - POST /phone-health/tier/update - Update tier info
 * - GET /phone-health/tier/usage - Get tier usage
 * 
 * Quality:
 * - POST /phone-health/quality/improve - Request quality improvement
 * 
 * @example
 * import * as phoneHealthService from './phoneHealthService';
 * 
 * // Get current health status
 * const health = await phoneHealthService.getPhoneHealth();
 * console.log('Quality Rating:', health.qualityRating);
 * 
 * // Request quality improvement
 * await phoneHealthService.requestQualityImprovement();
 */

import { get, post, patch } from '../api';

/**
 * @constant {Object} PHONE_HEALTH_ENDPOINTS - API endpoint paths for phone health service
 */
const PHONE_HEALTH_ENDPOINTS = {
  BASE: '/business/health-monitoring',
  CHECK: '/business/health-monitoring/check',
  HISTORY: '/business/health-monitoring/history',
  QUALITY_HISTORY: '/business/health-monitoring/quality-history',
  RECOMMENDATIONS: '/business/health-monitoring/recommendations',
  ALERTS: '/business/health-alerts',
  ALERT_ACKNOWLEDGE: '/acknowledge',
  METRICS: '/business/health-monitoring/metrics',
  METRICS_UPDATE: '/business/health-monitoring/metrics/update',
  LIMITS: '/business/limits',
  QUALITY_IMPROVE: '/business/health-monitoring/quality/improve',
  TIER: '/business/health-monitoring/tier',
  TIER_HISTORY: '/business/health-monitoring/tier/history',
  TIER_UPGRADE_STATUS: '/business/health-monitoring/tier/upgrade-status',
  TIER_UPDATE: '/business/health-monitoring/tier/update',
  TIER_USAGE: '/business/health-monitoring/tier/usage'
};

/**
 * Get current phone health status
 * @returns {Promise<Object>} Health status (qualityRating, status, issues)
 */
export const getPhoneHealth = async () => {
  return await get(PHONE_HEALTH_ENDPOINTS.BASE);
};

/**
 * Manually trigger health check
 * @returns {Promise<Object>} Health check result
 */
export const checkPhoneHealth = async () => {
  // Increase timeout to 70s to allow backend (60s) to respond with error if needed
  return await post(PHONE_HEALTH_ENDPOINTS.CHECK, {}, { timeout: 30000 });
};

/**
 * Get health check history
 * @param {Object} params - Query parameters (page, limit, startDate, endDate)
 * @returns {Promise<Array>} Health check history records
 */
export const getHealthHistory = async (params) => {
  return await get(PHONE_HEALTH_ENDPOINTS.HISTORY, params);
};

/**
 * Get quality rating history
 * @param {Object} params - Query parameters (dateRange)
 * @returns {Promise<Object>} Quality rating history and current rating
 */
export const getQualityHistory = async (params) => {
  return await get(PHONE_HEALTH_ENDPOINTS.QUALITY_HISTORY, params);
};

/**
 * Get health recommendations based on current status
 * @returns {Promise<Array>} Health improvement recommendations
 */
export const getHealthRecommendations = async () => {
  return await get(PHONE_HEALTH_ENDPOINTS.RECOMMENDATIONS);
};

/**
 * Get phone health alerts
 * @param {Object} params - Query parameters (page, limit, severity, status)
 * @returns {Promise<Array>} Health alerts
 */
export const getPhoneHealthAlerts = async (params) => {
  return await get(PHONE_HEALTH_ENDPOINTS.ALERTS, params);
};

/**
 * Acknowledge health alert
 * @param {string} alertId - Alert identifier
 * @returns {Promise<Object>} Acknowledgement result
 */
export const acknowledgeHealthAlert = async (alertId) => {
  return await patch(`${PHONE_HEALTH_ENDPOINTS.ALERTS}/${alertId}${PHONE_HEALTH_ENDPOINTS.ALERT_ACKNOWLEDGE}`);
};

/**
 * Get health metrics
 * @returns {Promise<Object>} Health metrics (deliverability, response rate, complaints)
 */
export const getHealthMetrics = async () => {
  return await get(PHONE_HEALTH_ENDPOINTS.METRICS);
};

/**
 * Update health metrics manually
 * @param {Object} metrics - Metrics data to update
 * @returns {Promise<Object>} Updated metrics
 */
export const updateHealthMetrics = async (metrics) => {
  return await post(PHONE_HEALTH_ENDPOINTS.METRICS_UPDATE, { metrics });
};

/**
 * Get messaging limits
 * @returns {Promise<Object>} Current messaging limits
 */
export const getMessagingLimits = async () => {
  return await get(PHONE_HEALTH_ENDPOINTS.LIMITS);
};

/**
 * Request quality improvement plan
 * @returns {Promise<Object>} Improvement plan details
 */
export const requestQualityImprovement = async () => {
  return await post(PHONE_HEALTH_ENDPOINTS.QUALITY_IMPROVE);
};

/**
 * Get current messaging tier
 * @returns {Promise<Object>} Messaging tier (tier, limit, nextTier)
 */
export const getMessagingTier = async () => {
  return await get(PHONE_HEALTH_ENDPOINTS.TIER);
};

/**
 * Get tier change history
 * @param {Object} params - Query parameters (page, limit)
 * @returns {Promise<Array>} Tier history records
 */
export const getTierHistory = async (params) => {
  return await get(PHONE_HEALTH_ENDPOINTS.TIER_HISTORY, params);
};

/**
 * Get tier upgrade status
 * @returns {Promise<Object>} Upgrade status (eligible, requirements, progress)
 */
export const getTierUpgradeStatus = async () => {
  return await get(PHONE_HEALTH_ENDPOINTS.TIER_UPGRADE_STATUS);
};

/**
 * Update tier information from WhatsApp
 * @returns {Promise<Object>} Updated tier info
 */
export const updateTierInfo = async () => {
  return await post(PHONE_HEALTH_ENDPOINTS.TIER_UPDATE);
};

/**
 * Get tier usage statistics
 * @returns {Promise<Object>} Tier usage (current, limit, percentage)
 */
export const getTierUsage = async () => {
  return await get(PHONE_HEALTH_ENDPOINTS.TIER_USAGE);
};

export default {
  getPhoneHealth,
  checkPhoneHealth,
  getHealthHistory,
  getQualityHistory,
  getHealthRecommendations,
  getPhoneHealthAlerts,
  acknowledgeHealthAlert,
  getHealthMetrics,
  updateHealthMetrics,
  getMessagingLimits,
  requestQualityImprovement,
  getMessagingTier,
  getTierHistory,
  getTierUpgradeStatus,
  updateTierInfo,
  getTierUsage
};

