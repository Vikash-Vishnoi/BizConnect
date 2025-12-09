const Conversation = require('../../../core/database/models/Conversation');
const logger = require('../../../common/helpers/logger');

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
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const metrics = {
        qualityScore: 0,
        responseRate: 0,
        engagementLevel: 'LOW',
        factors: {
          messageBalance: 0,      // Balance between business and customer messages
          responseTime: 0,        // Average response time score
          conversationLength: 0,  // Engagement duration score
          reactionRate: 0,        // Message reaction rate
          completionRate: 0       // Conversation resolution rate
        }
      };

      // Calculate message balance (40% of score)
      const businessMessages = conversation.messages.filter(m => m.direction === 'outgoing').length;
      const customerMessages = conversation.messages.filter(m => m.direction === 'incoming').length;
      const totalMessages = businessMessages + customerMessages;

      if (totalMessages > 0) {
        // Ideal ratio is close to 1:1
        const ratio = customerMessages / Math.max(businessMessages, 1);
        metrics.factors.messageBalance = Math.min(ratio, 1) * 40;
      }

      // Calculate response rate (30% of score)
      if (customerMessages > 0) {
        metrics.responseRate = parseFloat(((businessMessages / customerMessages) * 100).toFixed(2));
        // Cap at 100% for quality score calculation
        const cappedRate = Math.min(metrics.responseRate / 100, 1);
        metrics.factors.responseTime = cappedRate * 30;
      }

      // Calculate conversation length score (15% of score)
      if (totalMessages > 0) {
        // More messages = better engagement (up to a point)
        const lengthScore = Math.min(totalMessages / 20, 1); // Max score at 20+ messages
        metrics.factors.conversationLength = lengthScore * 15;
      }

      // Calculate reaction rate (10% of score)
      const messagesWithReactions = conversation.messages.filter(m => m.reaction && m.reaction.emoji).length;
      if (totalMessages > 0) {
        const reactionRate = messagesWithReactions / totalMessages;
        metrics.factors.reactionRate = reactionRate * 10;
      }

      // Calculate completion rate (5% of score)
      // If conversation window is closed with no unresolved tags, it's considered complete
      if (!conversation.window.isOpen && conversation.tags?.includes('resolved')) {
        metrics.factors.completionRate = 5;
      } else if (!conversation.window.isOpen) {
        metrics.factors.completionRate = 2.5; // Partial credit for closed conversations
      }

      // Sum up quality score (0-100)
      metrics.qualityScore = parseFloat(Object.values(metrics.factors).reduce((sum, val) => sum + val, 0).toFixed(2));

      // Determine engagement level
      if (metrics.qualityScore >= 70) {
        metrics.engagementLevel = 'HIGH';
      } else if (metrics.qualityScore >= 40) {
        metrics.engagementLevel = 'MEDIUM';
      } else {
        metrics.engagementLevel = 'LOW';
      }

      // Update conversation model
      conversation.quality = conversation.quality || {};
      conversation.quality.qualityScore = metrics.qualityScore;
      conversation.quality.engagementLevel = metrics.engagementLevel;
      conversation.metrics = conversation.metrics || {};
      conversation.metrics.responseRate = metrics.responseRate;

      await conversation.save();

      logger.info('Conversation quality calculated', {
        conversationId,
        qualityScore: metrics.qualityScore,
        engagementLevel: metrics.engagementLevel
      });

      return metrics;

    } catch (error) {
      logger.error('Calculate quality score error', { conversationId, error: error.message });
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
    try {
      const { startDate, endDate, limit = 100, skip = 0 } = options;

      // Build query
      const query = { businessId };
      if (startDate || endDate) {
        query.updatedAt = {};
        if (startDate) query.updatedAt.$gte = new Date(startDate);
        if (endDate) query.updatedAt.$lte = new Date(endDate);
      }

      const conversations = await Conversation.find(query)
        .select('quality metrics messages')
        .limit(limit)
        .skip(skip)
        .lean();

      // Calculate for conversations without scores
      const conversationsToScore = conversations.filter(c => !c.quality?.qualityScore);
      for (const conv of conversationsToScore) {
        await this.calculateQualityScore(conv._id);
      }

      // Re-fetch with updated scores
      const updatedConversations = await Conversation.find(query)
        .select('quality metrics')
        .limit(limit)
        .skip(skip)
        .lean();

      // Aggregate metrics
      const aggregate = {
        totalConversations: updatedConversations.length,
        averageQualityScore: 0,
        engagementDistribution: {
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0
        },
        averageResponseRate: 0,
        topPerformingConversations: [],
        lowPerformingConversations: []
      };

      let totalQuality = 0;
      let totalResponseRate = 0;
      let responseRateCount = 0;

      for (const conv of updatedConversations) {
        if (conv.quality?.qualityScore) {
          totalQuality += conv.quality.qualityScore;
        }

        if (conv.quality?.engagementLevel) {
          aggregate.engagementDistribution[conv.quality.engagementLevel]++;
        }

        if (conv.metrics?.responseRate) {
          totalResponseRate += conv.metrics.responseRate;
          responseRateCount++;
        }
      }

      if (updatedConversations.length > 0) {
        aggregate.averageQualityScore = parseFloat((totalQuality / updatedConversations.length).toFixed(2));
      }

      if (responseRateCount > 0) {
        aggregate.averageResponseRate = parseFloat((totalResponseRate / responseRateCount).toFixed(2));
      }

      // Sort by quality score
      const sorted = updatedConversations
        .filter(c => c.quality?.qualityScore)
        .sort((a, b) => b.quality.qualityScore - a.quality.qualityScore);

      aggregate.topPerformingConversations = sorted.slice(0, 5).map(c => ({
        conversationId: c._id,
        qualityScore: c.quality.qualityScore,
        engagementLevel: c.quality.engagementLevel,
        responseRate: c.metrics?.responseRate || 0
      }));

      aggregate.lowPerformingConversations = sorted.slice(-5).reverse().map(c => ({
        conversationId: c._id,
        qualityScore: c.quality.qualityScore,
        engagementLevel: c.quality.engagementLevel,
        responseRate: c.metrics?.responseRate || 0
      }));

      logger.info('Business quality metrics calculated', {
        businessId,
        averageQualityScore: aggregate.averageQualityScore
      });

      return aggregate;

    } catch (error) {
      logger.error('Get business quality metrics error', { businessId, error: error.message });
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
    try {
      const { groupBy = 'day', startDate, endDate } = options;

      // Default to last 30 days
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const conversations = await Conversation.find({
        businessId,
        updatedAt: {
          $gte: start,
          $lte: end
        }
      }).select('quality metrics updatedAt').lean();

      // Group by time period
      const trends = {};

      for (const conv of conversations) {
        if (!conv.quality?.qualityScore) continue;

        let bucket;
        if (groupBy === 'hour') {
          bucket = new Date(conv.updatedAt).toISOString().slice(0, 13) + ':00:00Z';
        } else if (groupBy === 'day') {
          bucket = new Date(conv.updatedAt).toISOString().slice(0, 10);
        } else if (groupBy === 'week') {
          const date = new Date(conv.updatedAt);
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          bucket = weekStart.toISOString().slice(0, 10);
        } else if (groupBy === 'month') {
          bucket = new Date(conv.updatedAt).toISOString().slice(0, 7);
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
        trends[bucket].totalQualityScore += conv.quality.qualityScore;

        if (conv.quality.engagementLevel === 'HIGH') trends[bucket].highEngagement++;
        if (conv.quality.engagementLevel === 'MEDIUM') trends[bucket].mediumEngagement++;
        if (conv.quality.engagementLevel === 'LOW') trends[bucket].lowEngagement++;
      }

      // Calculate averages and convert to array
      const trendArray = Object.values(trends)
        .map(trend => ({
          ...trend,
          averageQualityScore: parseFloat((trend.totalQualityScore / trend.totalConversations).toFixed(2))
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      logger.info('Quality trends calculated', { businessId, periods: trendArray.length });

      return trendArray;

    } catch (error) {
      logger.error('Get quality trends error', { businessId, error: error.message });
      throw error;
    }
  }

  /**
   * Get quality recommendations
   * @param {Object} metrics - Quality metrics
   * @returns {Array<string>} Recommendations
   */
  getQualityRecommendations(metrics) {
    const recommendations = [];

    if (metrics.averageQualityScore < 40) {
      recommendations.push('Overall conversation quality is low. Focus on improving response times and engagement.');
    }

    if (metrics.averageResponseRate < 50) {
      recommendations.push('Response rate is below 50%. Ensure all customer messages receive timely replies.');
    }

    if (metrics.engagementDistribution.LOW > metrics.totalConversations * 0.5) {
      recommendations.push('Over 50% of conversations have low engagement. Review conversation scripts and training.');
    }

    if (metrics.engagementDistribution.HIGH < metrics.totalConversations * 0.2) {
      recommendations.push('Few conversations achieve high engagement. Consider adding more interactive elements or personalization.');
    }

    return recommendations;
  }
}

module.exports = new ConversationQualityService();
