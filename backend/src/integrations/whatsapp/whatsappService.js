const axios = require('axios');
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
   * @param {string} credentials.apiVersion - API version (defaults to v18.0)
   */
  constructor(credentials = null) {
    // Multi-business support: Accept credentials or fallback to env variables
    if (credentials) {
      this.phoneNumberId = credentials.phoneNumberId;
      this.accessToken = credentials.accessToken;
      this.businessAccountId = credentials.wabaId;
      this.apiVersion = credentials.apiVersion || 'v18.0';
      this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
      console.log(`✅ WhatsAppService initialized for business phone: ${this.phoneNumberId}`);
    } else {
      // Fallback to environment variables (DEVELOPMENT ONLY)
      this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
      this.apiVersion = 'v18.0';
      
      // Warn about multi-business architecture
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 CRITICAL: WhatsAppService initialized without credentials in PRODUCTION!');
        console.error('🚨 This is a multi-business platform. You MUST pass business credentials.');
        console.error('🚨 Example: new WhatsAppService(await business.getWhatsAppCredentials())');
      } else if (this.accessToken) {
        console.warn('⚠️  DEV MODE: Using env credentials as fallback');
        console.warn('⚠️  For production, always pass business credentials to constructor');
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
          console.error('Failed to record rate limit headers:', err);
        }
        return response;
      },
      async (error) => {
        try {
          const headers = error.response?.headers || {};
          const endpoint = error.config?.url || '';
          await rateLimitService.record(headers, endpoint);
        } catch (err) {
          console.error('Failed to record rate limit headers (error response):', err);
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
      console.warn('⚠️  WHATSAPP_APP_SECRET not configured');
      return false;
    }
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  formatPhoneNumber(phoneNumber) {
    let formatted = phoneNumber.replace(/\D/g, '');
    
    if (formatted.startsWith('91') && formatted.length === 12) {
      return formatted;
    }
    
    if (formatted.length === 10) {
      return '91' + formatted;
    }
    
    throw new Error(`Invalid phone number: ${phoneNumber}. Expected 10 digits, will add 91 prefix automatically.`);
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
