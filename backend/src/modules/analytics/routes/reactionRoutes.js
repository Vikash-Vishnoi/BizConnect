const express = require('express');
const router = express.Router();
const { auth } = require('../../../core/middlewares/auth');
const { enforceBusinessIsolation } = require('../../../core/middlewares/businessSecurity');
const Conversation = require('../../../core/database/models/Conversation');
const logger = require('../../../common/helpers/logger');

/**
 * Reaction Analytics Routes
 * Track and analyze message reactions
 * 
 * P1 FIX: Add reaction analytics
 */

/**
 * GET /api/conversations/:conversationId/reactions
 * Get all reactions for a conversation
 */
router.get('/:conversationId/reactions', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .select('messages contactName contactPhone');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Extract messages with reactions
    const reactedMessages = conversation.messages
      .filter(msg => msg.reaction && msg.reaction.emoji)
      .map(msg => ({
        messageId: msg._id,
        text: msg.text,
        type: msg.type,
        timestamp: msg.timestamp,
        reaction: {
          emoji: msg.reaction.emoji,
          reactedAt: msg.reaction.reactedAt
        }
      }));

    res.json({
      success: true,
      data: {
        conversationId: conversation._id,
        contactName: conversation.contactName,
        contactPhone: conversation.contactPhone,
        reactions: reactedMessages,
        totalReactions: reactedMessages.length
      }
    });

  } catch (error) {
    logger.error('Get conversation reactions error', {
      conversationId: req.params.conversationId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/reactions/summary
 * Get reaction statistics for a business
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const { businessId, startDate, endDate } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'businessId is required'
      });
    }

    // Verify business access
    if (req.user.role !== 'admin' && req.user.businessId.toString() !== businessId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter['messages.reaction.reactedAt'] = {};
      if (startDate) dateFilter['messages.reaction.reactedAt'].$gte = new Date(startDate);
      if (endDate) dateFilter['messages.reaction.reactedAt'].$lte = new Date(endDate);
    }

    // Aggregate reaction statistics
    const conversations = await Conversation.find({
      businessId,
      ...dateFilter
    }).select('messages');

    // Process reactions
    const reactionStats = {};
    let totalReactions = 0;
    let totalMessages = 0;

    for (const conversation of conversations) {
      for (const message of conversation.messages) {
        totalMessages++;

        if (message.reaction && message.reaction.emoji) {
          // Check date filter if specified
          if (startDate || endDate) {
            const reactedAt = message.reaction.reactedAt;
            if (startDate && reactedAt < new Date(startDate)) continue;
            if (endDate && reactedAt > new Date(endDate)) continue;
          }

          const emoji = message.reaction.emoji;
          if (!reactionStats[emoji]) {
            reactionStats[emoji] = {
              emoji,
              count: 0,
              percentage: 0
            };
          }
          reactionStats[emoji].count++;
          totalReactions++;
        }
      }
    }

    // Calculate percentages
    for (const emoji in reactionStats) {
      reactionStats[emoji].percentage = parseFloat(
        ((reactionStats[emoji].count / totalReactions) * 100).toFixed(2)
      );
    }

    // Sort by count
    const sortedReactions = Object.values(reactionStats).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        totalReactions,
        totalMessages,
        reactionRate: totalMessages > 0 ? parseFloat(((totalReactions / totalMessages) * 100).toFixed(2)) : 0,
        reactions: sortedReactions,
        topReaction: sortedReactions[0] || null
      }
    });

  } catch (error) {
    logger.error('Get reaction summary error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/reactions/trends
 * Get reaction trends over time
 */
router.get('/trends', auth, async (req, res) => {
  try {
    const { businessId, startDate, endDate, groupBy = 'day' } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'businessId is required'
      });
    }

    // Verify business access
    if (req.user.role !== 'admin' && req.user.businessId.toString() !== businessId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate groupBy
    if (!['hour', 'day', 'week', 'month'].includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message: 'groupBy must be one of: hour, day, week, month'
      });
    }

    // Default to last 30 days if no dates specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const conversations = await Conversation.find({
      businessId,
      'messages.reaction.reactedAt': {
        $gte: start,
        $lte: end
      }
    }).select('messages');

    // Group reactions by time period
    const trends = {};

    for (const conversation of conversations) {
      for (const message of conversation.messages) {
        if (message.reaction && message.reaction.emoji) {
          const reactedAt = message.reaction.reactedAt;
          if (reactedAt < start || reactedAt > end) continue;

          // Create time bucket based on groupBy
          let bucket;
          if (groupBy === 'hour') {
            bucket = new Date(reactedAt).toISOString().slice(0, 13) + ':00:00Z';
          } else if (groupBy === 'day') {
            bucket = new Date(reactedAt).toISOString().slice(0, 10);
          } else if (groupBy === 'week') {
            const date = new Date(reactedAt);
            const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
            bucket = weekStart.toISOString().slice(0, 10);
          } else if (groupBy === 'month') {
            bucket = new Date(reactedAt).toISOString().slice(0, 7);
          }

          if (!trends[bucket]) {
            trends[bucket] = {
              period: bucket,
              total: 0,
              reactions: {}
            };
          }

          trends[bucket].total++;
          
          const emoji = message.reaction.emoji;
          if (!trends[bucket].reactions[emoji]) {
            trends[bucket].reactions[emoji] = 0;
          }
          trends[bucket].reactions[emoji]++;
        }
      }
    }

    // Convert to sorted array
    const trendArray = Object.values(trends).sort((a, b) => 
      a.period.localeCompare(b.period)
    );

    res.json({
      success: true,
      data: {
        groupBy,
        startDate: start,
        endDate: end,
        trends: trendArray,
        totalPeriods: trendArray.length
      }
    });

  } catch (error) {
    logger.error('Get reaction trends error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
