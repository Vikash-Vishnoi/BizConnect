/**
 * Configuration Service
 * 
 * @module services/business/configService
 * @description Service for retrieving backend configuration and webhook settings.
 * Provides access to system configuration including webhook URLs and general app settings.
 * 
 * @features
 * - Retrieve webhook URL configuration
 * - Get general system configuration
 * - Backend settings access
 * 
 * @api-endpoints
 * - GET /config/webhook-url - Get webhook URL
 * - GET /config/info - Get configuration info
 * 
 * @example
 * import * as configService from './configService';
 * 
 * // Get webhook URL
 * const webhookConfig = await configService.getWebhookUrl();
 * console.log('Webhook URL:', webhookConfig.url);
 * 
 * // Get config info
 * const info = await configService.getConfigInfo();
 */

import { get } from '../api';

/**
 * @constant {Object} CONFIG_ENDPOINTS - API endpoint paths for config service
 */
const CONFIG_ENDPOINTS = {
  WEBHOOK_URL: '/config/webhook-url',
  INFO: '/config/info'
};

/**
 * Get webhook URL from backend configuration
 * @returns {Promise<Object>} Configuration data including webhook URL and verification token
 */
export const getWebhookUrl = async () => {
  return await get(CONFIG_ENDPOINTS.WEBHOOK_URL);
};

/**
 * Get general configuration information
 * @returns {Promise<Object>} System configuration data (version, features, limits)
 */
export const getConfigInfo = async () => {
  return await get(CONFIG_ENDPOINTS.INFO);
};

export default {
  getWebhookUrl,
  getConfigInfo
};
