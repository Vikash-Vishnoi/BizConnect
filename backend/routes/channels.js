/**
 * ✅ FEATURE 33: WhatsApp Channels Routes
 * REST API endpoints for managing WhatsApp Channels (one-way broadcast)
 * 
 * Endpoints:
 * - GET    /api/channels              - List all channels
 * - GET    /api/channels/:id          - Get channel details
 * - POST   /api/channels              - Create new channel
 * - PUT    /api/channels/:id          - Update channel
 * - DELETE /api/channels/:id          - Delete channel
 * - POST   /api/channels/:id/message  - Send broadcast message
 * - GET    /api/channels/:id/messages - Get channel messages
 * - GET    /api/channels/:id/analytics - Get channel analytics
 * - POST   /api/channels/:id/sync     - Sync follower count from WhatsApp
 * - GET    /api/channels/stats/summary - Get user's channel statistics
 */

const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const ChannelMessage = require('../models/ChannelMessage');
const channelService = require('../services/channelService');
const { auth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

/**
 * GET /api/channels
 * List all channels for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active' } = req.query;

    const query = { createdBy: req.user._id };
    if (status !== 'all') {
      query.status = status;
    }

    const channels = await Channel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Channel.countDocuments(query);

    // Get message count for each channel
    const channelsWithStats = await Promise.all(
      channels.map(async (channel) => {
        const messageCount = await ChannelMessage.countByChannel(channel._id);
        return {
          ...channel.toObject(),
          messageCount
        };
      })
    );

    res.json({
      success: true,
      channels: channelsWithStats,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('❌ List channels error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list channels'
    });
  }
});

/**
 * GET /api/channels/:id
 * Get detailed information about a specific channel
 */
router.get('/:id', async (req, res) => {
  try {
    const channel = await Channel.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    // Get message statistics
    const messageCount = await ChannelMessage.countByChannel(channel._id);
    const engagementRate = await ChannelMessage.getEngagementRate(channel._id);
    const recentMessages = await ChannelMessage.find({ channelId: channel._id })
      .sort({ sentAt: -1 })
      .limit(10);

    res.json({
      success: true,
      channel: {
        ...channel.toObject(),
        messageCount,
        engagementRate,
        recentMessages
      }
    });
  } catch (error) {
    console.error('❌ Get channel error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get channel details'
    });
  }
});

/**
 * POST /api/channels
 * Create a new WhatsApp Channel
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, category, picture_url } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Channel name is required'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Channel name must be 100 characters or less'
      });
    }

    if (description && description.length > 139) {
      return res.status(400).json({
        success: false,
        error: 'Channel description must be 139 characters or less'
      });
    }

    // Create channel on WhatsApp
    const whatsappResult = await channelService.createChannel({
      name,
      description,
      category,
      picture_url
    });

    // Create channel in database
    const channel = new Channel({
      channelId: whatsappResult.channelId,
      name,
      description: description || '',
      category: category || 'business',
      followerCount: 0,
      verified: false,
      status: 'active',
      createdBy: req.user._id,
      analytics: {
        totalMessages: 0,
        totalViews: 0,
        totalReactions: 0,
        engagementRate: 0
      }
    });

    await channel.save();

    // Emit Socket.io event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('channelCreated', {
        channel
      });
    }

    res.status(201).json({
      success: true,
      channel,
      message: 'Channel created successfully'
    });
  } catch (error) {
    console.error('❌ Create channel error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create channel'
    });
  }
});

/**
 * PUT /api/channels/:id
 * Update an existing channel
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description, picture_url, status } = req.body;

    const channel = await Channel.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    // Validate inputs
    if (name && name.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Channel name must be 100 characters or less'
      });
    }

    if (description && description.length > 139) {
      return res.status(400).json({
        success: false,
        error: 'Channel description must be 139 characters or less'
      });
    }

    // Update on WhatsApp if name/description/picture changed
    const updates = {};
    if (name && name !== channel.name) updates.name = name;
    if (description !== undefined && description !== channel.description) {
      updates.description = description;
    }
    if (picture_url !== undefined) updates.picture_url = picture_url;

    if (Object.keys(updates).length > 0) {
      await channelService.updateChannel(channel.channelId, updates);
    }

    // Update in database
    if (name) channel.name = name;
    if (description !== undefined) channel.description = description;
    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      channel.status = status;
    }

    await channel.save();

    // Emit Socket.io event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('channelUpdated', {
        channel
      });
    }

    res.json({
      success: true,
      channel,
      message: 'Channel updated successfully'
    });
  } catch (error) {
    console.error('❌ Update channel error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update channel'
    });
  }
});

/**
 * DELETE /api/channels/:id
 * Delete a channel (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const channel = await Channel.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    // Delete from WhatsApp
    try {
      await channelService.deleteChannel(channel.channelId);
    } catch (whatsappError) {
      console.error('❌ WhatsApp delete error:', whatsappError.message);
      // Continue with local deletion even if WhatsApp deletion fails
    }

    // Soft delete - set status to inactive
    channel.status = 'inactive';
    await channel.save();

    // Emit Socket.io event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('channelDeleted', {
        channelId: channel._id
      });
    }

    res.json({
      success: true,
      message: 'Channel deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete channel error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete channel'
    });
  }
});

/**
 * POST /api/channels/:id/message
 * Send a broadcast message to channel followers
 */
