const axios = require('axios');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../common/constants');
const config = require('../../config/app.config');

/**
 * WhatsApp Template Service Constants
 */
const GRAPH_API_TIMEOUT = parseInt(config.whatsapp?.timeout || process.env.WHATSAPP_API_TIMEOUT || '30000');
const MESSAGING_PRODUCT = 'whatsapp';
const MESSAGE_TYPE_TEMPLATE = 'template';

/**
 * WhatsApp Template Service
 * Handles template CRUD operations
 */
class WhatsAppTemplateService {
  constructor(config) {
    if (!config || !config.phoneNumberId || !config.accessToken || !config.wabaId) {
      throw new Error('WhatsApp configuration (phoneNumberId, accessToken, wabaId) is required');
    }
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.businessAccountId = config.wabaId;
    this.apiVersion = config.apiVersion || 'v22.0';
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.timeout = GRAPH_API_TIMEOUT;
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(to, templateName, languageCode, components = []) {
    const startTime = Date.now();
    
    try {
      if (!to || !templateName || !languageCode) {
        return {
          success: false,
          error: 'Recipient, template name, and language code are required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      const templatePayload = {
        name: templateName,
        language: {
          code: languageCode
        }
      };
      
      if (components && components.length > 0) {
        templatePayload.components = components;
      }
      
      logger.info('Sending template message', {
        phoneNumberId: this.phoneNumberId,
        to,
        templateName,
        languageCode,
        componentsCount: components?.length || 0
      });
      
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: MESSAGING_PRODUCT,
          to: to,
          type: MESSAGE_TYPE_TEMPLATE,
          template: templatePayload
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
      
      logger.info('Template message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        to,
        templateName,
        messageId,
        processingTime: `${Date.now() - startTime}ms`
      });
      
      return {
        success: true,
        messageId: messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('WhatsApp Template Error', {
        error: error.response?.data || error.message,
        to,
        templateName,
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
   * Create a message template
   */
  async createTemplate(name, category, language, components) {
    const startTime = Date.now();
    
    try {
      if (!name || !category || !language || !components) {
        return {
          success: false,
          error: 'Template name, category, language, and components are required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      logger.info('Creating template', {
        businessAccountId: this.businessAccountId,
        name,
        category,
        language
      });

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
          },
          timeout: this.timeout
        }
      );

      logger.info('Template created successfully', {
        templateId: response.data.id,
        status: response.data.status,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        templateId: response.data.id,
        status: response.data.status,
        data: response.data
      };
    } catch (error) {
      logger.error('Create Template Error', {
        error: error.response?.data || error.message,
        templateName: name,
        category,
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
   * Get template status
   */
  async getTemplateStatus(templateId) {
    const startTime = Date.now();
    
    try {
      if (!templateId) {
        return {
          success: false,
          error: 'Template ID is required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      logger.info('Fetching template status', {
        templateId
      });

      const response = await axios.get(
        `${this.apiUrl}/${templateId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          timeout: this.timeout
        }
      );

      logger.info('Template status retrieved', {
        templateId,
        status: response.data.status,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        status: response.data.status,
        data: response.data
      };
    } catch (error) {
      logger.error('Get Template Status Error', {
        error: error.response?.data || error.message,
        templateId,
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
}

module.exports = WhatsAppTemplateService;
