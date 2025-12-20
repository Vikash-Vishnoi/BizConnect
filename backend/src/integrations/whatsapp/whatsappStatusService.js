const axios = require('axios');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../../common/constants');
const config = require('../../config/app.config');

/**
 * WhatsApp Status Service Constants
 */
const GRAPH_API_TIMEOUT = parseInt(config.whatsapp?.timeout || process.env.WHATSAPP_API_TIMEOUT || '30000');
const STATUS_EXPIRY_DURATION = 24 * TIME_CONSTANTS.HOUR_MS; // 24 hours
const STATUS_DEFAULT_BG_COLOR = '#128C7E';
const STATUS_DEFAULT_TEXT_COLOR = '#FFFFFF';
const STATUS_DEFAULT_FONT = 'default';

const STATUS_MEDIA_TYPES = ['image', 'video'];

/**
 * WhatsApp Status Service
 * Handles status updates (24-hour stories)
 */
class WhatsAppStatusService {
  constructor(config) {
    if (!config || !config.phoneNumberId || !config.accessToken) {
      throw new Error('WhatsApp configuration (phoneNumberId, accessToken) is required');
    }
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || 'v22.0';
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.timeout = GRAPH_API_TIMEOUT;
  }

  /**
   * Send Text Status Update (24-hour story)
   */
  async sendTextStatus(content, options = {}) {
    const startTime = Date.now();
    
    try {
      if (!content || typeof content !== 'string') {
        return {
          success: false,
          error: 'Status content is required and must be a string',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      logger.info('Sending text status', {
        phoneNumberId: this.phoneNumberId,
        contentLength: content?.length
      });

      const {
        backgroundColor = STATUS_DEFAULT_BG_COLOR,
        textColor = STATUS_DEFAULT_TEXT_COLOR,
        font = STATUS_DEFAULT_FONT
      } = options;

      const formattedContent = `📢 *Status Update*\n\n${content}`;
      const expiresAt = new Date(Date.now() + STATUS_EXPIRY_DURATION);

      logger.info('Status formatted (API not yet available)', {
        phoneNumberId: this.phoneNumberId,
        expiresAt,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        messageIds: [],
        note: 'Status API not yet available in WhatsApp Cloud API. Use broadcast messages.',
        statusContent: formattedContent,
        expiresAt
      };

    } catch (error) {
      logger.error('Send Text Status Error', {
        error: error.message,
        phoneNumberId: this.phoneNumberId,
        code: ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.message,
        code: ERROR_CODES.INTERNAL_ERROR
      };
    }
  }

  /**
   * Send Media Status Update
   */
  async sendMediaStatus(mediaType, mediaId, caption = '') {
    const startTime = Date.now();
    
    try {
      if (!STATUS_MEDIA_TYPES.includes(mediaType)) {
        return {
          success: false,
          error: `Media type must be one of: ${STATUS_MEDIA_TYPES.join(', ')}`,
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      if (!mediaId) {
        return {
          success: false,
          error: 'Media ID is required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      logger.info('Sending media status', {
        phoneNumberId: this.phoneNumberId,
        mediaType,
        mediaId
      });

      const expiresAt = new Date(Date.now() + STATUS_EXPIRY_DURATION);

      logger.info('Media status formatted (API not yet available)', {
        phoneNumberId: this.phoneNumberId,
        mediaType,
        expiresAt,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        messageIds: [],
        note: 'Status API not yet available in WhatsApp Cloud API. Use broadcast messages.',
        mediaType,
        mediaId,
        caption,
        expiresAt
      };

    } catch (error) {
      logger.error('Send Media Status Error', {
        error: error.message,
        mediaType,
        phoneNumberId: this.phoneNumberId,
        code: ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.message,
        code: ERROR_CODES.INTERNAL_ERROR
      };
    }
  }

  /**
   * Delete Status
   */
  async deleteStatus(messageId) {
    try {
      logger.info('Deleting status', {
        phoneNumberId: this.phoneNumberId,
        messageId
      });

      if (!messageId) {
        throw new Error('Message ID is required');
      }

      return {
        success: true,
        note: 'Status cannot be deleted via API. It will expire in 24 hours.',
        messageId
      };

    } catch (error) {
      logger.error('Delete Status Error', {
        error: error.message,
        messageId,
        phoneNumberId: this.phoneNumberId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WhatsAppStatusService;
