
/**
 * @module services/business/capabilityService
 * @description Service for business capability and restriction tracking.
 * @features
 * - Retrieve all business capabilities
 * - Fetch capability change history
 * - Get specific capability status
 * @api-endpoints
 * - GET /capabilities
 * - GET /capabilities/history
 * - GET /capabilities/{capabilityName}
 * @example
 * import * as capabilityService from './capabilityService';
 * // Get all capabilities
 * const caps = await capabilityService.getCapabilities();
 * // Get history
 * const history = await capabilityService.getCapabilityHistory();
 * // Get a specific capability
 * const cap = await capabilityService.getCapability('messaging');
 */

import { get, post, put } from '../api';

/**
 * @constant {Object} CAPABILITY_ENDPOINTS - API endpoint paths for capabilities
 */
const CAPABILITY_ENDPOINTS = {
  BASE: '/capabilities',
  HISTORY: '/capabilities/history',
  SPECIFIC: '/capabilities/{capabilityName}'
};

/**
 * @constant {number} DEFAULT_HISTORY_LIMIT - Default limit for capability history
 */
const DEFAULT_HISTORY_LIMIT = 50;

/**
 * Get all business capabilities
 * @returns {Promise<Object>} Capabilities object
 */
export const getCapabilities = async () => {
  return await get(CAPABILITY_ENDPOINTS.BASE);
};

/**
 * Get capability change history
 * @param {number} [limit=DEFAULT_HISTORY_LIMIT] - Number of history records to fetch
 * @returns {Promise<Array>} Capability history array
 */
export const getCapabilityHistory = async (limit = DEFAULT_HISTORY_LIMIT) => {
  return await get(CAPABILITY_ENDPOINTS.HISTORY, { limit });
};

/**
 * Get specific capability status
 * @param {string} capabilityName - Name of the capability
 * @returns {Promise<Object>} Capability status
 */
export const getCapability = async (capabilityName) => {
  return await get(CAPABILITY_ENDPOINTS.SPECIFIC.replace('{capabilityName}', capabilityName));
};

