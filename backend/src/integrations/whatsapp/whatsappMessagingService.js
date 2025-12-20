const axios = require('axios');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS, TIME_CONSTANTS } = require('../../common/constants');
const config = require('../../config/app.config');

/**
 * WhatsApp Messaging Service Constants
 */
const GRAPH_API_TIMEOUT = parseInt(config.whatsapp?.timeout || process.env.WHATSAPP_API_TIMEOUT || '30000');
const MESSAGING_PRODUCT = 'whatsapp';
const RECIPIENT_TYPE = 'individual';

const MESSAGE_TYPES = {
  TEXT: 'text',
  REACTION: 'reaction',
  INTERACTIVE: 'interactive',
  CONTACTS: 'contacts',
  AUDIO: 'audio',
  STICKER: 'sticker'
};

const INTERACTIVE_TYPES = {
  BUTTON: 'button',
  LIST: 'list',
  CTA_URL: 'cta_url'
};

const CTA_BUTTON_TYPES = {
  PHONE_NUMBER: 'PHONE_NUMBER',
  URL: 'URL'
};

const BUTTON_TITLE_MAX_LENGTH = 20;
const MAX_CTA_BUTTONS = 2;
const MAX_REPLY_BUTTONS = 3;
const MAX_LIST_SECTIONS = 10;

const TOKEN_ERROR_CODE = 190;

/**
 * WhatsApp Messaging Service
 * Handles all message sending operations: text, reactions, buttons, lists, CTAs, contacts, polls
 */
