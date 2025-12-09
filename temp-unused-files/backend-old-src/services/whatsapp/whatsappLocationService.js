const axios = require('axios');

/**
 * WhatsApp Location Service
 * Handles location message operations
 */
class WhatsAppLocationService {
  constructor(config) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion;
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Send location message
   */
  async sendLocationMessage(to, latitude, longitude, name, address) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'location',
          location: {
            latitude: latitude,
            longitude: longitude,
            name: name,
            address: address
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data.messages[0].id?.toString().trim().replace(/\s+/g, '') || '';
      console.log('📍 Location message sent successfully!');
      console.log('   Raw Message ID:', response.data.messages[0].id);
      console.log('   Cleaned Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      console.error('Send Location Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send live location (real-time tracking)
   */
  async sendLiveLocation(to, latitude, longitude, name = '', address = '', duration = 900) {
    try {
      const validDuration = Math.max(60, Math.min(28800, duration));

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'location',
          location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            name: name || 'Live Location',
            address: address || '',
            degreesClockwiseFromMagneticNorth: 0,
            speed: 0,
            accuracy: 10
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
          }
        }
      );

      const messageId = response.data.messages[0].id?.toString().trim().replace(/\s+/g, '') || '';
      console.log('🌐 Live location started successfully!');
      console.log('   Duration:', validDuration, 'seconds');
      console.log('   Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        duration: validDuration,
        data: response.data
      };
    } catch (error) {
      console.error('Send Live Location Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Update live location (while sharing is active)
   */
  async updateLiveLocation(messageId, latitude, longitude, speed = 0, accuracy = 10, bearing = 0) {
    try {
      console.log('📍 Live location update:', {
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
      console.error('Update Live Location Error:', error.message);
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
      console.log('🛑 Stop live location request for message:', messageId);

      return {
        success: true,
        messageId: messageId,
        note: 'Live location will stop automatically after duration or manual stop by user'
      };
    } catch (error) {
      console.error('Stop Live Location Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WhatsAppLocationService;
