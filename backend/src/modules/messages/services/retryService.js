const axios = require('axios');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');
const Conversation = require('../../../core/database/models/Conversation');

/**
 * Message Retry Service
 * Retry failed messages with exponential backoff
 * 
 * P1 FIX: Add retry for all messages (not just campaigns)
 */

class MessageRetryService {
  /**
   * Retry a single failed message
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID to retry
   * @returns {Promise<Object>} Retry result
   */
  async retryMessage(conversationId, messageId) {
    try {
      const conversation = await Conversation.findById(conversationId)
        .populate('businessId');

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const message = conversation.messages.id(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check if message is actually failed
      if (message.status !== 'failed' && message.errorCode === undefined) {
        throw new Error('Message is not in failed state');
      }

      const business = conversation.businessId;
      const accessToken = business.whatsappConfig.accessToken;
      const phoneNumberId = business.whatsappConfig.phoneNumberId;
      const apiVersion = business.whatsappConfig.apiVersion || 'v17.0';

      // Build message payload based on type
      const payload = this.buildMessagePayload(message, conversation.contactPhone);

      // Send message via WhatsApp API
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Update message status
      message.status = 'sent';
      message.errorCode = undefined;
      message.errorMessage = undefined;
      message.retryCount = (message.retryCount || 0) + 1;
      message.lastRetryAt = new Date();
      message.whatsappMessageId = response.data.messages[0].id;

      await conversation.save();

      logger.info('Message retried successfully', {
        conversationId,
        messageId,
        retryCount: message.retryCount
      });

      return {
        messageId: message._id,
        status: 'sent',
        whatsappMessageId: response.data.messages[0].id,
        retryCount: message.retryCount
      };

    } catch (error) {
      logger.error('Message retry error', {
        conversationId,
        messageId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Build message payload for retry
   * @param {Object} message - Message object
   * @param {string} recipientPhone - Recipient phone number
   * @returns {Object} WhatsApp API payload
   */
  buildMessagePayload(message, recipientPhone) {
    const payload = {
      messaging_product: 'whatsapp',
      to: recipientPhone
    };

    if (message.type === 'text') {
      payload.type = 'text';
      payload.text = { body: message.text };
    } else if (message.type === 'image') {
      payload.type = 'image';
      payload.image = {
        link: message.media.url,
        caption: message.media.caption
      };
    } else if (message.type === 'video') {
      payload.type = 'video';
      payload.video = {
        link: message.media.url,
        caption: message.media.caption
      };
    } else if (message.type === 'document') {
      payload.type = 'document';
      payload.document = {
        link: message.media.url,
        filename: message.media.filename,
        caption: message.media.caption
      };
    } else if (message.type === 'audio') {
      payload.type = 'audio';
      payload.audio = { link: message.media.url };
    } else if (message.type === 'template') {
      payload.type = 'template';
      payload.template = {
        name: message.template.name,
        language: { code: message.template.language },
        components: message.template.components
      };
    }

    return payload;
  }

  /**
   * Get list of failed messages
   * @param {string} businessId - Business ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of failed messages
   */
  async getFailedMessages(businessId, options = {}) {
    try {
      const { limit = 50, skip = 0, startDate, endDate } = options;

      // Find conversations for business
      const query = { businessId };
      
      if (startDate || endDate) {
        query.updatedAt = {};
        if (startDate) query.updatedAt.$gte = new Date(startDate);
        if (endDate) query.updatedAt.$lte = new Date(endDate);
      }

      const conversations = await Conversation.find(query)
        .select('contactPhone contactName messages')
        .limit(limit)
        .skip(skip)
        .sort({ updatedAt: -1 });

      // Extract failed messages
      const failedMessages = [];
      
      for (const conversation of conversations) {
        const failed = conversation.messages.filter(msg => 
          msg.status === 'failed' || msg.errorCode !== undefined
        );

        failed.forEach(msg => {
          failedMessages.push({
            conversationId: conversation._id,
            messageId: msg._id,
            contactPhone: conversation.contactPhone,
            contactName: conversation.contactName,
            type: msg.type,
            text: msg.text,
            errorCode: msg.errorCode,
            errorMessage: msg.errorMessage,
            retryCount: msg.retryCount || 0,
            lastRetryAt: msg.lastRetryAt,
            createdAt: msg.timestamp
          });
        });
      }

      logger.info('Retrieved failed messages', {
        businessId,
        count: failedMessages.length
      });

      return failedMessages;

    } catch (error) {
      logger.error('Get failed messages error', {
        businessId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Retry multiple messages in bulk
   * @param {string} businessId - Business ID
   * @param {Array<{conversationId, messageId}>} messages - Messages to retry
   * @returns {Promise<Object>} Bulk retry results
   */
  async retryBulk(businessId, messages) {
    try {
      const results = {
        total: messages.length,
        succeeded: 0,
        failed: 0,
        errors: []
      };

      for (const { conversationId, messageId } of messages) {
        try {
          await this.retryMessage(conversationId, messageId);
          results.succeeded++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            conversationId,
            messageId,
            error: error.message
          });
        }
      }

      logger.info('Bulk retry completed', {
        businessId,
        results
      });

      return results;

    } catch (error) {
      logger.error('Bulk retry error', {
        businessId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Auto-retry failed messages with exponential backoff
   * @param {string} businessId - Business ID
   * @param {number} maxRetries - Maximum retry attempts (default: 3)
   * @returns {Promise<Object>} Auto-retry results
   */
  async autoRetryFailed(businessId, maxRetries = 3) {
    try {
      const failedMessages = await this.getFailedMessages(businessId);
      
      // Filter messages that haven't exceeded max retries
      const toRetry = failedMessages.filter(msg => 
        (msg.retryCount || 0) < maxRetries
      );

      const results = {
        total: toRetry.length,
        succeeded: 0,
        failed: 0,
        skipped: failedMessages.length - toRetry.length,
        errors: []
      };

      for (const msg of toRetry) {
        try {
          // Check exponential backoff
          const retryDelay = Math.pow(2, msg.retryCount || 0) * 60 * 1000; // 1min, 2min, 4min, etc.
          const timeSinceLastRetry = Date.now() - (msg.lastRetryAt?.getTime() || msg.createdAt.getTime());

          if (timeSinceLastRetry < retryDelay) {
            continue; // Skip if not enough time has passed
          }

          await this.retryMessage(msg.conversationId, msg.messageId);
          results.succeeded++;

        } catch (error) {
          results.failed++;
          results.errors.push({
            conversationId: msg.conversationId,
            messageId: msg.messageId,
            error: error.message
          });
        }
      }

      logger.info('Auto-retry completed', {
        businessId,
        results
      });

      return results;

    } catch (error) {
      logger.error('Auto-retry error', {
        businessId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new MessageRetryService();
