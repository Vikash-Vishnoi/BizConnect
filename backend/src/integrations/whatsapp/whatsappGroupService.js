const axios = require('axios');

/**
 * WhatsApp Group Service
 * Handles group message operations
 */
class WhatsAppGroupService {
  constructor(config) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion;
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Send message to WhatsApp group
   */
  async sendGroupMessage(groupId, message) {
    try {
      console.log(`📤 Sending group message to: ${groupId}`);

      if (!groupId || !groupId.includes('@g.us')) {
        return {
          success: false,
          error: 'Invalid group ID format. Must include @g.us'
        };
      }

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'group',
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
          }
        }
      );

      console.log('✅ Group message sent successfully');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Send Group Message Error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Get group information
   */
  async getGroupInfo(groupId) {
    try {
      console.log(`📋 Fetching group info for: ${groupId}`);

      const response = await axios.get(
        `${this.apiUrl}/${groupId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            fields: 'id,subject,creation_time,owner,participants'
          }
        }
      );

      console.log('✅ Group info retrieved');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Get Group Info Error:', error.response?.data || error);
      
      if (error.response?.status === 404 || error.response?.status === 400) {
        return {
          success: false,
          error: 'Group info not available through API. Use webhook data instead.',
          suggestion: 'Group metadata is received through webhooks when messages are sent/received'
        };
      }

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Get group metadata
   */
  async getGroupMetadata(groupId) {
    try {
      console.log(`📊 Fetching group metadata for: ${groupId}`);

      return {
        success: false,
        error: 'Group metadata endpoint not yet available in WhatsApp Cloud API',
        suggestion: 'Group metadata (name, participants, admins) is received through webhook events',
        note: 'Store group info from incoming messages and webhook notifications'
      };
    } catch (error) {
      console.error('❌ Get Group Metadata Error:', error);
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
      console.log(`🚪 Leaving group: ${groupId}`);

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

      console.log('✅ Successfully left group');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Leave Group Error:', error.response?.data || error);
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
