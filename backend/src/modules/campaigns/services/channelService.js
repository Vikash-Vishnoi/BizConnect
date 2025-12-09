/**
 * WhatsApp Channels Service
 * Handles WhatsApp Channels API integration for one-way broadcast messaging
 * 
 * API Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/channels
 * 
 * WhatsApp Channels allow businesses to send one-way broadcast messages to followers
 * Features:
 * - Create and manage channels
 * - Send broadcast messages (text, media, polls)
 * - Track engagement (views, reactions, shares)
 * - Manage followers and subscriptions
 * - Get channel analytics
 */

const axios = require('axios');
const logger = require('../../../common/helpers/logger');
const { getWhatsAppService } = require('../../../common/helpers/businessContext');

/**
 * WhatsApp Channels Service - Class-based implementation
 * ✅ MULTI-BUSINESS: All methods require businessId parameter
 */
class ChannelService {
  /**
   * Create a new WhatsApp Channel
   * @param {string} businessId - Business ID
   * @param {Object} channelData - Channel configuration
   * @returns {Promise<Object>} Created channel data with channelId
   */
  async createChannel(businessId, channelData) {
    try {
      const whatsappService = await getWhatsAppService(businessId);
      const WHATSAPP_API_URL = whatsappService.apiUrl;
      const WHATSAPP_ACCESS_TOKEN = whatsappService.accessToken;
      const PHONE_NUMBER_ID = whatsappService.phoneNumberId;
      
      const response = await axios.post(
        `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/channels`,
        {
          name: channelData.name,
          description: channelData.description || '',
          category: channelData.category || 'business',
          picture_url: channelData.picture_url || null
        },
        {
          headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        channelId: response.data.id,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to create channel', {
        businessId,
        error: error.response?.data || error.message
      });
      throw new Error(
        error.response?.data?.error?.message || 
        'Failed to create channel on WhatsApp'
      );
    }
  }

  /**
   * Update an existing WhatsApp Channel
   * @param {string} channelId - WhatsApp channel ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated channel data
   */
  async updateChannel(channelId, updates) {
  try {
    const updateData = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.picture_url !== undefined) updateData.picture_url = updates.picture_url;

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${channelId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error('Failed to update channel', {
      channelId,
      error: error.response?.data || error.message
    });
    throw new Error(
      error.response?.data?.error?.message || 
      'Failed to update channel on WhatsApp'
    );
  }
}

  /**
   * Send a broadcast message to a WhatsApp Channel
   * @param {string} channelId - WhatsApp channel ID
   * @param {Object} message - Message content
   * @returns {Promise<Object>} Sent message data with messageId
   */
  async sendChannelMessage(channelId, message) {
  try {
    const messageData = {
      messaging_product: 'whatsapp',
      recipient_type: 'channel',
      to: channelId
    };

    // Build message based on type
    switch (message.type) {
      case 'text':
        messageData.type = 'text';
        messageData.text = { body: message.text };
        break;

      case 'image':
        messageData.type = 'image';
        messageData.image = {
          link: message.media_url,
          caption: message.caption || ''
        };
        break;

      case 'video':
        messageData.type = 'video';
        messageData.video = {
          link: message.media_url,
          caption: message.caption || ''
        };
        break;

      case 'document':
        messageData.type = 'document';
        messageData.document = {
          link: message.media_url,
          caption: message.caption || '',
          filename: message.filename || 'document'
        };
        break;

      default:
        throw new Error(`Unsupported message type: ${message.type}`);
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
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
    logger.error('Failed to send channel message', {
      channelId,
      error: error.response?.data || error.message
    });
    throw new Error(
      error.response?.data?.error?.message || 
      'Failed to send channel message'
    );
  }
}

/**
 * Get WhatsApp Channel details and metadata
 * @param {string} channelId - WhatsApp channel ID
 * @returns {Promise<Object>} Channel details including follower count
 */
async function getChannelDetails(channelId) {
  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${channelId}`,
      {
        params: {
          fields: 'id,name,description,category,follower_count,picture,verified_name'
        },
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error('Failed to get channel details', {
      channelId,
      error: error.response?.data || error.message
    });
    throw new Error(
      error.response?.data?.error?.message || 
      'Failed to get channel details'
    );
  }
}

/**
 * Get channel follower count
 * @param {string} channelId - WhatsApp channel ID
 * @returns {Promise<number>} Current follower count
 */
async function getFollowerCount(channelId) {
  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${channelId}`,
      {
        params: {
          fields: 'follower_count'
        },
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );

    return {
      success: true,
      followerCount: response.data.follower_count || 0
    };
  } catch (error) {
    logger.error('Failed to get follower count', {
      channelId,
      error: error.response?.data || error.message
    });
    throw new Error(
      error.response?.data?.error?.message || 
      'Failed to get follower count'
    );
  }
}

/**
 * Get channel analytics and insights
 * @param {string} channelId - WhatsApp channel ID
 * @param {Object} options - Query options
 * @param {string} options.since - Start date (YYYY-MM-DD)
 * @param {string} options.until - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Channel analytics data
 */
async function getChannelAnalytics(channelId, options = {}) {
  try {
    const params = {
      metric: 'channel_views,channel_followers,channel_message_opens',
      period: 'day'
    };

    if (options.since) params.since = options.since;
    if (options.until) params.until = options.until;

    const response = await axios.get(
      `${WHATSAPP_API_URL}/${channelId}/insights`,
      {
        params,
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );

    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    logger.error('Failed to get channel analytics', {
      channelId,
      error: error.response?.data || error.message
    });
    
    // Note: Analytics API might not be available for all accounts
    if (error.response?.status === 404 || error.response?.data?.error?.code === 100) {
      return {
        success: false,
        message: 'Channel analytics not available for this account',
        data: []
      };
    }

    throw new Error(
      error.response?.data?.error?.message || 
      'Failed to get channel analytics'
    );
  }
}

  /**
   * Delete a WhatsApp Channel
   * @param {string} channelId - WhatsApp channel ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteChannel(channelId) {
  try {
    const response = await axios.delete(
      `${WHATSAPP_API_URL}/${channelId}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error('Failed to delete channel', {
      channelId,
      error: error.response?.data || error.message
    });
    throw new Error(
      error.response?.data?.error?.message || 
      'Failed to delete channel'
    );
  }
}

  /**
   * Get message delivery status for a channel message
   * @param {string} messageId - WhatsApp message ID
   * @returns {Promise<Object>} Message status
   */
  async getMessageStatus(messageId) {
  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${messageId}`,
      {
        params: {
          fields: 'id,status,timestamp'
        },
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error('Failed to get message status', {
      messageId,
      error: error.response?.data || error.message
    });
    throw new Error(
      error.response?.data?.error?.message || 
      'Failed to get message status'
    );
  }
}
}

// Export singleton instance
module.exports = new ChannelService();
