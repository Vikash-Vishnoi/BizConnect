/**
 * ⚠️ Alerts Service
 * Handles all alert-related API calls
 */

import { get, post, put } from '../api';

/**
 * Get alerts list
 */
export const getAlerts = async (params) => {
  return await get('/alerts', params);
};

/**
 * Get alert statistics
 */
export const getAlertStats = async () => {
  return await get('/alerts/stats');
};

/**
 * Get alert by ID
 */
export const getAlertById = async (id) => {
  return await get(`/alerts/${id}`);
};

/**
 * Update alert
 */
export const updateAlert = async (id, data) => {
  return await put(`/alerts/${id}`, data);
};

/**
 * Bulk mark alerts as read
 */
export const bulkMarkAsRead = async (alertIds) => {
  return await put('/alerts/bulk/mark-read', { alertIds });
};

/**
 * Create test alert
 */
export const createTestAlert = async (data) => {
  return await post('/alerts/test', data);
};

/**
 * Acknowledge alert
 */
export const acknowledgeAlert = async (id) => {
  return await put(`/alerts/${id}/acknowledge`);
};

/**
 * Resolve alert
 */
export const resolveAlert = async (id, notes) => {
  return await put(`/alerts/${id}/resolve`, { notes });
};

/**
 * Take action on alert
 */
export const takeAlertAction = async (id, action) => {
  return await put(`/alerts/${id}/action`, { action });
};

/**
 * Update alert status
 */
export const updateAlertStatus = async (id, status, reason) => {
  return await put(`/alerts/${id}/status`, { status, reason });
};

/**
 * Get unresolved alerts
 */
export const getUnresolvedAlerts = async (params) => {
  return await get('/alerts/unresolved', params);
};

/**
 * Get critical alerts
 */
export const getCriticalAlerts = async (params) => {
  return await get('/alerts/critical', params);
};

