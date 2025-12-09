/**
 * 📞 Phone Health Service
 * Handles phone number health monitoring API calls
 */

import { get, post, patch } from '../api';

/**
 * Get phone health status
 */
export const getPhoneHealth = async () => {
  return await get('/phone-health');
};

/**
 * Manually trigger health check
 */
export const checkPhoneHealth = async () => {
  return await post('/phone-health/check');
};

/**
 * Get health check history
 */
export const getHealthHistory = async (params) => {
  return await get('/phone-health/history', params);
};

/**
 * Get health recommendations
 */
export const getHealthRecommendations = async () => {
  return await get('/phone-health/recommendations');
};

/**
 * Get phone health alerts
 */
export const getPhoneHealthAlerts = async (params) => {
  return await get('/phone-health/alerts', params);
};

/**
 * Acknowledge health alert
 */
export const acknowledgeHealthAlert = async (alertId) => {
  return await patch(`/phone-health/alerts/${alertId}/acknowledge`);
};

/**
 * Get health metrics
 */
export const getHealthMetrics = async () => {
  return await get('/phone-health/metrics');
};

/**
 * Update health metrics manually
 */
export const updateHealthMetrics = async (metrics) => {
  return await post('/phone-health/metrics/update', { metrics });
};

/**
 * Get messaging limits
 */
export const getMessagingLimits = async () => {
  return await get('/phone-health/limits');
};

/**
 * Request quality improvement plan
 */
export const requestQualityImprovement = async () => {
  return await post('/phone-health/quality/improve');
};

/**
 * Get messaging tier
 */
export const getMessagingTier = async () => {
  return await get('/phone-health/tier');
};

/**
 * Get tier history
 */
export const getTierHistory = async (params) => {
  return await get('/phone-health/tier/history', params);
};

/**
 * Get tier upgrade status
 */
export const getTierUpgradeStatus = async () => {
  return await get('/phone-health/tier/upgrade-status');
};

/**
 * Update tier information
 */
export const updateTierInfo = async () => {
  return await post('/phone-health/tier/update');
};

/**
 * Get tier usage
 */
export const getTierUsage = async () => {
  return await get('/phone-health/tier/usage');
};

