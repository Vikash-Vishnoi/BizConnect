const axios = require('axios');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES } = require('../../common/constants');
const rateLimitService = require('../notifications/rateLimitService');
const WhatsAppMessagingService = require('./whatsappMessagingService');
const WhatsAppMediaService = require('./whatsappMediaService');
const WhatsAppTemplateService = require('./whatsappTemplateService');
const WhatsAppLocationService = require('./whatsappLocationService');
const WhatsAppBusinessService = require('./whatsappBusinessService');
const WhatsAppAccountService = require('./whatsappAccountService');
const WhatsAppStatusService = require('./whatsappStatusService');
const WhatsAppGroupService = require('./whatsappGroupService');

/**
 * WhatsApp Service Constants
 */
const DEFAULT_API_VERSION = 'v22.0';
const NODE_ENV_PRODUCTION = 'production';
const INDIA_COUNTRY_CODE = '91';
const INDIAN_PHONE_LENGTH = 10;
const INDIAN_PHONE_WITH_CODE_LENGTH = 12;

/**
 * Core WhatsApp Service - Orchestrates all WhatsApp API operations
 * This is the main entry point for all WhatsApp functionality
 * Refactored into modular services for better maintainability
 */
class WhatsAppService {
  /**
   * Create WhatsApp Service instance
   * @param {Object} credentials - Business-specific WhatsApp credentials
   * @param {string} credentials.phoneNumberId - WhatsApp Phone Number ID
   * @param {string} credentials.accessToken - WhatsApp Access Token
   * @param {string} credentials.wabaId - WhatsApp Business Account ID
   * @param {string} credentials.apiVersion - API version (defaults to v22.0)
   */
  constructor(credentials = null) {
    // Multi-business support: Accept credentials or fallback to env variables
    if (credentials) {
      this.phoneNumberId = credentials.phoneNumberId;
      this.accessToken = credentials.accessToken;
      this.businessAccountId = credentials.wabaId;
      this.apiVersion = credentials.apiVersion || DEFAULT_API_VERSION;
      this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
      logger.info('WhatsAppService initialized for business', {
        phoneNumberId: this.phoneNumberId,
        apiVersion: this.apiVersion
      });
    } else {
      // Fallback to environment variables (DEVELOPMENT ONLY)
      this.apiVersion = DEFAULT_API_VERSION;
      this.apiUrl = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/${this.apiVersion}`;
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
      
      // Warn about multi-business architecture
      if (process.env.NODE_ENV === NODE_ENV_PRODUCTION) {
        logger.error('CRITICAL: WhatsAppService initialized without credentials in PRODUCTION', {
          message: 'This is a multi-business platform. You MUST pass business credentials.',
          example: 'new WhatsAppService(await business.getWhatsAppCredentials())',
          code: ERROR_CODES.CONFIGURATION_ERROR
        });
      } else if (this.accessToken) {
        logger.warn('DEV MODE: Using env credentials as fallback. For production, always pass business credentials to constructor');
      }
    }

    // Initialize service modules
    const config = {
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      wabaId: this.businessAccountId,
      apiVersion: this.apiVersion
    };

    this.messaging = new WhatsAppMessagingService(config);
    this.media = new WhatsAppMediaService(config);
    this.templates = new WhatsAppTemplateService(config);
    this.location = new WhatsAppLocationService(config);
    this.business = new WhatsAppBusinessService(config);
    this.account = new WhatsAppAccountService(config);
    this.status = new WhatsAppStatusService(config);
    this.group = new WhatsAppGroupService(config);
  }

  _attachInterceptor() {
    if (this._interceptorAttached) return;
    axios.interceptors.response.use(
      async (response) => {
        try {
          const headers = response.headers || {};
          const endpoint = response.config?.url || '';
          await rateLimitService.record(headers, endpoint);
        } catch (err) {
          logger.error('Failed to record rate limit headers', { error: err.message });
        }
        return response;
      },
      async (error) => {
        try {
          const headers = error.response?.headers || {};
          const endpoint = error.config?.url || '';
          await rateLimitService.record(headers, endpoint);
        } catch (err) {
          logger.error('Failed to record rate limit headers (error response)', { error: err.message });
        }
        return Promise.reject(error);
      }
    );
    this._interceptorAttached = true;
  }

  verifyWebhookSignature(payload, signature, appSecret = null) {
    const crypto = require('crypto');
    const secret = appSecret || process.env.WHATSAPP_APP_SECRET || process.env.APP_SECRET;
    if (!secret) {
      logger.warn('WHATSAPP_APP_SECRET not configured');
      return false;
    }
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      const error = new Error('Phone number is required');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      throw error;
    }

    let formatted = phoneNumber.replace(/\D/g, '');
    
    if (formatted.startsWith(INDIA_COUNTRY_CODE) && formatted.length === INDIAN_PHONE_WITH_CODE_LENGTH) {
      return formatted;
    }
    
    if (formatted.length === INDIAN_PHONE_LENGTH) {
      return INDIA_COUNTRY_CODE + formatted;
    }
    
    const error = new Error(`Invalid phone number: ${phoneNumber}. Expected ${INDIAN_PHONE_LENGTH} digits, will add ${INDIA_COUNTRY_CODE} prefix automatically.`);
    error.code = ERROR_CODES.VALIDATION_ERROR;
    throw error;
  }

  // Messaging methods
  async sendTextMessage(to, text, context = null) {
    return this.messaging.sendTextMessage(to, text, context);
  }

  async sendReaction(to, messageId, emoji) {
    return this.messaging.sendReaction(to, messageId, emoji);
  }

  async sendButtonMessage(to, bodyText, buttons) {
    return this.messaging.sendButtonMessage(to, bodyText, buttons);
  }

  async sendCTAMessage(to, bodyText, ctaButtons) {
    return this.messaging.sendCTAMessage(to, bodyText, ctaButtons);
  }

  async sendListMessage(to, bodyText, buttonText, sections) {
    return this.messaging.sendListMessage(to, bodyText, buttonText, sections);
  }

  async sendContactMessage(to, contacts) {
    return this.messaging.sendContactMessage(to, contacts);
  }

  async sendPollMessage(to, question, options) {
    return this.messaging.sendPollMessage(to, question, options);
  }

  async markAsRead(messageId) {
    return this.messaging.markAsRead(messageId);
  }

  async sendAudioMessage(to, audioUrl, context = null) {
    return this.messaging.sendAudioMessage(to, audioUrl, context);
  }

  async sendStickerMessage(to, stickerUrl, stickerId = null, context = null) {
    return this.messaging.sendStickerMessage(to, stickerUrl, stickerId, context);
  }

  async sendMediaMessage(to, mediaType, mediaUrl, caption = null, context = null) {
    return this.messaging.sendMediaMessage(to, mediaType, mediaUrl, caption, context);
  }

  // Template methods
  async sendTemplateMessage(to, templateName, languageCode, components = []) {
    return this.templates.sendTemplateMessage(to, templateName, languageCode, components);
  }

  async createTemplate(name, category, language, components) {
    return this.templates.createTemplate(name, category, language, components);
  }

  async getTemplateStatus(templateId) {
    return this.templates.getTemplateStatus(templateId);
  }

  // Media methods
  async uploadMedia(file, mimeType, filename) {
    return this.media.uploadMedia(file, mimeType, filename);
  }

  async getMediaUrl(mediaId) {
    return this.media.getMediaUrl(mediaId);
  }

  async downloadMedia(mediaId) {
    return this.media.downloadMedia(mediaId);
  }

  async deleteMedia(mediaId) {
    return this.media.deleteMedia(mediaId);
  }

  async sendViewOnceMedia(phoneNumber, mediaType, mediaId, caption = '') {
    return this.media.sendViewOnceMedia(phoneNumber, mediaType, mediaId, caption);
  }

  supportsViewOnce(mediaType) {
    return this.media.supportsViewOnce(mediaType);
  }

  // Location methods
  async sendLocationMessage(to, latitude, longitude, name, address) {
    return this.location.sendLocationMessage(to, latitude, longitude, name, address);
  }

  async sendLiveLocation(to, latitude, longitude, name = '', address = '', duration = 900) {
    return this.location.sendLiveLocation(to, latitude, longitude, name, address, duration);
  }

  async updateLiveLocation(messageId, latitude, longitude, speed = 0, accuracy = 10, bearing = 0) {
    return this.location.updateLiveLocation(messageId, latitude, longitude, speed, accuracy, bearing);
  }

  async stopLiveLocation(messageId) {
    return this.location.stopLiveLocation(messageId);
  }

  // Business methods
  async getBusinessProfile() {
    return this.business.getBusinessProfile();
  }

  async updateBusinessProfile(profileData) {
    return this.business.updateBusinessProfile(profileData);
  }

  async updateProfilePhoto(mediaId) {
    return this.business.updateProfilePhoto(mediaId);
  }

  async updateBusinessHours(businessHours) {
    return this.business.updateBusinessHours(businessHours);
  }

  async getBusinessHours() {
    return this.business.getBusinessHours();
  }

  async updateBusinessLocation(address) {
    return this.business.updateBusinessLocation(address);
  }

  async getBusinessLocation() {
    return this.business.getBusinessLocation();
  }

  // Account methods
  async getAccountLimits() {
    return this.account.getAccountLimits();
  }

  async getQualityRating() {
    return this.account.getQualityRating();
  }

  async getPhoneNumberHealth() {
    return this.account.getPhoneNumberHealth();
  }

  async getMessagingLimits() {
    return this.account.getMessagingLimits();
  }

  // Status methods
  async sendTextStatus(content, options = {}) {
    return this.status.sendTextStatus(content, options);
  }

  async sendMediaStatus(mediaType, mediaId, caption = '') {
    return this.status.sendMediaStatus(mediaType, mediaId, caption);
  }

  async deleteStatus(messageId) {
    return this.status.deleteStatus(messageId);
  }

  // Group methods
  async sendGroupMessage(groupId, message) {
    return this.group.sendGroupMessage(groupId, message);
  }

  async getGroupInfo(groupId) {
    return this.group.getGroupInfo(groupId);
  }

  async getGroupMetadata(groupId) {
    return this.group.getGroupMetadata(groupId);
  }

  async leaveGroup(groupId) {
    return this.group.leaveGroup(groupId);
  }

  async sendGroupTextMessage(groupId, text, context = null) {
    return this.group.sendGroupTextMessage(groupId, text, context);
  }

  async sendGroupMediaMessage(groupId, mediaType, mediaId, caption = null) {
    return this.group.sendGroupMediaMessage(groupId, mediaType, mediaId, caption);
  }
}

module.exports = WhatsAppService;
