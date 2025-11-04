const axios = require('axios');

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

  // Send a text message
  async sendTextMessage(to, text) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: text
          }
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
        messageId: response.data.messages[0].id,
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

      console.log('✅ Template message sent successfully!');
      return {
        success: true,
        messageId: response.data.messages[0].id,
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
  async sendMediaMessage(to, mediaType, mediaUrl, caption = null) {
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

      return {
        success: true,
        messageId: response.data.messages[0].id,
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

      return {
        success: true,
        messageId: response.data.messages[0].id,
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

      return {
        success: true,
        messageId: response.data.messages[0].id,
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

      return {
        success: true,
        messageId: response.data.messages[0].id,
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

      return {
        success: true,
        messageId: response.data.messages[0].id,
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

      return {
        success: true,
        messageId: response.data.messages[0].id,
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
}

module.exports = new WhatsAppService();
