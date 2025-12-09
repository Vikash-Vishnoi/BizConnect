const axios = require('axios');

/**
 * WhatsApp Messaging Service
 * Handles all message sending operations: text, reactions, buttons, lists, CTAs, contacts, polls
 */
class WhatsAppMessagingService {
  constructor(config) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion;
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Send a text message with optional reply context
   */
  async sendTextMessage(to, text, context = null) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
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
          }
        }
      );

      const messageId = response.data.messages[0].id?.toString().trim().replace(/\s+/g, '') || '';
      
      console.log('📤 Text message sent successfully!');
      console.log('   Raw Message ID:', response.data.messages[0].id);
      console.log('   Cleaned Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      if (error.response?.data?.error?.code === 190 || 
          error.response?.data?.error?.message?.includes('token') ||
          error.response?.status === 401) {
        console.error('❌ WhatsApp Token Error: Access token is invalid or expired!');
        console.error('   Please update WHATSAPP_ACCESS_TOKEN in .env file');
        console.error('   Get new token from: https://developers.facebook.com/apps/');
      }
      console.error('WhatsApp API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
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
      console.log('😊 Reaction sent successfully!');
      console.log('   Raw Message ID:', response.data.messages[0].id);
      console.log('   Cleaned Message ID:', reactionMessageId);

      return {
        success: true,
        messageId: reactionMessageId,
        data: response.data
      };
    } catch (error) {
      console.error('Send Reaction Error:', error.response?.data || error.message);
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
      console.log('🔘 Button message sent successfully!');
      console.log('   Raw Message ID:', response.data.messages[0].id);
      console.log('   Cleaned Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      console.error('Send Button Message Error:', error.response?.data || error.message);
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
      console.log('🔗 CTA message sent successfully!');
      console.log('   Message Type:', ctaButtons.map(b => b.type).join(', '));
      console.log('   Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      console.error('Send CTA Message Error:', error.response?.data || error.message);
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
      console.log('📋 List message sent successfully!');
      console.log('   Raw Message ID:', response.data.messages[0].id);
      console.log('   Cleaned Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      console.error('Send List Message Error:', error.response?.data || error.message);
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
      console.log('👤 Contact message sent successfully!');
      console.log('   Raw Message ID:', response.data.messages[0].id);
      console.log('   Cleaned Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      console.error('Send Contact Error:', error.response?.data || error.message);
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
      console.log('📊 Poll message sent successfully!');
      console.log('   Question:', question);
      console.log('   Options:', options.length);
      console.log('   Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      console.error('Send Poll Error:', error.response?.data || error.message);
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
      console.error('Mark as Read Error:', error.response?.data || error.message);
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
      console.log('🎤 Sending audio message...');
      console.log('   To:', to);
      console.log('   Audio URL:', audioUrl);

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
      console.log('✅ Audio message sent successfully!');
      console.log('   Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Send Audio Error:', error.response?.data || error.message);
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
      console.log('😊 Sending sticker message...');
      console.log('   To:', to);
      console.log('   Sticker URL:', stickerUrl);

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
      console.log('✅ Sticker message sent successfully!');
      console.log('   Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Send Sticker Error:', error.response?.data || error.message);
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
      console.log('📤 Media message sent successfully!');
      console.log('   Raw Message ID:', response.data.messages[0].id);
      console.log('   Cleaned Message ID:', messageId);

      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      console.error('Send Media Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

module.exports = WhatsAppMessagingService;
