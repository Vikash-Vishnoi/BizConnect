const axios = require('axios');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');

/**
 * Constants
 */
const CAPABILITY_STATES = {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED'
};

const CAPABILITY_TYPES = {
  MESSAGING: 'messaging',
  PAYMENT: 'payment',
  BUSINESS_MANAGEMENT: 'businessManagement'
};

const DEFAULT_API_VERSION = 'v17.0';
const GRAPH_API_BASE_URL = 'https://graph.facebook.com';

const ERROR_MESSAGES = {
  BUSINESS_NOT_FOUND: 'Business not found',
  PAYMENT_NOT_ENABLED: 'Payment capability is not enabled'
};

const API_FIELDS = {
  CAPABILITIES: 'capabilities'
};

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
    const startTime = Date.now();
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      const capabilities = {
        messaging: business.capabilities?.messaging || CAPABILITY_STATES.ENABLED,
        payment: business.capabilities?.payment || CAPABILITY_STATES.DISABLED,
        businessManagement: business.capabilities?.businessManagement || CAPABILITY_STATES.DISABLED,
        lastSynced: business.capabilities?.lastSynced || null
      };

      logger.info('Retrieved capabilities', {
        businessId: businessId.toString(),
        processingTime: Date.now() - startTime
      });

      return capabilities;

    } catch (error) {
      logger.error('Get capabilities error', {
        businessId: businessId.toString(),
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Sync capabilities from WhatsApp API
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Updated capabilities
   */
  async syncCapabilities(businessId) {
    const startTime = Date.now();
    try {
      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      const accessToken = business.whatsappConfig.accessToken;
      const wabaId = business.whatsappConfig.wabaId;
      const apiVersion = business.whatsappConfig.apiVersion || DEFAULT_API_VERSION;

      // Fetch capabilities from WhatsApp
      const url = `${GRAPH_API_BASE_URL}/${apiVersion}/${wabaId}?fields=${API_FIELDS.CAPABILITIES}`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const capabilities = response.data.capabilities || {};

      // Update database
      business.capabilities = {
        messaging: capabilities.messaging || CAPABILITY_STATES.ENABLED,
        payment: capabilities.payment || CAPABILITY_STATES.DISABLED,
        businessManagement: capabilities.business_management || CAPABILITY_STATES.DISABLED,
        lastSynced: new Date()
      };

      await business.save();

      logger.info('Capabilities synced from WhatsApp', {
        businessId: businessId.toString(),
        capabilities: business.capabilities,
        processingTime: Date.now() - startTime
      });

      return business.capabilities;

    } catch (error) {
      logger.error('Sync capabilities error', {
        businessId: businessId.toString(),
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        processingTime: Date.now() - startTime
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
    const startTime = Date.now();
    try {
      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      const accessToken = business.whatsappConfig.accessToken;
      const wabaId = business.whatsappConfig.wabaId;
      const apiVersion = business.whatsappConfig.apiVersion || DEFAULT_API_VERSION;

      // Update payment capability on WhatsApp
      const url = `${GRAPH_API_BASE_URL}/${apiVersion}/${wabaId}`;
      await axios.post(
        url,
        {
          capabilities: {
            payment: enable ? CAPABILITY_STATES.ENABLED : CAPABILITY_STATES.DISABLED
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
      business.capabilities.payment = enable ? CAPABILITY_STATES.ENABLED : CAPABILITY_STATES.DISABLED;
      business.capabilities.lastSynced = new Date();
      await business.save();

      logger.info(`Payment capability ${enable ? 'enabled' : 'disabled'}`, {
        businessId: businessId.toString(),
        enable,
        processingTime: Date.now() - startTime
      });

      return business.capabilities;

    } catch (error) {
      logger.error('Update payment capability error', {
        businessId: businessId.toString(),
        enable,
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        processingTime: Date.now() - startTime
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
    const startTime = Date.now();
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      const capabilityValue = business.capabilities?.[capability];
      const isEnabled = capabilityValue === CAPABILITY_STATES.ENABLED;

      logger.info('Checked capability status', {
        businessId: businessId.toString(),
        capability,
        isEnabled,
        processingTime: Date.now() - startTime
      });

      return isEnabled;

    } catch (error) {
      logger.error('Check capability error', {
        businessId: businessId.toString(),
        capability,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Get payment configuration (if payment is enabled)
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Payment configuration
   */
  async getPaymentConfiguration(businessId) {
    const startTime = Date.now();
    try {
      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      const isPaymentEnabled = await this.isCapabilityEnabled(businessId, CAPABILITY_TYPES.PAYMENT);
      if (!isPaymentEnabled) {
        throw new Error(ERROR_MESSAGES.PAYMENT_NOT_ENABLED);
      }

      const accessToken = business.whatsappConfig.accessToken;
      const wabaId = business.whatsappConfig.wabaId;
      const apiVersion = business.whatsappConfig.apiVersion || DEFAULT_API_VERSION;

      // Get payment settings from WhatsApp
      const url = `${GRAPH_API_BASE_URL}/${apiVersion}/${wabaId}/payment_settings`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      logger.info('Retrieved payment configuration', {
        businessId: businessId.toString(),
        processingTime: Date.now() - startTime
      });

      return response.data;

    } catch (error) {
      logger.error('Get payment configuration error', {
        businessId: businessId.toString(),
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }
}

module.exports = new CapabilitiesService();
