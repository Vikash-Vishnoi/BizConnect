const axios = require('axios');
const logger = require('../../../common/helpers/logger');
const config = require('../../../config/server.config');
const { ERROR_CODES } = require('../../../common/constants');

/**
 * Webhook Forwarding Service
 * Forwards webhook events to customer-configured endpoints
 */

/**
 * Webhook Forwarding Constants
 */
const WEBHOOK_TIMEOUT = 10000; // 10 seconds
const WEBHOOK_EVENT_TYPES = {
  MESSAGE: 'message',
  STATUS_UPDATE: 'status_update',
  TEMPLATE_UPDATE: 'template_update',
  TEST: 'test'
};
const WEBHOOK_HEADERS = {
  BUSINESS_ID: 'X-WhatsApp-Business-ID',
  EVENT_TYPE: 'X-Event-Type'
};

class WebhookForwardingService {
  /**
   * Forward webhook event to customer endpoint
   * @param {Object} business - Business document
   * @param {string} eventType - Event type (message, status_update, template_update, etc.)
   * @param {Object} data - Event data
   * @returns {Promise<boolean>} Success status
   */
  async forwardEvent(business, eventType, data) {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      if (!business || !business._id) {
        const error = new Error('Business object is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      if (!eventType) {
        const error = new Error('Event type is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      // Check if webhook forwarding is enabled
      if (!business.settings?.notifications?.webhook?.enabled) {
        logger.debug('Webhook forwarding not enabled', {
          businessId: business._id,
          eventType
        });
        return false;
      }

      const webhookConfig = business.settings.notifications.webhook;
      
      // Check if this event type should be forwarded
      if (!webhookConfig.events || !webhookConfig.events.includes(eventType)) {
        logger.debug('Event type not configured for forwarding', {
          businessId: business._id,
          eventType,
          configuredEvents: webhookConfig.events
        });
        return false;
      }

      // Check if URL is configured
      if (!webhookConfig.url) {
        logger.warn('Webhook forwarding enabled but no URL configured', {
          businessId: business._id,
          eventType
        });
        return false;
      }

      // Prepare payload
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        businessId: business._id.toString(),
        data: data
      };

      // Forward to customer endpoint
      const response = await axios.post(webhookConfig.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          [WEBHOOK_HEADERS.BUSINESS_ID]: business._id.toString(),
          [WEBHOOK_HEADERS.EVENT_TYPE]: eventType
        },
        timeout: WEBHOOK_TIMEOUT
      });

      const processingTime = Date.now() - startTime;
      logger.info('Webhook forwarded successfully', {
        businessId: business._id,
        eventType,
        url: webhookConfig.url,
        status: response.status,
        processingTime,
        service: 'webhook-forwarding'
      });

      return true;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Webhook forwarding failed', {
        businessId: business?._id,
        eventType,
        url: business?.settings?.notifications?.webhook?.url,
        error: error.message,
        code: error.code,
        response: error.response?.data,
        processingTime,
        service: 'webhook-forwarding'
      });

      // Don't throw - webhook failures should not break main flow
      return false;
    }
  }

  /**
   * Forward message event
   * @param {Object} business - Business document
   * @param {Object} message - Message data
   * @returns {Promise<boolean>} Success status
   */
  async forwardMessageEvent(business, message) {
    return this.forwardEvent(business, WEBHOOK_EVENT_TYPES.MESSAGE, {
      messageId: message.whatsappMessageId,
      from: message.from,
      type: message.type,
      timestamp: message.timestamp,
      content: message.content
    });
  }

  /**
   * Forward status update event
   * @param {Object} business - Business document
   * @param {Object} status - Status update data
   * @returns {Promise<boolean>} Success status
   */
  async forwardStatusEvent(business, status) {
    return this.forwardEvent(business, WEBHOOK_EVENT_TYPES.STATUS_UPDATE, {
      messageId: status.id,
      status: status.status,
      timestamp: status.timestamp,
      recipientId: status.recipient_id
    });
  }

  /**
   * Forward template update event
   * @param {Object} business - Business document
   * @param {Object} template - Template data
   * @returns {Promise<boolean>} Success status
   */
  async forwardTemplateEvent(business, template) {
    return this.forwardEvent(business, WEBHOOK_EVENT_TYPES.TEMPLATE_UPDATE, {
      templateId: template._id,
      name: template.name,
      status: template.whatsappStatus,
      qualityScore: template.qualityScore
    });
  }

  /**
   * Test webhook endpoint
   * @param {string} url - Webhook URL to test
   * @param {string} businessId - Business ID for context
   * @returns {Promise<Object>} Test result
   */
  async testWebhook(url, businessId = null) {
    try {
      // Validate URL
      if (!url || typeof url !== 'string') {
        const error = new Error('Valid webhook URL is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      // Basic URL format validation
      try {
        new URL(url);
      } catch (urlError) {
        const error = new Error('Invalid URL format');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const testPayload = {
        event: WEBHOOK_EVENT_TYPES.TEST,
        timestamp: new Date().toISOString(),
        message: 'This is a test webhook from WhatsApp Marketing Platform'
      };

      const response = await axios.post(url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          [WEBHOOK_HEADERS.EVENT_TYPE]: WEBHOOK_EVENT_TYPES.TEST
        },
        timeout: WEBHOOK_TIMEOUT
      });

      logger.info('Webhook test successful', {
        url,
        businessId,
        status: response.status,
        service: 'webhook-forwarding'
      });

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        message: 'Webhook endpoint is reachable and responding'
      };
    } catch (error) {
      logger.error('Webhook test failed', {
        url,
        businessId,
        error: error.message,
        code: error.code,
        response: error.response?.data,
        service: 'webhook-forwarding'
      });

      return {
        success: false,
        error: error.message,
        code: error.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        details: error.response?.data,
        message: 'Failed to reach webhook endpoint'
      };
    }
  }
}

module.exports = new WebhookForwardingService();
module.exports.WEBHOOK_EVENT_TYPES = WEBHOOK_EVENT_TYPES;
