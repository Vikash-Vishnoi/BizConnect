const axios = require('axios');
const logger = require('../../../common/helpers/logger');

/**
 * Webhook Forwarding Service
 * Forwards webhook events to customer-configured endpoints
 * 
 * P1 FIX: Custom webhook event forwarding
 */

class WebhookForwardingService {
  /**
   * Forward webhook event to customer endpoint
   * @param {Object} business - Business document
   * @param {string} eventType - Event type (message, status, template_update, etc.)
   * @param {Object} data - Event data
   * @returns {Promise<boolean>} Success status
   */
  async forwardEvent(business, eventType, data) {
    try {
      // Check if webhook forwarding is enabled
      if (!business.settings?.notifications?.webhook?.enabled) {
        return false;
      }

      const webhookConfig = business.settings.notifications.webhook;
      
      // Check if this event type should be forwarded
      if (!webhookConfig.events || !webhookConfig.events.includes(eventType)) {
        return false;
      }

      // Check if URL is configured
      if (!webhookConfig.url) {
        logger.warn('Webhook forwarding enabled but no URL configured', {
          businessId: business._id
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
          'X-WhatsApp-Business-ID': business._id.toString(),
          'X-Event-Type': eventType
        },
        timeout: 10000 // 10 second timeout
      });

      logger.info('Webhook forwarded successfully', {
        businessId: business._id,
        eventType,
        url: webhookConfig.url,
        status: response.status
      });

      return true;

    } catch (error) {
      logger.error('Webhook forwarding failed', {
        businessId: business._id,
        eventType,
        url: business.settings?.notifications?.webhook?.url,
        error: error.message,
        response: error.response?.data
      });

      // Optionally: Implement retry logic here
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
    return this.forwardEvent(business, 'message', {
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
    return this.forwardEvent(business, 'status_update', {
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
    return this.forwardEvent(business, 'template_update', {
      templateId: template._id,
      name: template.name,
      status: template.whatsappStatus,
      qualityScore: template.qualityScore
    });
  }

  /**
   * Test webhook endpoint
   * @param {string} url - Webhook URL to test
   * @returns {Promise<Object>} Test result
   */
  async testWebhook(url) {
    try {
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        message: 'This is a test webhook from WhatsApp Marketing Platform'
      };

      const response = await axios.post(url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Type': 'test'
        },
        timeout: 10000
      });

      return {
        success: true,
        status: response.status,
        message: 'Webhook endpoint is reachable'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to reach webhook endpoint'
      };
    }
  }
}

module.exports = new WebhookForwardingService();