class WhatsAppMessagingService {
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
   * Send a text message with optional reply context
   */
  async sendTextMessage(to, text, context = null) {
    const startTime = Date.now();
    
    try {
      if (!to || !text) {
        return {
          success: false,
          error: 'Recipient and message text are required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      const payload = {
        messaging_product: MESSAGING_PRODUCT,
        recipient_type: RECIPIENT_TYPE,
        to: to,
        type: MESSAGE_TYPES.TEXT,
        text: {
          preview_url: false,
          body: text
        }
      };

      if (context && context.message_id) {
        payload.context = { message_id: context.message_id };
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      const messageId = response.data.messages?.[0]?.id?.toString().trim().replace(/\s+/g, '') || '';
      
      logger.info('Text message sent successfully', {
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
      if (error.response?.data?.error?.code === TOKEN_ERROR_CODE || 
          error.response?.data?.error?.message?.includes('token') ||
          error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
        logger.error('WhatsApp Token Error: Access token is invalid or expired', {
          message: 'Please update WHATSAPP_ACCESS_TOKEN in .env file',
          url: 'https://developers.facebook.com/apps/',
          code: ERROR_CODES.CONFIGURATION_ERROR
        });
      }
      logger.error('WhatsApp API Error', {
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
   * Send reaction to a message
   */
  async sendReaction(to, messageId, emoji) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'reaction',
          reaction: {
            message_id: messageId,
            emoji: emoji
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const reactionMessageId = response.data.messages[0].id?.toString().trim().replace(/\s+/g, '') || '';
      logger.info('Reaction sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId: reactionMessageId,
        emoji
      });

      return {
        success: true,
        messageId: reactionMessageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Send Reaction Error', {
        error: error.response?.data || error.message,
        to,
        emoji
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send interactive button message
   */
  async sendButtonMessage(to, bodyText, buttons) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: bodyText
            },
            action: {
              buttons: buttons.map((btn, idx) => ({
                type: 'reply',
                reply: {
                  id: btn.id || `btn_${idx}`,
                  title: btn.title.substring(0, 20)
                }
              }))
            }
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
      logger.info('Button message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId,
        buttonCount: buttons.length
      });

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Send Button Message Error', {
        error: error.response?.data || error.message,
        to
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send interactive CTA (Call-to-Action) buttons message
   */
  async sendCTAMessage(to, bodyText, ctaButtons) {
    try {
      if (!Array.isArray(ctaButtons) || ctaButtons.length === 0 || ctaButtons.length > 2) {
        throw new Error('CTA message must have 1-2 action buttons');
      }

      for (const btn of ctaButtons) {
        if (!btn.type || !['PHONE_NUMBER', 'URL'].includes(btn.type)) {
          throw new Error('Button type must be PHONE_NUMBER or URL');
        }
        if (!btn.title || btn.title.length > 20) {
          throw new Error('Button title must be 1-20 characters');
        }
        if (btn.type === 'PHONE_NUMBER') {
          if (!btn.phone_number || !btn.phone_number.match(/^\+?[1-9]\d{1,14}$/)) {
            throw new Error('Invalid phone number format (E.164 required)');
          }
        }
        if (btn.type === 'URL') {
          if (!btn.url || !btn.url.match(/^https?:\/\/.+/)) {
            throw new Error('Invalid URL format (must start with http:// or https://)');
          }
        }
      }

      const actionButtons = ctaButtons.map((btn) => {
        if (btn.type === 'PHONE_NUMBER') {
          return {
            type: 'phone_number',
            phone_number: {
              display_phone_number: btn.phone_number,
              phone_number: btn.phone_number
            },
            title: btn.title.substring(0, 20)
          };
        } else {
          return {
            type: 'url',
            url: {
              display_url: btn.url,
              url: btn.url
            },
            title: btn.title.substring(0, 20)
          };
        }
      });

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'cta_url',
            body: {
              text: bodyText
            },
            action: {
              buttons: actionButtons
            }
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
      logger.info('CTA message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId,
        messageType: ctaButtons.map(b => b.type).join(', ')
      });

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Send CTA Message Error', {
        error: error.response?.data || error.message,
        to
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send interactive list message
   */
  async sendListMessage(to, bodyText, buttonText, sections) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: {
              text: bodyText
            },
            action: {
              button: buttonText,
              sections: sections
            }
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
      logger.info('List message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId,
        sectionCount: sections.length
      });

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Send List Message Error', {
        error: error.response?.data || error.message,
        to
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send contact card
   */
  async sendContactMessage(to, contacts) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'contacts',
          contacts: contacts
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data.messages[0].id?.toString().trim().replace(/\s+/g, '') || '';
      logger.info('Contact message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId,
        contactCount: contacts.length
      });

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Send Contact Error', {
        error: error.response?.data || error.message,
        to
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send interactive poll message
   */
  async sendPollMessage(to, question, options) {
    try {
      if (!Array.isArray(options) || options.length < 2 || options.length > 12) {
        throw new Error('Poll must have between 2 and 12 options');
      }

      for (const option of options) {
        if (!option || option.length > 20) {
          throw new Error('Each poll option must be 1-20 characters');
        }
      }

      if (!question || question.length > 255) {
        throw new Error('Poll question must be 1-255 characters');
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'poll_message_creation',
            body: {
              text: question
            },
            action: {
              buttons: options.map(option => ({ type: 'text', title: option }))
            }
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
      logger.info('Poll message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId,
        question,
        optionsCount: options.length
      });

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Send Poll Error', {
        error: error.response?.data || error.message,
        to,
        question
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Mark as Read Error', {
        error: error.response?.data || error.message,
        messageId
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send audio message with optional reply context
   */
  async sendAudioMessage(to, audioUrl, context = null) {
    try {
      logger.info('Sending audio message', {
        phoneNumberId: this.phoneNumberId,
        to,
        audioUrl
      });

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'audio',
        audio: {
          link: audioUrl
        }
      };

      if (context && context.message_id) {
        payload.context = {
          message_id: context.message_id
        };
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data.messages[0].id?.toString().trim().replace(/\s+/g, '') || '';
      logger.info('Audio message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId
      });

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Send Audio Error', {
        error: error.response?.data || error.message,
        to,
        audioUrl
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send sticker message
   */
  async sendStickerMessage(to, stickerUrl, stickerId = null, context = null) {
    try {
      logger.info('Sending sticker message', {
        phoneNumberId: this.phoneNumberId,
        to,
        stickerUrl
      });

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'sticker',
        sticker: stickerId ? { id: stickerId } : { link: stickerUrl }
      };

      if (context && context.message_id) {
        payload.context = {
          message_id: context.message_id
        };
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data.messages[0].id?.toString().trim().replace(/\s+/g, '') || '';
      logger.info('Sticker message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId
      });

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Send Sticker Error', {
        error: error.response?.data || error.message,
        to,
        stickerUrl
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send media message (image, video, document)
   */
  async sendMediaMessage(to, mediaType, mediaUrl, caption = null, context = null) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: mediaType
      };

      payload[mediaType] = {
        link: mediaUrl
      };

      if (caption && (mediaType === 'image' || mediaType === 'video')) {
        payload[mediaType].caption = caption;
      }

      if (context && context.message_id) {
        payload.context = {
          message_id: context.message_id
        };
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data.messages[0].id?.toString().trim().replace(/\s+/g, '') || '';
      logger.info('Media message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        messageId,
        mediaType
      });

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Send Media Error', {
        error: error.response?.data || error.message,
        to,
        mediaType
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

module.exports = WhatsAppMessagingService;
