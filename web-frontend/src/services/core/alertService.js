/**
 * @module services/core/alertService
 * @description Alert management service for system alerts, notifications, and issue tracking
 * 
 * @features
 * - Alert listing with pagination and filters
 * - Alert statistics and analytics
 * - Alert acknowledgment and resolution
 * - Bulk operations (mark as read, acknowledge)
 * - Critical alert monitoring
 * - Test alert creation for debugging
 * - Alert action workflows
 * 
 * @api
 * - GET /alerts - Fetch alerts with filters
 * - GET /alerts/stats - Get alert statistics
 * - GET /alerts/:id - Get specific alert details
 * - PUT /alerts/:id - Update alert
 * - PUT /alerts/:id/acknowledge - Acknowledge alert
 * - PUT /alerts/:id/resolve - Resolve alert with notes
 * - PUT /alerts/:id/action - Take action on alert
 * - PUT /alerts/bulk/mark-read - Bulk mark as read
 * - POST /alerts/test - Create test alert
 * - GET /alerts/unresolved - Get unresolved alerts
 * - GET /alerts/critical - Get critical priority alerts
 * 
 * @example
 * // Get critical unresolved alerts
 * const critical = await getCriticalAlerts({ status: 'unresolved' });
 * 
 * // Resolve an alert
 * await resolveAlert('alert-id-123', 'Issue fixed by restarting service');
 */

import { get, post, put } from '../api';

/**
 * Get alerts list with optional filters
 * @param {Object} [params] - Query parameters
 * @param {string} [params.status] - Filter by status
 * @param {string} [params.severity] - Filter by severity level
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Results per page
 * @returns {Promise<Object>} Alerts array with pagination info
 */
export const getAlerts = async (params) => {
  return await get('/alerts', params);
};

/**
 * Get alert statistics (total, by severity, by status)
 * @returns {Promise<Object>} Alert statistics
 */
export const getAlertStats = async () => {
  return await get('/alerts/stats');
};

/**
 * Get alert by ID with full details
 * @param {string} id - Alert ID
 * @returns {Promise<Object>} Alert details
 */
export const getAlertById = async (id) => {
  return await get(`/alerts/${id}`);
};

/**
 * Update alert properties
 * @param {string} id - Alert ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated alert
 */
export const updateAlert = async (id, data) => {
  return await put(`/alerts/${id}`, data);
};

/**
 * Bulk mark alerts as read
 * @param {string[]} alertIds - Array of alert IDs
 * @returns {Promise<Object>} Bulk operation result
 */
export const bulkMarkAsRead = async (alertIds) => {
  return await put('/alerts/bulk/mark-read', { alertIds });
};

/**
 * Create test alert for debugging
 * @param {Object} data - Test alert data
 * @returns {Promise<Object>} Created test alert
 */
export const createTestAlert = async (data) => {
  return await post('/alerts/test', data);
};

/**
 * Acknowledge alert (mark as seen by admin)
 * @param {string} id - Alert ID
 * @returns {Promise<Object>} Acknowledged alert
 */
export const acknowledgeAlert = async (id) => {
  return await put(`/alerts/${id}/acknowledge`);
};

/**
 * Resolve alert with resolution notes
 * @param {string} id - Alert ID
 * @param {string} notes - Resolution notes
 * @returns {Promise<Object>} Resolved alert
 */
export const resolveAlert = async (id, notes) => {
  return await put(`/alerts/${id}/resolve`, { notes });
};

/**
 * Take action on alert (e.g., retry, dismiss, escalate)
 * @param {string} id - Alert ID
 * @param {string} action - Action to take
 * @returns {Promise<Object>} Action result
 */
export const takeAlertAction = async (id, action) => {
  return await put(`/alerts/${id}/action`, { action });
};

/**
 * Update alert status with reason
 * @param {string} id - Alert ID
 * @param {string} status - New status
 * @param {string} reason - Reason for status change
 * @returns {Promise<Object>} Updated alert
 */
export const updateAlertStatus = async (id, status, reason) => {
  return await put(`/alerts/${id}/status`, { status, reason });
};

/**
 * Get unresolved alerts only
 * @param {Object} [params] - Query parameters
 * @returns {Promise<Object>} Unresolved alerts
 */
export const getUnresolvedAlerts = async (params) => {
  return await get('/alerts/unresolved', params);
};

/**
 * Get critical priority alerts
 * @param {Object} [params] - Query parameters
 * @returns {Promise<Object>} Critical alerts
 */
export const getCriticalAlerts = async (params) => {
  return await get('/alerts/critical', params);
};

