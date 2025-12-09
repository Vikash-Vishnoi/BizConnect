const FlowResponse = require('../../../core/database/models/FlowResponse');
const Flow = require('../../../core/database/models/Flow');
const logger = require('../../../common/helpers/logger');

/**
 * Flow Analytics Service
 * Track flow performance, completion rates, and user behavior
 * 
 * P2 FIX: Flow analytics dashboard
 */

class FlowAnalyticsService {
  /**
   * Get flow completion statistics
   * @param {string} flowId - Flow ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Completion statistics
   */
  async getFlowCompletionStats(flowId, options = {}) {
    try {
      const { startDate, endDate } = options;

      // Build date filter
      const dateFilter = { flowId };
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      // Get all responses for this flow
      const responses = await FlowResponse.find(dateFilter);

      // Calculate statistics
      const stats = {
        total: responses.length,
        completed: 0,
        abandoned: 0,
        inProgress: 0,
        expired: 0,
        completionRate: 0,
        abandonmentRate: 0,
        averageCompletionTime: 0
      };

      let totalCompletionTime = 0;
      let completedCount = 0;

      for (const response of responses) {
        switch (response.status) {
          case 'completed':
            stats.completed++;
            if (response.completedAt && response.createdAt) {
              totalCompletionTime += response.completedAt - response.createdAt;
              completedCount++;
            }
            break;
          case 'abandoned':
            stats.abandoned++;
            break;
          case 'in_progress':
            stats.inProgress++;
            break;
          case 'expired':
            stats.expired++;
            break;
        }
      }

      // Calculate rates
      if (stats.total > 0) {
        stats.completionRate = parseFloat(((stats.completed / stats.total) * 100).toFixed(2));
        stats.abandonmentRate = parseFloat(((stats.abandoned / stats.total) * 100).toFixed(2));
      }

      // Calculate average completion time (in seconds)
      if (completedCount > 0) {
        stats.averageCompletionTime = Math.round(totalCompletionTime / completedCount / 1000);
      }

      logger.info('Flow completion stats calculated', { flowId, stats });

      return stats;

    } catch (error) {
      logger.error('Get flow completion stats error', { flowId, error: error.message });
      throw error;
    }
  }

  /**
   * Get flow abandonment details
   * @param {string} flowId - Flow ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Abandonment analysis
   */
  async getFlowAbandonmentAnalysis(flowId, options = {}) {
    try {
      const { startDate, endDate } = options;

      // Build date filter
      const dateFilter = { 
        flowId,
        status: 'abandoned'
      };
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      const abandonedResponses = await FlowResponse.find(dateFilter)
        .select('responseData createdAt updatedAt')
        .lean();

      // Analyze drop-off points
      const dropOffPoints = {};
      const abandonmentReasons = {
        earlyDropOff: 0,        // Abandoned in first screen
        midFlowDropOff: 0,      // Abandoned in middle
        nearCompletionDropOff: 0, // Abandoned near end
        timeout: 0               // Expired without action
      };

      for (const response of abandonedResponses) {
        const screenCount = Object.keys(response.responseData || {}).length;

        // Categorize abandonment
        if (screenCount === 0) {
          abandonmentReasons.earlyDropOff++;
        } else if (screenCount === 1) {
          abandonmentReasons.earlyDropOff++;
          
          // Track which screen was abandoned
          const lastScreen = Object.keys(response.responseData)[0];
          dropOffPoints[lastScreen] = (dropOffPoints[lastScreen] || 0) + 1;
        } else if (screenCount > 1) {
          // Check if timeout
          const timeDiff = response.updatedAt - response.createdAt;
          if (timeDiff > 30 * 60 * 1000) { // 30 minutes
            abandonmentReasons.timeout++;
          } else {
            abandonmentReasons.midFlowDropOff++;
          }

          // Track last screen before abandonment
          const screens = Object.keys(response.responseData);
          const lastScreen = screens[screens.length - 1];
          dropOffPoints[lastScreen] = (dropOffPoints[lastScreen] || 0) + 1;
        }
      }

      // Convert dropOffPoints to sorted array
      const dropOffArray = Object.entries(dropOffPoints)
        .map(([screen, count]) => ({
          screen,
          count,
          percentage: parseFloat(((count / abandonedResponses.length) * 100).toFixed(2))
        }))
        .sort((a, b) => b.count - a.count);

      const analysis = {
        totalAbandoned: abandonedResponses.length,
        reasons: abandonmentReasons,
        dropOffPoints: dropOffArray,
        topDropOffScreen: dropOffArray[0] || null
      };

      logger.info('Flow abandonment analysis completed', { flowId, totalAbandoned: abandonedResponses.length });

      return analysis;

    } catch (error) {
      logger.error('Get flow abandonment analysis error', { flowId, error: error.message });
      throw error;
    }
  }

