const axios = require('axios');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../../common/constants');
const config = require('../../config/app.config');

/**
 * WhatsApp Business Service Constants
 */
const GRAPH_API_TIMEOUT = parseInt(config.whatsapp?.timeout || process.env.WHATSAPP_API_TIMEOUT || '30000');
const RETRY_ATTEMPTS = parseInt(config.whatsapp?.retryAttempts || process.env.WHATSAPP_RETRY_ATTEMPTS || '3');
const RETRY_DELAY_MS = parseInt(config.whatsapp?.retryDelay || process.env.WHATSAPP_RETRY_DELAY || '1000');

const BUSINESS_PROFILE_FIELDS = [
  'about',
  'address',
  'description',
  'email',
  'profile_picture_url',
  'websites',
  'vertical'
];

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const TIME_FORMAT_REGEX = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * WhatsApp Business Service
 * Handles business profile, hours, and location management
 */
class WhatsAppBusinessService {
  constructor(config) {
    if (!config || !config.phoneNumberId || !config.accessToken) {
      throw new Error('WhatsApp config with phoneNumberId and accessToken is required');
    }

    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || 'v22.0';
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.timeout = GRAPH_API_TIMEOUT;
  }

  /**
   * Get Business Profile information
   */
  async getBusinessProfile() {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          params: {
            fields: BUSINESS_PROFILE_FIELDS.join(',')
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      logger.info('Business profile retrieved successfully', {
        phoneNumberId: this.phoneNumberId,
        processingTime: `${Date.now() - startTime}ms`
      });
      
      return {
        success: true,
        data: response.data.data[0] || {}
      };
    } catch (error) {
      logger.error('Get Business Profile Error', {
        error: error.response?.data || error.message,
        phoneNumberId: this.phoneNumberId,
        code: error.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      };
    }
  }

  /**
   * Update Business Profile information
   */
  async updateBusinessProfile(profileData) {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          messaging_product: 'whatsapp',
          ...profileData
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      logger.info('Business profile updated successfully', {
        phoneNumberId: this.phoneNumberId,
        processingTime: `${Date.now() - startTime}ms`
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Update Business Profile Error', {
        error: error.response?.data || error.message,
        phoneNumberId: this.phoneNumberId,
        code: error.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      };
    }
  }

  /**
   * Upload and set business profile photo
   */
  async updateProfilePhoto(mediaId) {
    const startTime = Date.now();
    
    try {
      if (!mediaId) {
        return {
          success: false,
          error: 'Media ID is required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          messaging_product: 'whatsapp',
          profile_picture_handle: mediaId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      logger.info('Profile photo updated successfully', {
        phoneNumberId: this.phoneNumberId,
        mediaId,
        processingTime: `${Date.now() - startTime}ms`
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Update Profile Photo Error', {
        error: error.response?.data || error.message,
        phoneNumberId: this.phoneNumberId,
        code: error.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      };
    }
  }

  /**
   * Update Business Hours
   */
  async updateBusinessHours(businessHours) {
    const startTime = Date.now();
    
    try {
      logger.info('Updating business hours', {
        phoneNumberId: this.phoneNumberId
      });

      // Validate business hours format
      for (const day of DAYS_OF_WEEK) {
        if (businessHours[day]) {
          const { open_time, close_time, is_open } = businessHours[day];
          
          if (is_open) {
            if (!TIME_FORMAT_REGEX.test(open_time)) {
              return {
                success: false,
                error: `Invalid open_time format for ${day}. Use HH:MM (24-hour format)`,
                code: ERROR_CODES.VALIDATION_ERROR
              };
            }
            if (!timeRegex.test(close_time)) {
              throw new Error(`Invalid close_time format for ${day}. Use HH:MM (24-hour format)`);
            }
          }
        }
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          messaging_product: 'whatsapp',
          business_hours: businessHours
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Business hours updated successfully', {
        phoneNumberId: this.phoneNumberId
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Update Business Hours Error', {
        error: error.response?.data || error.message,
        phoneNumberId: this.phoneNumberId
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get Business Hours
   */
  async getBusinessHours() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          params: {
            fields: 'business_hours'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const businessHours = response.data.data[0]?.business_hours || {};
      logger.info('Business hours retrieved successfully', {
        phoneNumberId: this.phoneNumberId
      });
      
      return {
        success: true,
        data: businessHours
      };
    } catch (error) {
      logger.error('Get Business Hours Error', {
        error: error.response?.data || error.message,
        phoneNumberId: this.phoneNumberId
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Update Business Location
   */
  async updateBusinessLocation(address) {
    try {
      logger.info('Updating business location', {
        phoneNumberId: this.phoneNumberId
      });

      if (!address || typeof address !== 'string' || address.trim() === '') {
        throw new Error('Valid address is required');
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          messaging_product: 'whatsapp',
          address: address.trim()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Business location updated successfully', {
        phoneNumberId: this.phoneNumberId
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Update Business Location Error', {
        error: error.response?.data || error.message,
        phoneNumberId: this.phoneNumberId
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get Business Location
   */
  async getBusinessLocation() {
    try {
      logger.info('Fetching business location', {
        phoneNumberId: this.phoneNumberId
      });

      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          params: {
            fields: 'address'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const address = response.data.data[0]?.address || '';
      logger.info('Business location retrieved', {
        phoneNumberId: this.phoneNumberId
      });
      
      return {
        success: true,
        address: address
      };
    } catch (error) {
      logger.error('Get Business Location Error', {
        error: error.response?.data || error.message,
        phoneNumberId: this.phoneNumberId
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

module.exports = WhatsAppBusinessService;
