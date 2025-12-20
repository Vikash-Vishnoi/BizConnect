const axios = require('axios');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../../common/constants');
const config = require('../../config/app.config');

/**
 * WhatsApp Location Service Constants
 */
const GRAPH_API_TIMEOUT = parseInt(config.whatsapp?.timeout || process.env.WHATSAPP_API_TIMEOUT || '30000');
const MESSAGING_PRODUCT = 'whatsapp';
const RECIPIENT_TYPE = 'individual';
const MESSAGE_TYPE_LOCATION = 'location';

const LIVE_LOCATION_MIN_DURATION = 60; // 1 minute in seconds
const LIVE_LOCATION_MAX_DURATION = 28800; // 8 hours in seconds
const LIVE_LOCATION_DEFAULT_DURATION = 900; // 15 minutes in seconds

const LOCATION_DEFAULT_ACCURACY = 10; // meters
const LOCATION_DEFAULT_SPEED = 0;
const LOCATION_DEFAULT_BEARING = 0;

/**
 * WhatsApp Location Service
 * Handles location message operations
 */
class WhatsAppLocationService {
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
   * Send location message
   */
  async sendLocationMessage(to, latitude, longitude, name, address) {
    const startTime = Date.now();
    
    try {
      if (!to || latitude == null || longitude == null) {
        return {
          success: false,
          error: 'Recipient, latitude, and longitude are required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: MESSAGING_PRODUCT,
          recipient_type: RECIPIENT_TYPE,
          to: to,
          type: MESSAGE_TYPE_LOCATION,
          location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            name: name || '',
            address: address || ''
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      const messageId = response.data.messages?.[0]?.id?.toString().trim().replace(/\s+/g, '') || '';
      logger.info('Location message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Send Location Error', {
        error: error.response?.data || error.message,
        to,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      };
    }
  }

  /**
   * Send live location (real-time tracking)
   */
  async sendLiveLocation(to, latitude, longitude, name = '', address = '', duration = LIVE_LOCATION_DEFAULT_DURATION) {
    const startTime = Date.now();
    
    try {
      if (!to || latitude == null || longitude == null) {
        return {
          success: false,
          error: 'Recipient, latitude, and longitude are required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      const validDuration = Math.max(LIVE_LOCATION_MIN_DURATION, Math.min(LIVE_LOCATION_MAX_DURATION, parseInt(duration) || LIVE_LOCATION_DEFAULT_DURATION));

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: MESSAGING_PRODUCT,
          recipient_type: RECIPIENT_TYPE,
          to: to,
          type: MESSAGE_TYPE_LOCATION,
          location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            name: name || 'Live Location',
            address: address || '',
            degreesClockwiseFromMagneticNorth: LOCATION_DEFAULT_BEARING,
            speed: LOCATION_DEFAULT_SPEED,
            accuracy: LOCATION_DEFAULT_ACCURACY
          },
          context: {
            type: 'live_location',
            duration: validDuration
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      const messageId = response.data.messages?.[0]?.id?.toString().trim().replace(/\s+/g, '') || '';
      logger.info('Live location started successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId,
        duration: validDuration,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        messageId: messageId,
        duration: validDuration,
        data: response.data
      };
    } catch (error) {
      logger.error('Send Live Location Error', {
        error: error.response?.data || error.message,
        to,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      };
    }
  }

  /**
   * Update live location (while sharing is active)
   */
  async updateLiveLocation(messageId, latitude, longitude, speed = 0, accuracy = 10, bearing = 0) {
    try {
      logger.info('Live location update', {
        phoneNumberId: this.phoneNumberId,
        messageId,
        latitude,
        longitude,
        speed,
        accuracy,
        bearing
      });

      return {
        success: true,
        messageId: messageId,
        coordinates: { latitude, longitude },
        metadata: { speed, accuracy, bearing },
        note: 'Live location updates are handled by WhatsApp client'
      };
    } catch (error) {
      logger.error('Update Live Location Error', {
        error: error.message,
        messageId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop live location sharing
   */
  async stopLiveLocation(messageId) {
    try {
      logger.info('Stop live location request', {
        phoneNumberId: this.phoneNumberId,
        messageId
      });

      return {
        success: true,
        messageId: messageId,
        note: 'Live location will stop automatically after duration or manual stop by user'
      };
    } catch (error) {
      logger.error('Stop Live Location Error', {
        error: error.message,
        messageId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WhatsAppLocationService;