router.post('/:id/message', async (req, res) => {
  try {
    const { type, text, media_url, caption, filename } = req.body;

    const channel = await Channel.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    if (channel.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Channel is not active'
      });
    }

    // Validate message content
    if (!type || !['text', 'image', 'video', 'document'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Valid message type is required (text/image/video/document)'
      });
    }

    if (type === 'text' && !text) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required for text messages'
      });
    }

    if (type !== 'text' && !media_url) {
      return res.status(400).json({
        success: false,
        error: 'Media URL is required for media messages'
      });
    }

    // Send message via WhatsApp
    const whatsappResult = await channelService.sendChannelMessage(
      channel.channelId,
      { type, text, media_url, caption, filename }
    );

    // Create message record
    const channelMessage = new ChannelMessage({
      channelId: channel._id,
      channelName: channel.name,
      messageId: whatsappResult.messageId,
      message: {
        type,
        text: text || '',
        media_url: media_url || null,
        caption: caption || null,
        filename: filename || null
      },
      status: 'sent',
      deliveryStats: {
        sent: channel.followerCount,
        delivered: 0,
        failed: 0
      },
      views: 0,
      reactions: [],
      shares: 0,
      sentBy: req.user._id
    });

    await channelMessage.save();

    // Update channel analytics
    await channel.recordMessage({
      messageId: whatsappResult.messageId,
      type
    });

    // Emit Socket.io event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('channelMessage', {
        channel: channel._id,
        message: channelMessage
      });
    }

    res.json({
      success: true,
      message: channelMessage,
      whatsappMessageId: whatsappResult.messageId
    });
  } catch (error) {
    console.error('❌ Send channel message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send channel message'
    });
  }
});

/**
 * GET /api/channels/:id/messages
 * Get all messages for a specific channel
 */
router.get('/:id/messages', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const channel = await Channel.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    const messages = await ChannelMessage.find({ channelId: channel._id })
      .sort({ sentAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await ChannelMessage.countDocuments({ channelId: channel._id });

    res.json({
      success: true,
      messages,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('❌ Get channel messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get channel messages'
    });
  }
});

/**
 * GET /api/channels/:id/analytics
 * Get detailed analytics for a channel
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const { since, until } = req.query;

    const channel = await Channel.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    // Get WhatsApp analytics if available
    let whatsappAnalytics = null;
    try {
      const analyticsResult = await channelService.getChannelAnalytics(
        channel.channelId,
        { since, until }
      );
      if (analyticsResult.success) {
        whatsappAnalytics = analyticsResult.data;
      }
    } catch (error) {
      console.error('❌ WhatsApp analytics error:', error.message);
      // Continue without WhatsApp analytics
    }

    // Get local analytics
    const messageCount = await ChannelMessage.countByChannel(channel._id);
    const engagementRate = await ChannelMessage.getEngagementRate(channel._id);
    const topMessages = await ChannelMessage.getTopMessages(channel._id, 10);

    // Calculate total engagement
    const totalMessages = await ChannelMessage.find({ channelId: channel._id });
    const totalViews = totalMessages.reduce((sum, msg) => sum + msg.views, 0);
    const totalReactions = totalMessages.reduce((sum, msg) => {
      return sum + msg.reactions.reduce((s, r) => s + r.count, 0);
    }, 0);
    const totalShares = totalMessages.reduce((sum, msg) => sum + msg.shares, 0);

    res.json({
      success: true,
      analytics: {
        channel: {
          name: channel.name,
          followerCount: channel.followerCount,
          status: channel.status,
          verified: channel.verified
        },
        metrics: {
          totalMessages: messageCount,
          totalViews,
          totalReactions,
          totalShares,
          engagementRate: channel.getEngagementRate(),
          averageViewsPerMessage: messageCount > 0 ? totalViews / messageCount : 0,
          averageReactionsPerMessage: messageCount > 0 ? totalReactions / messageCount : 0
        },
        topMessages,
        whatsappAnalytics
      }
    });
  } catch (error) {
    console.error('❌ Get channel analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get channel analytics'
    });
  }
});

/**
 * POST /api/channels/:id/sync
 * Sync follower count from WhatsApp
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const channel = await Channel.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    // Get current follower count from WhatsApp
    const followerResult = await channelService.getFollowerCount(channel.channelId);

    // Update in database
    await channel.updateFollowerCount(followerResult.followerCount);

    // Emit Socket.io event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('channelSynced', {
        channel: channel._id,
        followerCount: followerResult.followerCount
      });
    }

    res.json({
      success: true,
      followerCount: followerResult.followerCount,
      message: 'Follower count synced successfully'
    });
  } catch (error) {
    console.error('❌ Sync channel error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync follower count'
    });
  }
});

/**
 * GET /api/channels/stats/summary
 * Get user's overall channel statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const channels = await Channel.find({ createdBy: req.user._id });

    const stats = {
      totalChannels: channels.length,
      activeChannels: channels.filter(c => c.status === 'active').length,
      totalFollowers: channels.reduce((sum, c) => sum + c.followerCount, 0),
      totalMessages: 0,
      totalViews: 0,
      totalReactions: 0,
      averageEngagement: 0
    };

    // Get message statistics
    for (const channel of channels) {
      const messageCount = await ChannelMessage.countByChannel(channel._id);
      stats.totalMessages += messageCount;

      const messages = await ChannelMessage.find({ channelId: channel._id });
      stats.totalViews += messages.reduce((sum, msg) => sum + msg.views, 0);
      stats.totalReactions += messages.reduce((sum, msg) => {
        return sum + msg.reactions.reduce((s, r) => s + r.count, 0);
      }, 0);
    }

    // Calculate average engagement rate
    if (channels.length > 0) {
      const engagementSum = channels.reduce((sum, c) => sum + c.analytics.engagementRate, 0);
      stats.averageEngagement = engagementSum / channels.length;
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Get channel stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get channel statistics'
    });
  }
});

module.exports = router;
