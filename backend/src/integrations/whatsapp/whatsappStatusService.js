const axios = require('axios');

/**
 * WhatsApp Status Service
 * Handles status updates (24-hour stories)
 */
class WhatsAppStatusService {
  constructor(config) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion;
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Send Text Status Update (24-hour story)
   */
  async sendTextStatus(content, options = {}) {
    try {
      console.log('📱 Sending text status...');

      if (!content || typeof content !== 'string') {
        throw new Error('Status content is required');
      }

      const {
        backgroundColor = '#128C7E',
        textColor = '#FFFFFF',
        font = 'default'
      } = options;

      const formattedContent = `📢 *Status Update*\n\n${content}`;

      return {
        success: true,
        messageIds: [],
        note: 'Status API not yet available in WhatsApp Cloud API. Use broadcast messages.',
        statusContent: formattedContent,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

    } catch (error) {
      console.error('❌ Send Text Status Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send Media Status Update
   */
  async sendMediaStatus(mediaType, mediaId, caption = '') {
    try {
      console.log('📱 Sending media status...');

      if (!['image', 'video'].includes(mediaType)) {
        throw new Error('Media type must be "image" or "video"');
      }

      if (!mediaId) {
        throw new Error('Media ID is required');
      }

      return {
        success: true,
        messageIds: [],
        note: 'Status API not yet available in WhatsApp Cloud API. Use broadcast messages.',
        mediaType,
        mediaId,
        caption,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

    } catch (error) {
      console.error('❌ Send Media Status Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete Status
   */
  async deleteStatus(messageId) {
    try {
      console.log('🗑️ Deleting status...');

      if (!messageId) {
        throw new Error('Message ID is required');
      }

      return {
        success: true,
        note: 'Status cannot be deleted via API. It will expire in 24 hours.',
        messageId
      };

    } catch (error) {
      console.error('❌ Delete Status Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WhatsAppStatusService;
