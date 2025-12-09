const axios = require('axios');

/**
 * WhatsApp Media Service
 * Handles media operations: upload, download, delete, get URL
 */
class WhatsAppMediaService {
  constructor(config) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion;
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Upload media file to WhatsApp
   */
  async uploadMedia(file, mimeType, filename) {
    try {
      console.log('📤 Uploading media to WhatsApp...');
      console.log('   File name:', filename);
      console.log('   MIME type:', mimeType);
      console.log('   File size:', file.length || 'stream');

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
      console.log('✅ Media uploaded successfully!');
      console.log('   Media ID:', mediaId);

      return {
        success: true,
        mediaId: mediaId,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Upload Media Error:', error.response?.data || error.message);
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
      console.log('🔍 Retrieving media URL...');
      console.log('   Media ID:', mediaId);

      const response = await axios.get(
        `${this.apiUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      console.log('✅ Media URL retrieved successfully');
      console.log('   URL:', response.data.url);
      console.log('   MIME type:', response.data.mime_type);
      console.log('   File size:', response.data.file_size);

      return {
        success: true,
        url: response.data.url,
        mimeType: response.data.mime_type,
        fileSize: response.data.file_size,
        sha256: response.data.sha256,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Get Media URL Error:', error.response?.data || error.message);
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
      console.log('⬇️  Downloading media...');
      console.log('   Media ID:', mediaId);

      const mediaInfo = await this.getMediaUrl(mediaId);
      if (!mediaInfo.success) {
        return mediaInfo;
      }

      console.log('   Downloading from URL...');
      const response = await axios.get(mediaInfo.url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer'
      });

      const buffer = Buffer.from(response.data);
      console.log('✅ Media downloaded successfully');
      console.log('   Size:', buffer.length, 'bytes');

      return {
        success: true,
        buffer: buffer,
        mimeType: mediaInfo.mimeType,
        fileSize: buffer.length
      };
    } catch (error) {
      console.error('❌ Download Media Error:', error.response?.data || error.message);
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
      console.log('🗑️  Deleting media...');
      console.log('   Media ID:', mediaId);

      const response = await axios.delete(
        `${this.apiUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      console.log('✅ Media deleted successfully');

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️  Media already deleted or not found');
        return {
          success: true,
          message: 'Media not found (already deleted)'
        };
      }

      console.error('❌ Delete Media Error:', error.response?.data || error.message);
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
      console.log('👁️ Sending view-once media...');

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
      console.log('✅ View-once media sent successfully:', messageId);

      return {
        success: true,
        messageId: messageId,
        mediaType: mediaType,
        viewOnce: true
      };

    } catch (error) {
      console.error('❌ Send View-Once Media Error:', error.response?.data || error.message);
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
