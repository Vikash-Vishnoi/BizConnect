const Conversation = require('../../../core/database/models/Conversation');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES } = require('../../../common/constants');

// Constants
const QUALITY_CONSTANTS = {
  // Score Weights
  WEIGHT_MESSAGE_BALANCE: 40,
  WEIGHT_RESPONSE_TIME: 30,
  WEIGHT_CONVERSATION_LENGTH: 15,
  WEIGHT_REACTION_RATE: 10,
  WEIGHT_COMPLETION_RATE: 5,
  
  // Thresholds
  MAX_MESSAGES_FOR_LENGTH_SCORE: 20,
  HIGH_ENGAGEMENT_THRESHOLD: 70,
  MEDIUM_ENGAGEMENT_THRESHOLD: 40,
  
  // Engagement Levels
  ENGAGEMENT_HIGH: 'HIGH',
  ENGAGEMENT_MEDIUM: 'MEDIUM',
  ENGAGEMENT_LOW: 'LOW',
  
  // Message Directions
  DIRECTION_OUTGOING: 'out',
  DIRECTION_INCOMING: 'in',
  
  // Query Defaults
  DEFAULT_LIMIT: 100,
  DEFAULT_SKIP: 0,
  TOP_PERFORMING_COUNT: 5,
  LOW_PERFORMING_COUNT: 5,
  
  // Time Periods
  GROUP_BY_HOUR: 'hour',
  GROUP_BY_DAY: 'day',
  GROUP_BY_WEEK: 'week',
  GROUP_BY_MONTH: 'month',
  DEFAULT_DAYS_LOOKBACK: 30,
  
  // Precision
  DECIMAL_PRECISION: 2,
  RESPONSE_RATE_CAP: 100,
  
  // Tags
  TAG_RESOLVED: 'resolved',
  
  // Error Messages
  ERROR_CONVERSATION_NOT_FOUND: 'Conversation not found',
  
  // Field Names
  FIELD_QUALITY: 'quality',
  FIELD_METRICS: 'metrics',
  FIELD_MESSAGES: 'messages',
  FIELD_UPDATED_AT: 'updatedAt',
  FIELD_QUALITY_SCORE: 'qualityScore',
  FIELD_ENGAGEMENT_LEVEL: 'engagementLevel',
  FIELD_RESPONSE_RATE: 'responseRate'
};

/**
 * Conversation Quality Service
 * Calculate quality scores and engagement metrics for conversations
 * 
 * P2 FIX: Conversation quality metrics
 */

