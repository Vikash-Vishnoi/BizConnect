const axios = require('axios');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS, TIME_CONSTANTS } = require('../../common/constants');
const config = require('../../config/app.config');

/**
 * WhatsApp Group Service Constants
 */
const GRAPH_API_TIMEOUT = parseInt(config.whatsapp?.timeout || process.env.WHATSAPP_API_TIMEOUT || '30000');
const MESSAGING_PRODUCT = 'whatsapp';
const RECIPIENT_TYPE_GROUP = 'group';
const RECIPIENT_TYPE_INDIVIDUAL = 'individual';
const GROUP_ID_SUFFIX = '@g.us';

const GROUP_INFO_FIELDS = 'id,subject,creation_time,owner,participants';

/**
 * WhatsApp Group Service
 * Handles group message operations
 */
class WhatsAppGroupService {
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
   * Send message to WhatsApp group
   */
  async sendGroupMessage(groupId, message) {
    const startTime = Date.now();
    
    try {
      if (!groupId || !message) {
        return {
          success: false,
          error: 'Group ID and message are required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      if (!groupId.includes(GROUP_ID_SUFFIX)) {
        return {
          success: false,
          error: `Invalid group ID format. Must include ${GROUP_ID_SUFFIX}`,
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      logger.info('Sending group message', {
        phoneNumberId: this.phoneNumberId,
        groupId
      });

      const payload = {
        messaging_product: MESSAGING_PRODUCT,
        recipient_type: RECIPIENT_TYPE_GROUP,
        to: groupId,
        ...message
      };

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

      logger.info('Group message sent successfully', {
        phoneNumberId: this.phoneNumberId,
        groupId,
        messageId: response.data.messages?.[0]?.id,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      logger.error('Send Group Message Error', {
        error: error.response?.data || error.message,
        groupId,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        details: error.response?.data
      };
    }
  }

  /**
   * Get group information
   */
  async getGroupInfo(groupId) {
    const startTime = Date.now();
    
    try {
      if (!groupId) {
        return {
          success: false,
          error: 'Group ID is required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      logger.info('Fetching group info', {
        phoneNumberId: this.phoneNumberId,
        groupId
      });

      const response = await axios.get(
        `${this.apiUrl}/${groupId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            fields: GROUP_INFO_FIELDS
          },
          timeout: this.timeout
        }
      );

      logger.info('Group info retrieved', {
        phoneNumberId: this.phoneNumberId,
        groupId,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Get Group Info Error', {
        error: error.response?.data || error.message,
        groupId,
        status: error.response?.status,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      
      if (error.response?.status === HTTP_STATUS.NOT_FOUND || error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        return {
          success: false,
          error: 'Group info not available through API. Use webhook data instead.',
          code: ERROR_CODES.NOT_FOUND,
          suggestion: 'Group metadata is received through webhooks when messages are sent/received'
        };
      }

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      };
    }
  }

  /**
   * Get group metadata
   */
  async getGroupMetadata(groupId) {
    try {
      logger.info('Fetching group metadata', {
        phoneNumberId: this.phoneNumberId,
        groupId
      });

      return {
        success: false,
        error: 'Group metadata endpoint not yet available in WhatsApp Cloud API',
        suggestion: 'Group metadata (name, participants, admins) is received through webhook events',
        note: 'Store group info from incoming messages and webhook notifications'
      };
    } catch (error) {
      logger.error('Get Group Metadata Error', {
        error: error.message,
        groupId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Leave group
   */
  async leaveGroup(groupId) {
    try {
      logger.info('Leaving group', {
        phoneNumberId: this.phoneNumberId,
        groupId
      });

      const response = await axios.post(
        `${this.apiUrl}/${groupId}/leave`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Successfully left group', {
        phoneNumberId: this.phoneNumberId,
        groupId
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Leave Group Error', {
        error: error.response?.data || error.message,
        groupId
      });
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        note: 'Group leave may not be supported in current API version'
      };
    }
  }

  /**
   * Send text message to group (convenience method)
   */
  async sendGroupTextMessage(groupId, text, context = null) {
    const message = {
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    };

    if (context && context.message_id) {
      message.context = {
        message_id: context.message_id
      };
    }

    return this.sendGroupMessage(groupId, message);
  }

  /**
   * Send media to group (convenience method)
   */
  async sendGroupMediaMessage(groupId, mediaType, mediaId, caption = null) {
    const message = {
      type: mediaType,
      [mediaType]: {
        id: mediaId
      }
    };

    if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
      message[mediaType].caption = caption;
    }

    return this.sendGroupMessage(groupId, message);
  }
}

module.exports = WhatsAppGroupService;
