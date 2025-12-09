import { get, post, put } from '../api';

/**
 * 🔧 Business Capabilities Service
 * Handles business capability and restriction tracking
 */

/**
 * Get business capabilities
 */
export const getCapabilities = async () => {
  return await get('/capabilities');
};

/**
 * Get capability change history
 */
export const getCapabilityHistory = async (limit = 50) => {
  return await get('/capabilities/history', { limit });
};

/**
 * Get specific capability status
 */
export const getCapability = async (capabilityName) => {
  return await get(`/capabilities/${capabilityName}`);
};