class ConversationQualityService {
  /**
   * Calculate quality score for a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} Quality metrics
   */
  async calculateQualityScore(conversationId) {
    const startTime = Date.now();
    try {
      logger.info('Calculating quality score', { 
        conversationId: conversationId?.toString() 
      });
      
      const conversation = await Conversation.findById(conversationId)
        .select(`${QUALITY_CONSTANTS.FIELD_MESSAGES} window tags`)
        .lean();
        
      if (!conversation) {
        const error = new Error(QUALITY_CONSTANTS.ERROR_CONVERSATION_NOT_FOUND);
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      const metrics = {
        qualityScore: 0,
        responseRate: 0,
        engagementLevel: QUALITY_CONSTANTS.ENGAGEMENT_LOW,
        factors: {
          messageBalance: 0,      // Balance between business and customer messages
          responseTime: 0,        // Average response time score
          conversationLength: 0,  // Engagement duration score
          reactionRate: 0,        // Message reaction rate
          completionRate: 0       // Conversation resolution rate
        }
      };

      // Calculate message balance (40% of score)
      const businessMessages = conversation.messages.filter(m => 
        m.direction === QUALITY_CONSTANTS.DIRECTION_OUTGOING
      ).length;
      const customerMessages = conversation.messages.filter(m => 
        m.direction === QUALITY_CONSTANTS.DIRECTION_INCOMING
      ).length;
      const totalMessages = businessMessages + customerMessages;

      if (totalMessages > 0) {
        // Ideal ratio is close to 1:1
        const ratio = customerMessages / Math.max(businessMessages, 1);
        metrics.factors.messageBalance = Math.min(ratio, 1) * QUALITY_CONSTANTS.WEIGHT_MESSAGE_BALANCE;
      }

      // Calculate response rate (30% of score)
      if (customerMessages > 0) {
        metrics.responseRate = parseFloat(
          ((businessMessages / customerMessages) * QUALITY_CONSTANTS.RESPONSE_RATE_CAP)
            .toFixed(QUALITY_CONSTANTS.DECIMAL_PRECISION)
        );
        // Cap at 100% for quality score calculation
        const cappedRate = Math.min(metrics.responseRate / QUALITY_CONSTANTS.RESPONSE_RATE_CAP, 1);
        metrics.factors.responseTime = cappedRate * QUALITY_CONSTANTS.WEIGHT_RESPONSE_TIME;
      }

      // Calculate conversation length score (15% of score)
      if (totalMessages > 0) {
        // More messages = better engagement (up to a point)
        const lengthScore = Math.min(
          totalMessages / QUALITY_CONSTANTS.MAX_MESSAGES_FOR_LENGTH_SCORE, 
          1
        );
        metrics.factors.conversationLength = lengthScore * QUALITY_CONSTANTS.WEIGHT_CONVERSATION_LENGTH;
      }

      // Calculate reaction rate (10% of score)
      const messagesWithReactions = conversation.messages.filter(m => 
        m.reaction && m.reaction.emoji
      ).length;
      if (totalMessages > 0) {
        const reactionRate = messagesWithReactions / totalMessages;
        metrics.factors.reactionRate = reactionRate * QUALITY_CONSTANTS.WEIGHT_REACTION_RATE;
      }

      // Calculate completion rate (5% of score)
      // If conversation window is closed with no unresolved tags, it's considered complete
      if (!conversation.window.isOpen && conversation.tags?.includes(QUALITY_CONSTANTS.TAG_RESOLVED)) {
        metrics.factors.completionRate = QUALITY_CONSTANTS.WEIGHT_COMPLETION_RATE;
      } else if (!conversation.window.isOpen) {
        metrics.factors.completionRate = QUALITY_CONSTANTS.WEIGHT_COMPLETION_RATE / 2;
      }

      // Sum up quality score (0-100)
      metrics.qualityScore = parseFloat(
        Object.values(metrics.factors)
          .reduce((sum, val) => sum + val, 0)
          .toFixed(QUALITY_CONSTANTS.DECIMAL_PRECISION)
      );

      // Determine engagement level
      if (metrics.qualityScore >= QUALITY_CONSTANTS.HIGH_ENGAGEMENT_THRESHOLD) {
        metrics.engagementLevel = QUALITY_CONSTANTS.ENGAGEMENT_HIGH;
      } else if (metrics.qualityScore >= QUALITY_CONSTANTS.MEDIUM_ENGAGEMENT_THRESHOLD) {
        metrics.engagementLevel = QUALITY_CONSTANTS.ENGAGEMENT_MEDIUM;
      } else {
        metrics.engagementLevel = QUALITY_CONSTANTS.ENGAGEMENT_LOW;
      }

      // Update conversation model
      const updateData = {};
      updateData[`${QUALITY_CONSTANTS.FIELD_QUALITY}.${QUALITY_CONSTANTS.FIELD_QUALITY_SCORE}`] = metrics.qualityScore;
      updateData[`${QUALITY_CONSTANTS.FIELD_QUALITY}.${QUALITY_CONSTANTS.FIELD_ENGAGEMENT_LEVEL}`] = metrics.engagementLevel;
      updateData[`${QUALITY_CONSTANTS.FIELD_METRICS}.${QUALITY_CONSTANTS.FIELD_RESPONSE_RATE}`] = metrics.responseRate;

      await Conversation.findByIdAndUpdate(conversationId, { $set: updateData });

      const processingTime = Date.now() - startTime;
      logger.info('Conversation quality calculated', {
        conversationId: conversationId?.toString(),
        qualityScore: metrics.qualityScore,
        engagementLevel: metrics.engagementLevel,
        totalMessages,
        processingTime
      });

      return metrics;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Re-throw known errors
      if (error.code === ERROR_CODES.NOT_FOUND || error.code === ERROR_CODES.VALIDATION_ERROR) {
        throw error;
      }
      
      logger.error('Calculate quality score error', { 
        conversationId: conversationId?.toString(),
        error: error.message,
        stack: error.stack,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Get quality metrics for multiple conversations
   * @param {string} businessId - Business ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Aggregate quality metrics
   */
  async getBusinessQualityMetrics(businessId, options = {}) {
    const startTime = Date.now();
    try {
      logger.info('Getting business quality metrics', {
        businessId: businessId?.toString()
      });
      
      const { 
        startDate, 
        endDate, 
        limit = QUALITY_CONSTANTS.DEFAULT_LIMIT, 
        skip = QUALITY_CONSTANTS.DEFAULT_SKIP 
      } = options;

      // Build query
      const query = { businessId };
      if (startDate || endDate) {
        query[QUALITY_CONSTANTS.FIELD_UPDATED_AT] = {};
        if (startDate) query[QUALITY_CONSTANTS.FIELD_UPDATED_AT].$gte = new Date(startDate);
        if (endDate) query[QUALITY_CONSTANTS.FIELD_UPDATED_AT].$lte = new Date(endDate);
      }

      const conversations = await Conversation.find(query)
        .select(`${QUALITY_CONSTANTS.FIELD_QUALITY} ${QUALITY_CONSTANTS.FIELD_METRICS} ${QUALITY_CONSTANTS.FIELD_MESSAGES}`)
        .limit(limit)
        .skip(skip)
        .lean();

      // Calculate for conversations without scores
      const conversationsToScore = conversations.filter(c => 
        !c[QUALITY_CONSTANTS.FIELD_QUALITY]?.[QUALITY_CONSTANTS.FIELD_QUALITY_SCORE]
      );
      
      if (conversationsToScore.length > 0) {
        logger.debug('Calculating scores for conversations without quality data', {
          businessId: businessId?.toString(),
          count: conversationsToScore.length
        });
        
        for (const conv of conversationsToScore) {
          await this.calculateQualityScore(conv._id);
        }
      }

      // Re-fetch with updated scores
      const updatedConversations = await Conversation.find(query)
        .select(`${QUALITY_CONSTANTS.FIELD_QUALITY} ${QUALITY_CONSTANTS.FIELD_METRICS}`)
        .limit(limit)
        .skip(skip)
        .lean();

      // Aggregate metrics
      const aggregate = {
        totalConversations: updatedConversations.length,
        averageQualityScore: 0,
        engagementDistribution: {
          [QUALITY_CONSTANTS.ENGAGEMENT_HIGH]: 0,
          [QUALITY_CONSTANTS.ENGAGEMENT_MEDIUM]: 0,
          [QUALITY_CONSTANTS.ENGAGEMENT_LOW]: 0
        },
        averageResponseRate: 0,
        topPerformingConversations: [],
        lowPerformingConversations: []
      };

      let totalQuality = 0;
      let totalResponseRate = 0;
      let responseRateCount = 0;

      for (const conv of updatedConversations) {
        if (conv[QUALITY_CONSTANTS.FIELD_QUALITY]?.[QUALITY_CONSTANTS.FIELD_QUALITY_SCORE]) {
          totalQuality += conv[QUALITY_CONSTANTS.FIELD_QUALITY][QUALITY_CONSTANTS.FIELD_QUALITY_SCORE];
        }

        if (conv[QUALITY_CONSTANTS.FIELD_QUALITY]?.[QUALITY_CONSTANTS.FIELD_ENGAGEMENT_LEVEL]) {
          aggregate.engagementDistribution[conv[QUALITY_CONSTANTS.FIELD_QUALITY][QUALITY_CONSTANTS.FIELD_ENGAGEMENT_LEVEL]]++;
        }

        if (conv[QUALITY_CONSTANTS.FIELD_METRICS]?.[QUALITY_CONSTANTS.FIELD_RESPONSE_RATE]) {
          totalResponseRate += conv[QUALITY_CONSTANTS.FIELD_METRICS][QUALITY_CONSTANTS.FIELD_RESPONSE_RATE];
          responseRateCount++;
        }
      }

      if (updatedConversations.length > 0) {
        aggregate.averageQualityScore = parseFloat(
          (totalQuality / updatedConversations.length).toFixed(QUALITY_CONSTANTS.DECIMAL_PRECISION)
        );
      }

      if (responseRateCount > 0) {
        aggregate.averageResponseRate = parseFloat(
          (totalResponseRate / responseRateCount).toFixed(QUALITY_CONSTANTS.DECIMAL_PRECISION)
        );
      }

      // Sort by quality score
      const sorted = updatedConversations
        .filter(c => c[QUALITY_CONSTANTS.FIELD_QUALITY]?.[QUALITY_CONSTANTS.FIELD_QUALITY_SCORE])
        .sort((a, b) => 
          b[QUALITY_CONSTANTS.FIELD_QUALITY][QUALITY_CONSTANTS.FIELD_QUALITY_SCORE] - 
          a[QUALITY_CONSTANTS.FIELD_QUALITY][QUALITY_CONSTANTS.FIELD_QUALITY_SCORE]
        );

      aggregate.topPerformingConversations = sorted
        .slice(0, QUALITY_CONSTANTS.TOP_PERFORMING_COUNT)
        .map(c => ({
          conversationId: c._id,
          qualityScore: c[QUALITY_CONSTANTS.FIELD_QUALITY][QUALITY_CONSTANTS.FIELD_QUALITY_SCORE],
          engagementLevel: c[QUALITY_CONSTANTS.FIELD_QUALITY][QUALITY_CONSTANTS.FIELD_ENGAGEMENT_LEVEL],
          responseRate: c[QUALITY_CONSTANTS.FIELD_METRICS]?.[QUALITY_CONSTANTS.FIELD_RESPONSE_RATE] || 0
        }));

      aggregate.lowPerformingConversations = sorted
        .slice(-QUALITY_CONSTANTS.LOW_PERFORMING_COUNT)
        .reverse()
        .map(c => ({
          conversationId: c._id,
          qualityScore: c[QUALITY_CONSTANTS.FIELD_QUALITY][QUALITY_CONSTANTS.FIELD_QUALITY_SCORE],
          engagementLevel: c[QUALITY_CONSTANTS.FIELD_QUALITY][QUALITY_CONSTANTS.FIELD_ENGAGEMENT_LEVEL],
          responseRate: c[QUALITY_CONSTANTS.FIELD_METRICS]?.[QUALITY_CONSTANTS.FIELD_RESPONSE_RATE] || 0
        }));

      const processingTime = Date.now() - startTime;
      logger.info('Business quality metrics calculated', {
        businessId: businessId?.toString(),
        totalConversations: aggregate.totalConversations,
        averageQualityScore: aggregate.averageQualityScore,
        processingTime
      });

      return aggregate;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Get business quality metrics error', { 
        businessId: businessId?.toString(),
        error: error.message,
        stack: error.stack,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Get quality trends over time
   * @param {string} businessId - Business ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Quality trends
   */
  async getQualityTrends(businessId, options = {}) {
    const startTime = Date.now();
    try {
      logger.info('Getting quality trends', {
        businessId: businessId?.toString(),
        groupBy: options.groupBy
      });
      
      const { 
        groupBy = QUALITY_CONSTANTS.GROUP_BY_DAY, 
        startDate, 
        endDate 
      } = options;

      // Default to last 30 days
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate 
        ? new Date(startDate) 
        : new Date(end.getTime() - QUALITY_CONSTANTS.DEFAULT_DAYS_LOOKBACK * 24 * 60 * 60 * 1000);

      const conversations = await Conversation.find({
        businessId,
        [QUALITY_CONSTANTS.FIELD_UPDATED_AT]: {
          $gte: start,
          $lte: end
        }
      })
      .select(`${QUALITY_CONSTANTS.FIELD_QUALITY} ${QUALITY_CONSTANTS.FIELD_METRICS} ${QUALITY_CONSTANTS.FIELD_UPDATED_AT}`)
      .lean();

      logger.debug('Found conversations for trends', {
        businessId: businessId?.toString(),
        count: conversations.length
      });

      // Group by time period
      const trends = {};

      for (const conv of conversations) {
        if (!conv[QUALITY_CONSTANTS.FIELD_QUALITY]?.[QUALITY_CONSTANTS.FIELD_QUALITY_SCORE]) continue;

        let bucket;
        const convDate = new Date(conv[QUALITY_CONSTANTS.FIELD_UPDATED_AT]);
        
        if (groupBy === QUALITY_CONSTANTS.GROUP_BY_HOUR) {
          bucket = convDate.toISOString().slice(0, 13) + ':00:00Z';
        } else if (groupBy === QUALITY_CONSTANTS.GROUP_BY_DAY) {
          bucket = convDate.toISOString().slice(0, 10);
        } else if (groupBy === QUALITY_CONSTANTS.GROUP_BY_WEEK) {
          const weekStart = new Date(convDate.setDate(convDate.getDate() - convDate.getDay()));
          bucket = weekStart.toISOString().slice(0, 10);
        } else if (groupBy === QUALITY_CONSTANTS.GROUP_BY_MONTH) {
          bucket = convDate.toISOString().slice(0, 7);
        }

        if (!trends[bucket]) {
          trends[bucket] = {
            period: bucket,
            totalConversations: 0,
            totalQualityScore: 0,
            averageQualityScore: 0,
            highEngagement: 0,
            mediumEngagement: 0,
            lowEngagement: 0
          };
        }

        trends[bucket].totalConversations++;
        trends[bucket].totalQualityScore += conv[QUALITY_CONSTANTS.FIELD_QUALITY][QUALITY_CONSTANTS.FIELD_QUALITY_SCORE];

        const engagementLevel = conv[QUALITY_CONSTANTS.FIELD_QUALITY][QUALITY_CONSTANTS.FIELD_ENGAGEMENT_LEVEL];
        if (engagementLevel === QUALITY_CONSTANTS.ENGAGEMENT_HIGH) trends[bucket].highEngagement++;
        if (engagementLevel === QUALITY_CONSTANTS.ENGAGEMENT_MEDIUM) trends[bucket].mediumEngagement++;
        if (engagementLevel === QUALITY_CONSTANTS.ENGAGEMENT_LOW) trends[bucket].lowEngagement++;
      }

      // Calculate averages and convert to array
      const trendArray = Object.values(trends)
        .map(trend => ({
          ...trend,
          averageQualityScore: parseFloat(
            (trend.totalQualityScore / trend.totalConversations).toFixed(QUALITY_CONSTANTS.DECIMAL_PRECISION)
          )
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      const processingTime = Date.now() - startTime;
      logger.info('Quality trends calculated', { 
        businessId: businessId?.toString(),
        periods: trendArray.length,
        groupBy,
        processingTime
      });

      return trendArray;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Get quality trends error', { 
        businessId: businessId?.toString(),
        error: error.message,
        stack: error.stack,
        processingTime
      });
      throw error;
    }
  }
}

module.exports = new ConversationQualityService();
