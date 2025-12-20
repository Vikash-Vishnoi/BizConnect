const axios = require('axios');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../common/constants');
const config = require('../../config/app.config');

/**
 * WhatsApp Media Service Constants
 */
const GRAPH_API_TIMEOUT = parseInt(config.whatsapp?.timeout || process.env.WHATSAPP_API_TIMEOUT || '30000');
const MESSAGING_PRODUCT = 'whatsapp';
const RECIPIENT_TYPE = 'individual';

const VIEW_ONCE_MEDIA_TYPES = ['image', 'video'];

/**
 * WhatsApp Media Service
 * Handles media operations: upload, download, delete, get URL
 */
class WhatsAppMediaService {
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
   * Upload media file to WhatsApp
   */
  async uploadMedia(file, mimeType, filename) {
    try {
      logger.info('Uploading media to WhatsApp', {
        phoneNumberId: this.phoneNumberId,
        filename,
        mimeType,
        fileSize: file.length || 'stream'
      });

      const FormData = require('form-data');
      const formData = new FormData();
      
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', file, {
        filename: filename,
        contentType: mimeType
      });

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      const mediaId = response.data.id;
      logger.info('Media uploaded successfully', {
        phoneNumberId: this.phoneNumberId,
        mediaId,
        filename
      });

      return {
        success: true,
        mediaId: mediaId,
        data: response.data
      };
    } catch (error) {
      logger.error('Upload Media Error', {
        error: error.response?.data || error.message,
        filename,
        mimeType
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get media URL and metadata
   */
  async getMediaUrl(mediaId) {
    try {
      logger.info('Retrieving media URL', {
        phoneNumberId: this.phoneNumberId,
        mediaId
      });

      const response = await axios.get(
        `${this.apiUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      logger.info('Media URL retrieved successfully', {
        phoneNumberId: this.phoneNumberId,
        mediaId,
        url: response.data.url,
        mimeType: response.data.mime_type,
        fileSize: response.data.file_size
      });

      return {
        success: true,
        url: response.data.url,
        mimeType: response.data.mime_type,
        fileSize: response.data.file_size,
        sha256: response.data.sha256,
        data: response.data
      };
    } catch (error) {
      logger.error('Get Media URL Error', {
        error: error.response?.data || error.message,
        mediaId
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Download media file from WhatsApp
   */
  async downloadMedia(mediaId) {
    try {
      logger.info('Downloading media', {
        phoneNumberId: this.phoneNumberId,
        mediaId
      });

      const mediaInfo = await this.getMediaUrl(mediaId);
      if (!mediaInfo.success) {
        return mediaInfo;
      }

      logger.debug('Downloading from URL', { url: mediaInfo.url });
      const response = await axios.get(mediaInfo.url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer'
      });

      const buffer = Buffer.from(response.data);
      logger.info('Media downloaded successfully', {
        phoneNumberId: this.phoneNumberId,
        mediaId,
        size: buffer.length
      });

      return {
        success: true,
        buffer: buffer,
        mimeType: mediaInfo.mimeType,
        fileSize: buffer.length
      };
    } catch (error) {
      logger.error('Download Media Error', {
        error: error.response?.data || error.message,
        mediaId
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Delete media file from WhatsApp
   */
  async deleteMedia(mediaId) {
    try {
      logger.info('Deleting media', {
        phoneNumberId: this.phoneNumberId,
        mediaId
      });

      const response = await axios.delete(
        `${this.apiUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      logger.info('Media deleted successfully', {
        phoneNumberId: this.phoneNumberId,
        mediaId
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      if (error.response?.status === 404) {
        logger.info('Media already deleted or not found', { mediaId });
        return {
          success: true,
          message: 'Media not found (already deleted)'
        };
      }

      logger.error('Delete Media Error', {
        error: error.response?.data || error.message,
        mediaId
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send view-once media (image or video that disappears after viewing)
   */
  async sendViewOnceMedia(phoneNumber, mediaType, mediaId, caption = '') {
    try {
      logger.info('Sending view-once media', {
        phoneNumberId: this.phoneNumberId,
        to: phoneNumber,
        mediaType
      });

      if (!['image', 'video'].includes(mediaType)) {
        throw new Error('Media type must be "image" or "video" for view-once');
      }

      if (!mediaId || typeof mediaId !== 'string') {
        throw new Error('Valid media ID is required');
      }

      const messageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: mediaType,
        [mediaType]: {
          id: mediaId,
          caption: caption || undefined,
          view_once: true
        }
      };

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data.messages[0]?.id;
      logger.info('View-once media sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to: phoneNumber,
        messageId,
        mediaType
      });

      return {
        success: true,
        messageId: messageId,
        mediaType: mediaType,
        viewOnce: true
      };

    } catch (error) {
      logger.error('Send View-Once Media Error', {
        error: error.response?.data || error.message,
        to: phoneNumber,
        mediaType
      });
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Check if media type supports view-once feature
   */
  supportsViewOnce(mediaType) {
    const supportedTypes = ['image', 'video'];
    return supportedTypes.includes(mediaType);
  }
}

module.exports = WhatsAppMediaService;
