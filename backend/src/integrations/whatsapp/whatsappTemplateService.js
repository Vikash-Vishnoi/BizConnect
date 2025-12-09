const axios = require('axios');

/**
 * WhatsApp Template Service
 * Handles template CRUD operations
 */
class WhatsAppTemplateService {
  constructor(config) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.businessAccountId = config.wabaId;
    this.apiVersion = config.apiVersion;
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(to, templateName, languageCode, components = []) {
    try {
      const templatePayload = {
        name: templateName,
        language: {
          code: languageCode
        }
      };
      
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

  /**
   * Create a message template
   */
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

  /**
   * Get template status
   */
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
}

module.exports = WhatsAppTemplateService;
