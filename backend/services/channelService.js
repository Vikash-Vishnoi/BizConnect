/**
 * ✅ FEATURE 33: WhatsApp Channels Service
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

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

/**
 * Create a new WhatsApp Channel
 * @param {Object} channelData - Channel configuration
 * @param {string} channelData.name - Channel name (max 100 chars)
 * @param {string} channelData.description - Channel description (max 139 chars)
 * @param {string} channelData.category - business/lifestyle/entertainment/news/education/other
 * @param {string} channelData.picture_url - Channel profile picture URL (optional)
 * @returns {Promise<Object>} Created channel data with channelId
 */
async function createChannel(channelData) {
  try {
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
    console.error('❌ Create channel error:', error.response?.data || error.message);
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
 * @param {string} updates.name - New channel name (optional)
 * @param {string} updates.description - New description (optional)
 * @param {string} updates.picture_url - New picture URL (optional)
 * @returns {Promise<Object>} Updated channel data
 */
async function updateChannel(channelId, updates) {
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
    console.error('❌ Update channel error:', error.response?.data || error.message);
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
 * @param {string} message.type - Message type: text/image/video/document
 * @param {string} message.text - Text content (for text messages)
 * @param {string} message.media_url - Media URL (for media messages)
 * @param {string} message.caption - Media caption (optional)
 * @param {string} message.filename - Document filename (optional)
 * @returns {Promise<Object>} Sent message data with messageId
 */
async function sendChannelMessage(channelId, message) {
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
    console.error('❌ Send channel message error:', error.response?.data || error.message);
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
    console.error('❌ Get channel details error:', error.response?.data || error.message);
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
    console.error('❌ Get follower count error:', error.response?.data || error.message);
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
    console.error('❌ Get channel analytics error:', error.response?.data || error.message);
    
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
async function deleteChannel(channelId) {
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
    console.error('❌ Delete channel error:', error.response?.data || error.message);
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
async function getMessageStatus(messageId) {
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
    console.error('❌ Get message status error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error?.message || 
      'Failed to get message status'
    );
  }
}

module.exports = {
  createChannel,
  updateChannel,
  sendChannelMessage,
  getChannelDetails,
  getFollowerCount,
  getChannelAnalytics,
  deleteChannel,
  getMessageStatus
};
