const axios = require('axios');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');
const Conversation = require('../../../core/database/models/Conversation');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const config = require('../../../config/app.config');

// Constants for message retry logic
const DEFAULT_API_VERSION = 'v22.0';
const MAX_AUTO_RETRY_COUNT = 3;
const RETRY_BACKOFF_BASE_MS = 60000; // 1 minute base delay
const DEFAULT_FAILED_MESSAGE_LIMIT = 50;
const RETRY_TIMEOUT_MS = 30000; // 30 seconds
const MESSAGE_STATUS_FAILED = 'failed';
const MESSAGE_STATUS_SENT = 'sent';

/**
 * Message Retry Service
 * Retry failed messages with exponential backoff
 * 
 * P1 FIX: Add retry for all messages (not just campaigns)
 */

class MessageRetryService {
  constructor() {
    // Validate required dependencies
    if (!Business || !Conversation) {
      throw new Error(ERROR_CODES.CONFIGURATION_ERROR + ': Required models are missing');
    }
    if (!logger) {
      throw new Error(ERROR_CODES.CONFIGURATION_ERROR + ': Logger is required');
    }
  }

  /**
   * Retry a single failed message
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID to retry
   * @returns {Promise<Object>} Retry result
   */
  async retryMessage(conversationId, messageId) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!conversationId) {
        const error = new Error('conversationId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!messageId) {
        const error = new Error('messageId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      const conversation = await Conversation.findById(conversationId)
        .populate('businessId');

      if (!conversation) {
        const error = new Error('Conversation not found');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      const message = conversation.messages.id(messageId);
      if (!message) {
        const error = new Error('Message not found');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      // Check if message is actually failed
      if (message.status !== MESSAGE_STATUS_FAILED && message.errorCode === undefined) {
        const error = new Error('Message is not in failed state');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const business = conversation.businessId;
      const accessToken = business.whatsappConfig.accessToken;
      const phoneNumberId = business.whatsappConfig.phoneNumberId;
      const apiVersion = business.whatsappConfig.apiVersion || DEFAULT_API_VERSION;

      // Build message payload based on type
      const payload = this.buildMessagePayload(message, conversation.contactPhone);

      // Send message via WhatsApp API
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: config.externalApi?.timeout || RETRY_TIMEOUT_MS
      });

      // Update message status
      message.status = MESSAGE_STATUS_SENT;
      message.errorCode = undefined;
      message.errorMessage = undefined;
      message.retryCount = (message.retryCount || 0) + 1;
      message.lastRetryAt = new Date();
      message.whatsappMessageId = response.data.messages[0].id;

      await conversation.save();

      const processingTime = Date.now() - startTime;
      logger.info('Message retried successfully', {
        conversationId: conversationId.toString(),
        messageId: messageId.toString(),
        retryCount: message.retryCount,
        processingTime
      });

      return {
        success: true,
        messageId: message._id,
        status: MESSAGE_STATUS_SENT,
        whatsappMessageId: response.data.messages[0].id,
        retryCount: message.retryCount,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Message retry failed', {
        conversationId: conversationId.toString(),
        messageId: messageId.toString(),
        error: error.message,
        errorCode: error.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR;
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

      const processingTime = Date.now() - startTime;
      logger.info('Failed messages retrieved', {
        businessId: businessId.toString(),
        count: failedMessages.length,
        processingTime
      });

      return failedMessages;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Get failed messages error', {
        businessId: businessId.toString(),
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
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
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!businessId) {
        const error = new Error('businessId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        const error = new Error('messages array is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
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

      const processingTime = Date.now() - startTime;
      logger.info('Bulk retry completed', {
        businessId: businessId.toString(),
        results,
        processingTime
      });

      return {
        ...results,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Bulk retry error', {
        businessId: businessId.toString(),
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * Auto-retry failed messages with exponential backoff
   * @param {string} businessId - Business ID
   * @param {number} maxRetries - Maximum retry attempts (default: 3)
   * @returns {Promise<Object>} Auto-retry results
   */
  async autoRetryFailed(businessId, maxRetries = MAX_AUTO_RETRY_COUNT) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!businessId) {
        const error = new Error('businessId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
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
          const retryDelay = Math.pow(2, msg.retryCount || 0) * RETRY_BACKOFF_BASE_MS; // 1min, 2min, 4min, etc.
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

      const processingTime = Date.now() - startTime;
      logger.info('Auto-retry completed', {
        businessId: businessId.toString(),
        results,
        processingTime
      });

      return {
        ...results,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Auto-retry error', {
        businessId: businessId.toString(),
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }
}

module.exports = new MessageRetryService();
