const axios = require('axios');
const rateLimitService = require('./rateLimitService');

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    
    // Warn about token expiration
    if (this.accessToken && !process.env.WHATSAPP_SYSTEM_USER_TOKEN) {
      console.warn('⚠️  WARNING: Using temporary WhatsApp access token!');
      console.warn('⚠️  This token will expire. For production:');
      console.warn('⚠️  1. Create a System User in Meta Business Settings');
      console.warn('⚠️  2. Generate a permanent token with System User');
      console.warn('⚠️  3. Set WHATSAPP_SYSTEM_USER_TOKEN in .env');
    }
  }

  // Global axios response interceptor to capture rate-limit headers
  _attachInterceptor() {
    // Ensure we attach only once
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

  // Send a text message with optional reply context
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

      // Add context for reply-to-message feature
      if (context && context.message_id) {
        payload.context = {
          message_id: context.message_id
        };
      }

      const response = await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Clean and trim the message ID to remove any spaces or newlines
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
      // Check if error is due to expired/invalid token
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

  // Send a template message
  async sendTemplateMessage(to, templateName, languageCode, components = []) {
    try {
      const templatePayload = {
        name: templateName,
        language: {
          code: languageCode
        }
      };
      
      // Only add components if there are any (templates like hello_world don't need components)
      if (components && components.length > 0) {
        templatePayload.components = components;
      }
      
      console.log('📤 Sending template message:');
      console.log('  To:', to);
      console.log('  Template:', templateName);
      console.log('  Language:', languageCode);
      console.log('  Components:', JSON.stringify(components));
      console.log('  Payload:', JSON.stringify(templatePayload, null, 2));
      
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: templatePayload
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Clean and trim the message ID to remove any spaces or newlines
      const messageId = response.data.messages[0].id?.toString().trim().replace(/\s+/g, '') || '';
      
      console.log('✅ Template message sent successfully!');
      console.log('   Raw Message ID:', response.data.messages[0].id);
      console.log('   Cleaned Message ID:', messageId);
      
      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      console.error('❌ WhatsApp Template Error:', JSON.stringify(error.response?.data, null, 2) || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Create a message template
  async createTemplate(name, category, language, components) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.businessAccountId}/message_templates`,
        {
          name: name,
          language: language,
          category: category,
          components: components
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
        templateId: response.data.id,
        status: response.data.status,
        data: response.data
      };
    } catch (error) {
      console.error('Create Template Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Get template status
  async getTemplateStatus(templateId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${templateId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        status: response.data.status,
        data: response.data
      };
    } catch (error) {
      console.error('Get Template Status Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Send media message (image, video, document)
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

      // Add context for reply-to-message feature
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

      // Clean the message ID by removing any spaces or newlines
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

  // ✅ FEATURE: Audio Messages - Send audio message with optional reply context
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

      // Add context for reply-to-message feature
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

  // ✅ FEATURE: Stickers - Send sticker message
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

      // Add context for reply-to-message feature
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

  // Mark message as read
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

  // Verify webhook signature
  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.APP_SECRET;
    if (!appSecret) {
      console.warn('⚠️  WHATSAPP_APP_SECRET or APP_SECRET not configured');
      return false;
    }
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  // Send reaction to a message (WhatsApp Business API)
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

      // Clean the message ID by removing any spaces or newlines
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

  // Send interactive button message
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
                  title: btn.title.substring(0, 20) // Max 20 chars
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

      // Clean the message ID by removing any spaces or newlines
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

  // Send interactive CTA (Call-to-Action) buttons message
  async sendCTAMessage(to, bodyText, ctaButtons) {
    try {
      // Validate CTA buttons (max 2 buttons)
      if (!Array.isArray(ctaButtons) || ctaButtons.length === 0 || ctaButtons.length > 2) {
        throw new Error('CTA message must have 1-2 action buttons');
      }

      // Validate each button
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

      // Build action buttons array
      const actionButtons = ctaButtons.map((btn, idx) => {
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

  // Send interactive list message
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

      // Clean the message ID by removing any spaces or newlines
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

  // Send location message
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

      // Clean the message ID by removing any spaces or newlines
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

  // Send live location (real-time tracking)
  async sendLiveLocation(to, latitude, longitude, name = '', address = '', duration = 900) {
    try {
      // duration is in seconds (15 min = 900s, max 8 hours = 28800s)
      // Valid range: 60 to 28800 seconds (1 minute to 8 hours)
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
            degreesClockwiseFromMagneticNorth: 0, // Optional: compass direction
            speed: 0, // Optional: speed in m/s
            accuracy: 10 // Optional: accuracy in meters
          },
          // Live location requires additional context
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

  // Update live location (while sharing is active)
  async updateLiveLocation(messageId, latitude, longitude, speed = 0, accuracy = 10, bearing = 0) {
    try {
      // Note: WhatsApp API doesn't have a direct update endpoint
      // Live location updates are typically sent via the mobile client
      // This method is a placeholder for future API updates
      
      console.log('📍 Live location update:', {
        messageId,
        latitude,
        longitude,
        speed,
        accuracy,
        bearing
      });

      // For now, we'll store the update in our database
      // and rely on the mobile client to send updates via webhooks
      
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

  // Stop live location sharing
  async stopLiveLocation(messageId) {
    try {
      // WhatsApp API doesn't provide a direct stop endpoint
      // Live location stops automatically after duration expires
      // or user can stop it manually from their device
      
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

  // Send contact card
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

      // Clean the message ID by removing any spaces or newlines
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

  // Send interactive poll message
  async sendPollMessage(to, question, options) {
    try {
      // Validate options (WhatsApp allows 2-12 options)
      if (!Array.isArray(options) || options.length < 2 || options.length > 12) {
        throw new Error('Poll must have between 2 and 12 options');
      }

      // Validate option length (max 20 characters each)
      for (const option of options) {
        if (!option || option.length > 20) {
          throw new Error('Each poll option must be 1-20 characters');
        }
      }

      // Validate question length (max 255 characters)
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

  // Get media URL from media ID
  async getMediaUrl(mediaId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        url: response.data.url,
        mimeType: response.data.mime_type,
        sha256: response.data.sha256,
        fileSize: response.data.file_size
      };
    } catch (error) {
      console.error('Get Media URL Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Download media file
  async downloadMedia(mediaUrl) {
    try {
      const response = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer'
      });

      return {
        success: true,
        data: response.data,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      console.error('Download Media Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Format phone number (add 91 prefix to 10-digit Indian numbers)
  formatPhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    let formatted = phoneNumber.replace(/\D/g, '');
    
    // If already has 91 prefix and 12 digits total, return as-is
    if (formatted.startsWith('91') && formatted.length === 12) {
      return formatted;
    }
    
    // If exactly 10 digits, add 91 prefix
    if (formatted.length === 10) {
      return '91' + formatted;
    }
    
    // If other format, throw error
    throw new Error(`Invalid phone number: ${phoneNumber}. Expected 10 digits, will add 91 prefix automatically.`);
  }

  // ===== Business Profile API Methods =====
  
  /**
   * Get Business Profile information
   * Retrieves business details like name, description, address, etc.
   */
  async getBusinessProfile() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          params: {
            fields: 'about,address,description,email,profile_picture_url,websites,vertical'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📊 Business profile retrieved successfully');
      
      return {
        success: true,
        data: response.data.data[0] || {}
      };
    } catch (error) {
      console.error('Get Business Profile Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Update Business Profile information
   * Updates business details (about, address, description, email, websites, vertical)
   */
  async updateBusinessProfile(profileData) {
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
          }
        }
      );

      console.log('✅ Business profile updated successfully');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Update Business Profile Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Upload and set business profile photo
   * Note: Requires uploading media first, then setting as profile photo
   */
  async updateProfilePhoto(mediaId) {
    try {
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
          }
        }
      );

      console.log('✅ Profile photo updated successfully');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Update Profile Photo Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * ✅ FEATURE 17: Update Business Hours
   * Sets operating hours for the business (day-by-day configuration)
   * Format: { day: { open_time: 'HH:MM', close_time: 'HH:MM', is_open: boolean } }
   * Days: MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
   */
  async updateBusinessHours(businessHours) {
    try {
      console.log('⏰ Updating business hours...');

      // Validate business hours format
      const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

      for (const day of validDays) {
        if (businessHours[day]) {
          const { open_time, close_time, is_open } = businessHours[day];
          
          if (is_open) {
            if (!timeRegex.test(open_time)) {
              throw new Error(`Invalid open_time format for ${day}. Use HH:MM (24-hour format)`);
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

      console.log('✅ Business hours updated successfully');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Update Business Hours Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * ✅ FEATURE 17: Get Business Hours
   * Retrieves current business hours configuration
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
      console.log('⏰ Business hours retrieved successfully');
      
      return {
        success: true,
        data: businessHours
      };
    } catch (error) {
      console.error('Get Business Hours Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * ✅ FEATURE: Media Management - Upload media file to WhatsApp
   * Uploads media (image, video, audio, document, sticker) to WhatsApp servers
   * Returns media ID that can be used to send media messages
   * 
   * @param {Buffer|Stream} file - File data as Buffer or Stream
   * @param {string} mimeType - MIME type (e.g., 'image/jpeg', 'video/mp4')
   * @param {string} filename - Original filename
   * @returns {Promise<{success: boolean, mediaId?: string, error?: string}>}
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
   * ✅ FEATURE: Media Management - Get media URL and metadata
   * Retrieves the download URL and metadata for a media file
   * URL is temporary and expires after a few minutes
   * 
   * @param {string} mediaId - WhatsApp media ID
   * @returns {Promise<{success: boolean, url?: string, mimeType?: string, fileSize?: number, error?: string}>}
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
   * ✅ FEATURE: Media Management - Download media file
   * Downloads media file from WhatsApp using media ID
   * First gets URL, then downloads the file
   * 
   * @param {string} mediaId - WhatsApp media ID
   * @returns {Promise<{success: boolean, buffer?: Buffer, mimeType?: string, error?: string}>}
   */
  async downloadMedia(mediaId) {
    try {
      console.log('⬇️  Downloading media...');
      console.log('   Media ID:', mediaId);

      // First, get the media URL
      const mediaInfo = await this.getMediaUrl(mediaId);
      if (!mediaInfo.success) {
        return mediaInfo;
      }

      // Download the file
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
   * ✅ FEATURE: Media Management - Delete media file from WhatsApp
   * Removes media file from WhatsApp servers
   * Use this to clean up uploaded media that's no longer needed
   * 
   * @param {string} mediaId - WhatsApp media ID
   * @returns {Promise<{success: boolean, error?: string}>}
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
      // If media is already deleted or doesn't exist, consider it success
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
   * ✅ FEATURE: Account Management - Get account limits and tier info
   * Retrieves the current messaging limits and tier information
   * 
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getAccountLimits() {
    try {
      console.log('📊 Fetching account limits...');

      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            fields: 'messaging_limit_tier,quality_rating,name_status,code_verification_status'
          }
        }
      );

      console.log('✅ Account limits retrieved successfully');
      console.log('   Tier:', response.data.messaging_limit_tier);
      console.log('   Quality Rating:', response.data.quality_rating);

      // Map tier to daily message limit
      const tierLimits = {
        'TIER_50': 50,
        'TIER_250': 250,
        'TIER_1K': 1000,
        'TIER_10K': 10000,
        'TIER_100K': 100000,
        'TIER_UNLIMITED': 1000000
      };

      const tier = response.data.messaging_limit_tier || 'TIER_1K';
      const messagingLimit = tierLimits[tier] || 1000;

      return {
        success: true,
        data: {
          tier: tier,
          tierName: tier.replace('TIER_', '').replace('K', ',000'),
          messagingLimit: messagingLimit,
          qualityRating: response.data.quality_rating || 'UNKNOWN',
          nameStatus: response.data.name_status,
          codeVerificationStatus: response.data.code_verification_status,
          rawData: response.data
        }
      };
    } catch (error) {
      console.error('❌ Get Account Limits Error:', error.response?.data || error.message);
      
      // Return default values if API fails
      return {
        success: true,
        data: {
          tier: 'TIER_1K',
          tierName: '1,000',
          messagingLimit: 1000,
          qualityRating: 'UNKNOWN',
          nameStatus: 'UNKNOWN',
          codeVerificationStatus: 'UNKNOWN',
          note: 'Using default values - API call failed'
        }
      };
    }
  }

  /**
   * ✅ FEATURE: Account Management - Get quality rating
   * Retrieves the current account quality rating
   * 
   * @returns {Promise<{success: boolean, rating?: string, error?: string}>}
   */
  async getQualityRating() {
    try {
      console.log('⭐ Fetching quality rating...');

      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            fields: 'quality_rating'
          }
        }
      );

      console.log('✅ Quality rating retrieved:', response.data.quality_rating);

      return {
        success: true,
        rating: response.data.quality_rating || 'UNKNOWN'
      };
    } catch (error) {
      console.error('❌ Get Quality Rating Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

module.exports = new WhatsAppService();
