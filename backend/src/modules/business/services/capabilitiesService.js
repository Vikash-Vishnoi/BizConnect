const axios = require('axios');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');

/**
 * Business Capabilities Service
 * Manages WhatsApp Business Account capabilities (Payment, Messaging, etc.)
 * 
 * P0 CRITICAL FIX: Payment and advanced features cannot be managed
 */

class CapabilitiesService {
  /**
   * Get current capabilities from database
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Current capabilities
   */
  async getCapabilities(businessId) {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      return {
        messaging: business.capabilities?.messaging || 'ENABLED',
        payment: business.capabilities?.payment || 'DISABLED',
        businessManagement: business.capabilities?.businessManagement || 'DISABLED',
        lastSynced: business.capabilities?.lastSynced || null
      };

    } catch (error) {
      logger.error('Get capabilities error', { businessId, error: error.message });
      throw error;
    }
  }

  /**
   * Sync capabilities from WhatsApp API
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Updated capabilities
   */
  async syncCapabilities(businessId) {
    try {
      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error('Business not found');
      }

      const accessToken = business.whatsappConfig.accessToken;
      const wabaId = business.whatsappConfig.wabaId;
      const apiVersion = business.whatsappConfig.apiVersion || 'v17.0';

      // Fetch capabilities from WhatsApp
      const url = `https://graph.facebook.com/${apiVersion}/${wabaId}?fields=capabilities`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const capabilities = response.data.capabilities || {};

      // Update database
      business.capabilities = {
        messaging: capabilities.messaging || 'ENABLED',
        payment: capabilities.payment || 'DISABLED',
        businessManagement: capabilities.business_management || 'DISABLED',
        lastSynced: new Date()
      };

      await business.save();

      logger.info('Capabilities synced from WhatsApp', {
        businessId,
        capabilities: business.capabilities
      });

      return business.capabilities;

    } catch (error) {
      logger.error('Sync capabilities error', {
        businessId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Enable/disable payment capability
   * @param {string} businessId - Business ID
   * @param {boolean} enable - True to enable, false to disable
   * @returns {Promise<Object>} Updated capabilities
   */
  async updatePaymentCapability(businessId, enable) {
    try {
      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error('Business not found');
      }

      const accessToken = business.whatsappConfig.accessToken;
      const wabaId = business.whatsappConfig.wabaId;
      const apiVersion = business.whatsappConfig.apiVersion || 'v17.0';

      // Update payment capability on WhatsApp
      const url = `https://graph.facebook.com/${apiVersion}/${wabaId}`;
      await axios.post(
        url,
        {
          capabilities: {
            payment: enable ? 'ENABLED' : 'DISABLED'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update database
      if (!business.capabilities) {
        business.capabilities = {};
      }
      business.capabilities.payment = enable ? 'ENABLED' : 'DISABLED';
      business.capabilities.lastSynced = new Date();
      await business.save();

      logger.info(`Payment capability ${enable ? 'enabled' : 'disabled'}`, { businessId });

      return business.capabilities;

    } catch (error) {
      logger.error('Update payment capability error', {
        businessId,
        enable,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Check if a specific capability is enabled
   * @param {string} businessId - Business ID
   * @param {string} capability - Capability name (messaging, payment, businessManagement)
   * @returns {Promise<boolean>} True if enabled
   */
  async isCapabilityEnabled(businessId, capability) {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      const capabilityValue = business.capabilities?.[capability];
      return capabilityValue === 'ENABLED';

    } catch (error) {
      logger.error('Check capability error', { businessId, capability, error: error.message });
      throw error;
    }
  }

  /**
   * Get payment configuration (if payment is enabled)
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Payment configuration
   */
  async getPaymentConfiguration(businessId) {
    try {
      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error('Business not found');
      }

      const isPaymentEnabled = await this.isCapabilityEnabled(businessId, 'payment');
      if (!isPaymentEnabled) {
        throw new Error('Payment capability is not enabled');
      }

      const accessToken = business.whatsappConfig.accessToken;
      const wabaId = business.whatsappConfig.wabaId;
      const apiVersion = business.whatsappConfig.apiVersion || 'v17.0';

      // Get payment settings from WhatsApp
      const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/payment_settings`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;

    } catch (error) {
      logger.error('Get payment configuration error', {
        businessId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }
}

module.exports = new CapabilitiesService();
