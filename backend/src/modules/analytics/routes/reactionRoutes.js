const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const Conversation = require('../../../core/database/models/Conversation');
const logger = require('../../../common/helpers/logger');
const { NotFoundError, ValidationError } = require('../../../common/errors');

// ============================================================================
// CONSTANTS
// ============================================================================

// Time Periods
const DEFAULT_TREND_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// Group By Options
const GROUP_BY_HOUR = 'hour';
const GROUP_BY_DAY = 'day';
const GROUP_BY_WEEK = 'week';
const GROUP_BY_MONTH = 'month';
const VALID_GROUP_BY_OPTIONS = [GROUP_BY_HOUR, GROUP_BY_DAY, GROUP_BY_WEEK, GROUP_BY_MONTH];

// Roles
const ROLE_ADMIN = 'admin';

// Decimal Precision
const PERCENTAGE_DECIMAL_PLACES = 2;

// ISO String Slices
const ISO_SLICE_HOUR = 13;
const ISO_SLICE_DAY = 10;
const ISO_SLICE_MONTH = 7;

// Error Messages
const ERROR_CONVERSATION_NOT_FOUND = 'Conversation not found';
const ERROR_BUSINESS_ID_REQUIRED = 'businessId is required';
const ERROR_ACCESS_DENIED = 'Access denied';
const ERROR_INVALID_GROUP_BY = 'groupBy must be one of: hour, day, week, month';
const ERROR_CONVERSATION_REACTIONS_FAILED = 'Failed to get conversation reactions';
const ERROR_REACTION_SUMMARY_FAILED = 'Failed to get reaction summary';
const ERROR_REACTION_TRENDS_FAILED = 'Failed to get reaction trends';

// Success Messages
const SUCCESS_CONVERSATION_REACTIONS = 'Conversation reactions retrieved successfully';
const SUCCESS_REACTION_SUMMARY = 'Reaction summary retrieved successfully';
const SUCCESS_REACTION_TRENDS = 'Reaction trends retrieved successfully';

/**
 * Reaction Analytics Routes
 * Track and analyze message reactions
 * 
 * P1 FIX: Add reaction analytics
 */

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/conversations/:conversationId/reactions
 * Get all reactions for a conversation
 */
router.get('/:conversationId/reactions', auth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .select('messages contactName contactPhone');

    if (!conversation) {
      const processingTime = Date.now() - startTime;
      throw new NotFoundError(ERROR_CONVERSATION_NOT_FOUND);
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

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        conversationId: conversation._id,
        contactName: conversation.contactName,
        contactPhone: conversation.contactPhone,
        reactions: reactedMessages,
        totalReactions: reactedMessages.length
      },
      message: SUCCESS_CONVERSATION_REACTIONS,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      conversationId: req.params.conversationId,
      processingTime
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_CONVERSATION_REACTIONS_FAILED,
      processingTime
    });
  }
});

/**
 * GET /api/analytics/reactions/summary
 * Get reaction statistics for a business
 */
router.get('/summary', auth, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { businessId, startDate, endDate } = req.query;

    if (!businessId) {
      const processingTime = Date.now() - startTime;
      throw new ValidationError(ERROR_BUSINESS_ID_REQUIRED);
    }

    // Verify business access
    if (req.user.role !== ROLE_ADMIN && req.user.businessId.toString() !== businessId) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_ACCESS_DENIED,
        processingTime
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
        ((reactionStats[emoji].count / totalReactions) * 100).toFixed(PERCENTAGE_DECIMAL_PLACES)
      );
    }

    // Sort by count
    const sortedReactions = Object.values(reactionStats).sort((a, b) => b.count - a.count);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        totalReactions,
        totalMessages,
        reactionRate: totalMessages > 0 ? parseFloat(((totalReactions / totalMessages) * 100).toFixed(PERCENTAGE_DECIMAL_PLACES)) : 0,
        reactions: sortedReactions,
        topReaction: sortedReactions[0] || null
      },
      message: SUCCESS_REACTION_SUMMARY,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.query.businessId,
      processingTime
    });

    if (error instanceof ValidationError) {
      throw error;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_REACTION_SUMMARY_FAILED,
      processingTime
    });
  }
});

/**
 * GET /api/analytics/reactions/trends
 * Get reaction trends over time
 */
router.get('/trends', auth, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { businessId, startDate, endDate, groupBy = GROUP_BY_DAY } = req.query;

    if (!businessId) {
      const processingTime = Date.now() - startTime;
      throw new ValidationError(ERROR_BUSINESS_ID_REQUIRED);
    }

    // Verify business access
    if (req.user.role !== ROLE_ADMIN && req.user.businessId.toString() !== businessId) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_ACCESS_DENIED,
        processingTime
      });
    }

    // Validate groupBy
    if (!VALID_GROUP_BY_OPTIONS.includes(groupBy)) {
      const processingTime = Date.now() - startTime;
      throw new ValidationError(ERROR_INVALID_GROUP_BY);
    }

    // Default to last 30 days if no dates specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - DEFAULT_TREND_DAYS * MILLISECONDS_PER_DAY);

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
          if (groupBy === GROUP_BY_HOUR) {
            bucket = new Date(reactedAt).toISOString().slice(0, ISO_SLICE_HOUR) + ':00:00Z';
          } else if (groupBy === GROUP_BY_DAY) {
            bucket = new Date(reactedAt).toISOString().slice(0, ISO_SLICE_DAY);
          } else if (groupBy === GROUP_BY_WEEK) {
            const date = new Date(reactedAt);
            const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
            bucket = weekStart.toISOString().slice(0, ISO_SLICE_DAY);
          } else if (groupBy === GROUP_BY_MONTH) {
            bucket = new Date(reactedAt).toISOString().slice(0, ISO_SLICE_MONTH);
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

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        groupBy,
        startDate: start,
        endDate: end,
        trends: trendArray,
        totalPeriods: trendArray.length
      },
      message: SUCCESS_REACTION_TRENDS,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.query.businessId,
      processingTime
    });

    if (error instanceof ValidationError) {
      throw error;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_REACTION_TRENDS_FAILED,
      processingTime
    });
  }
});

module.exports = router;