  /**
   * Get flow performance report
   * @param {string} flowId - Flow ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Performance report
   */
  async getFlowPerformanceReport(flowId, options = {}) {
    try {
      const flow = await Flow.findById(flowId);
      if (!flow) {
        throw new Error('Flow not found');
      }

      // Get completion stats
      const completionStats = await this.getFlowCompletionStats(flowId, options);

      // Get abandonment analysis
      const abandonmentAnalysis = await this.getFlowAbandonmentAnalysis(flowId, options);

      // Get time-based trends
      const trends = await this.getFlowTrends(flowId, options);

      // Compile performance report
      const report = {
        flowId,
        flowName: flow.name,
        status: flow.status,
        overview: {
          totalResponses: completionStats.total,
          completionRate: completionStats.completionRate,
          abandonmentRate: completionStats.abandonmentRate,
          averageCompletionTime: completionStats.averageCompletionTime
        },
        completion: {
          completed: completionStats.completed,
          abandoned: completionStats.abandoned,
          inProgress: completionStats.inProgress,
          expired: completionStats.expired
        },
        abandonment: {
          total: abandonmentAnalysis.totalAbandoned,
          reasons: abandonmentAnalysis.reasons,
          topDropOffScreen: abandonmentAnalysis.topDropOffScreen,
          dropOffPoints: abandonmentAnalysis.dropOffPoints.slice(0, 5) // Top 5
        },
        trends: trends,
        analytics: {
          sentCount: flow.analytics?.sent_count || 0,
          completedCount: flow.analytics?.completed_count || 0,
          lastSentAt: flow.analytics?.last_sent_at
        },
        recommendations: this.generateRecommendations(completionStats, abandonmentAnalysis)
      };

      logger.info('Flow performance report generated', { flowId });

      return report;

    } catch (error) {
      logger.error('Get flow performance report error', { flowId, error: error.message });
      throw error;
    }
  }

  /**
   * Get flow response trends over time
   * @param {string} flowId - Flow ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Trends data
   */
  async getFlowTrends(flowId, options = {}) {
    try {
      const { groupBy = 'day', startDate, endDate } = options;

      // Default to last 30 days if no dates specified
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const responses = await FlowResponse.find({
        flowId,
        createdAt: {
          $gte: start,
          $lte: end
        }
      }).select('status createdAt').lean();

      // Group by time period
      const trends = {};

      for (const response of responses) {
        let bucket;
        if (groupBy === 'hour') {
          bucket = new Date(response.createdAt).toISOString().slice(0, 13) + ':00:00Z';
        } else if (groupBy === 'day') {
          bucket = new Date(response.createdAt).toISOString().slice(0, 10);
        } else if (groupBy === 'week') {
          const date = new Date(response.createdAt);
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          bucket = weekStart.toISOString().slice(0, 10);
        } else if (groupBy === 'month') {
          bucket = new Date(response.createdAt).toISOString().slice(0, 7);
        }

        if (!trends[bucket]) {
          trends[bucket] = {
            period: bucket,
            total: 0,
            completed: 0,
            abandoned: 0,
            inProgress: 0
          };
        }

        trends[bucket].total++;
        if (response.status === 'completed') trends[bucket].completed++;
        if (response.status === 'abandoned') trends[bucket].abandoned++;
        if (response.status === 'in_progress') trends[bucket].inProgress++;
      }

      // Convert to sorted array and add completion rate
      const trendArray = Object.values(trends)
        .map(trend => ({
          ...trend,
          completionRate: trend.total > 0 ? parseFloat(((trend.completed / trend.total) * 100).toFixed(2)) : 0
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return trendArray;

    } catch (error) {
      logger.error('Get flow trends error', { flowId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate recommendations based on analytics
   * @param {Object} completionStats - Completion statistics
   * @param {Object} abandonmentAnalysis - Abandonment analysis
   * @returns {Array<string>} Recommendations
   */
  generateRecommendations(completionStats, abandonmentAnalysis) {
    const recommendations = [];

    // Low completion rate
    if (completionStats.completionRate < 50) {
      recommendations.push('Completion rate is below 50%. Consider simplifying the flow or reducing the number of steps.');
    }

    // High early drop-off
    if (abandonmentAnalysis.reasons.earlyDropOff > abandonmentAnalysis.totalAbandoned * 0.5) {
      recommendations.push('High early drop-off detected. Review the first screen - it may be confusing or not engaging enough.');
    }

    // Timeout issues
    if (abandonmentAnalysis.reasons.timeout > abandonmentAnalysis.totalAbandoned * 0.3) {
      recommendations.push('Many users are timing out. Consider adding progress indicators or breaking the flow into smaller sessions.');
    }

    // Long completion time
    if (completionStats.averageCompletionTime > 300) { // 5 minutes
      recommendations.push('Average completion time is high. Consider reducing the number of required fields or steps.');
    }

    // High abandonment rate
    if (completionStats.abandonmentRate > 40) {
      recommendations.push('Abandonment rate is high. Review the flow for user experience issues or unclear instructions.');
    }

    // Top drop-off screen
    if (abandonmentAnalysis.topDropOffScreen) {
      recommendations.push(`Most users abandon at "${abandonmentAnalysis.topDropOffScreen.screen}". Review this screen for clarity and ease of use.`);
    }

    return recommendations;
  }

  /**
   * Get business-wide flow analytics
   * @param {string} businessId - Business ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Business analytics
   */
  async getBusinessFlowAnalytics(businessId, options = {}) {
    try {
      const flows = await Flow.find({ businessId, isDeleted: false });

      const analytics = {
        totalFlows: flows.length,
        publishedFlows: flows.filter(f => f.status === 'PUBLISHED').length,
        draftFlows: flows.filter(f => f.status === 'DRAFT').length,
        flows: []
      };

      // Get stats for each flow
      for (const flow of flows) {
        const stats = await this.getFlowCompletionStats(flow._id, options);
        analytics.flows.push({
          flowId: flow._id,
          name: flow.name,
          status: flow.status,
          completionRate: stats.completionRate,
          totalResponses: stats.total,
          completed: stats.completed,
          abandoned: stats.abandoned
        });
      }

      // Sort by completion rate
      analytics.flows.sort((a, b) => b.completionRate - a.completionRate);

      logger.info('Business flow analytics calculated', { businessId, totalFlows: analytics.totalFlows });

      return analytics;

    } catch (error) {
      logger.error('Get business flow analytics error', { businessId, error: error.message });
      throw error;
    }
  }
}

module.exports = new FlowAnalyticsService();
