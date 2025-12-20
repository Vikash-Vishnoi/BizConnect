const FlowResponse = require('../../../core/database/models/FlowResponse');
const Flow = require('../../../core/database/models/Flow');
const logger = require('../../../common/helpers/logger');
const config = require('../../../config/server.config');
const { ERROR_CODES, PAGINATION, TIME_CONSTANTS } = require('../../../common/constants');

/**
 * Flow Analytics Service
 * Track flow performance, completion rates, and user behavior
 * 
 * Flow Analytics Constants
 */
const FLOW_STATUS = {
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  IN_PROGRESS: 'in_progress',
  EXPIRED: 'expired'
};

const COMPLETION_RATE_THRESHOLDS = {
  LOW: 50,    // Below 50% is concerning
  GOOD: 70,   // Above 70% is good
  EXCELLENT: 85  // Above 85% is excellent
};

const TIME_THRESHOLDS = {
  TIMEOUT_MS: 30 * 60 * 1000,        // 30 minutes
  LONG_COMPLETION_SEC: 300,          // 5 minutes
  NEAR_COMPLETION_SCREENS: 3         // Last 3 screens = near completion
};

const DEFAULT_ANALYTICS_LIMIT = 50;

class FlowAnalyticsService {
  /**
   * Get flow completion statistics
   * @param {string} flowId - Flow ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Completion statistics
   */
  async getFlowCompletionStats(flowId, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate flowId
      if (!flowId) {
        const error = new Error('Flow ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const { startDate, endDate, businessId } = options;

      // Build date filter
      const dateFilter = { flowId };
      if (businessId) {
        dateFilter.businessId = businessId;
      }
      
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      // Get all responses for this flow
      const responses = await FlowResponse.find(dateFilter).lean();

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
          case FLOW_STATUS.COMPLETED:
            stats.completed++;
            if (response.completedAt && response.createdAt) {
              totalCompletionTime += response.completedAt - response.createdAt;
              completedCount++;
            }
            break;
          case FLOW_STATUS.ABANDONED:
            stats.abandoned++;
            break;
          case FLOW_STATUS.IN_PROGRESS:
            stats.inProgress++;
            break;
          case FLOW_STATUS.EXPIRED:
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
        stats.averageCompletionTime = Math.round(totalCompletionTime / completedCount / TIME_CONSTANTS.MILLISECONDS_PER_SECOND);
      }

      const processingTime = Date.now() - startTime;
      logger.info('Flow completion stats calculated', { 
        flowId, 
        businessId,
        stats: {
          total: stats.total,
          completionRate: stats.completionRate
        },
        processingTime
      });

      return stats;

    } catch (error) {
      logger.error('Get flow completion stats error', { 
        flowId, 
        error: error.message,
        stack: error.stack
      });
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
      const { startDate, endDate, businessId } = options;

      // Build date filter
      const dateFilter = { 
        flowId,
        status: FLOW_STATUS.ABANDONED
      };
      
      if (businessId) {
        dateFilter.businessId = businessId;
      }
      
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
        } else {
          // Check if timeout
          const timeDiff = response.updatedAt - response.createdAt;
          if (timeDiff > TIME_THRESHOLDS.TIMEOUT_MS) {
            abandonmentReasons.timeout++;
          } else if (screenCount >= TIME_THRESHOLDS.NEAR_COMPLETION_SCREENS) {
            abandonmentReasons.nearCompletionDropOff++;
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
          percentage: abandonedResponses.length > 0 
            ? parseFloat(((count / abandonedResponses.length) * 100).toFixed(2))
            : 0
        }))
        .sort((a, b) => b.count - a.count);

      const analysis = {
        totalAbandoned: abandonedResponses.length,
        reasons: abandonmentReasons,
        dropOffPoints: dropOffArray,
        topDropOffScreen: dropOffArray[0] || null
      };

      logger.info('Flow abandonment analysis completed', { 
        flowId,
        businessId,
        totalAbandoned: abandonedResponses.length 
      });

      return analysis;

    } catch (error) {
      logger.error('Get flow abandonment analysis error', { 
        flowId, 
        error: error.message,
        stack: error.stack
      });
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
      const { businessId } = options;
      
      // Validate and find flow
      if (!flowId) {
        const error = new Error('Flow ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const query = { _id: flowId };
      if (businessId) {
        query.businessId = businessId;
      }

      const flow = await Flow.findOne(query);
      if (!flow) {
        const error = new Error('Flow not found or access denied');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
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
      const { groupBy = 'day', startDate, endDate, businessId } = options;

      // Default to last 30 days if no dates specified
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - TIME_CONSTANTS.DAYS_PER_MONTH * TIME_CONSTANTS.MILLISECONDS_PER_DAY);

      const query = {
        flowId,
        createdAt: {
          $gte: start,
          $lte: end
        }
      };
      
      if (businessId) {
        query.businessId = businessId;
      }

      const responses = await FlowResponse.find(query)
        .select('status createdAt')
        .lean();

      // Group by time period
      const trends = {};

      for (const response of responses) {
        let bucket;
        const date = new Date(response.createdAt);
        
        if (groupBy === 'hour') {
          bucket = date.toISOString().slice(0, 13) + ':00:00Z';
        } else if (groupBy === 'day') {
          bucket = date.toISOString().slice(0, 10);
        } else if (groupBy === 'week') {
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          bucket = weekStart.toISOString().slice(0, 10);
        } else if (groupBy === 'month') {
          bucket = date.toISOString().slice(0, 7);
        } else {
          bucket = date.toISOString().slice(0, 10); // Default to day
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
        if (response.status === FLOW_STATUS.COMPLETED) trends[bucket].completed++;
        if (response.status === FLOW_STATUS.ABANDONED) trends[bucket].abandoned++;
        if (response.status === FLOW_STATUS.IN_PROGRESS) trends[bucket].inProgress++;
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
      logger.error('Get flow trends error', { 
        flowId, 
        error: error.message,
        stack: error.stack
      });
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
    if (completionStats.completionRate < COMPLETION_RATE_THRESHOLDS.LOW) {
      recommendations.push(`Completion rate is ${completionStats.completionRate}%, below the ${COMPLETION_RATE_THRESHOLDS.LOW}% threshold. Consider simplifying the flow or reducing the number of steps.`);
    }

    // High early drop-off
    const earlyDropOffRate = abandonmentAnalysis.totalAbandoned > 0
      ? (abandonmentAnalysis.reasons.earlyDropOff / abandonmentAnalysis.totalAbandoned)
      : 0;
    
    if (earlyDropOffRate > 0.5) {
      recommendations.push('High early drop-off detected (>50% abandon in first screen). Review the first screen - it may be confusing or not engaging enough.');
    }

    // Timeout issues
    const timeoutRate = abandonmentAnalysis.totalAbandoned > 0
      ? (abandonmentAnalysis.reasons.timeout / abandonmentAnalysis.totalAbandoned)
      : 0;
    
    if (timeoutRate > 0.3) {
      recommendations.push('Many users are timing out (>30%). Consider adding progress indicators or breaking the flow into smaller sessions.');
    }

    // Long completion time
    if (completionStats.averageCompletionTime > TIME_THRESHOLDS.LONG_COMPLETION_SEC) {
      const minutes = Math.round(completionStats.averageCompletionTime / TIME_CONSTANTS.SECONDS_PER_MINUTE);
      recommendations.push(`Average completion time is ${minutes} minutes. Consider reducing the number of required fields or steps.`);
    }

    // High abandonment rate
    if (completionStats.abandonmentRate > 40) {
      recommendations.push(`Abandonment rate is ${completionStats.abandonmentRate}%. Review the flow for user experience issues or unclear instructions.`);
    }

    // Top drop-off screen
    if (abandonmentAnalysis.topDropOffScreen) {
      recommendations.push(`Most users abandon at "${abandonmentAnalysis.topDropOffScreen.screen}" (${abandonmentAnalysis.topDropOffScreen.percentage}%). Review this screen for clarity and ease of use.`);
    }

    // Excellent performance
    if (completionStats.completionRate >= COMPLETION_RATE_THRESHOLDS.EXCELLENT) {
      recommendations.push(`✅ Excellent completion rate of ${completionStats.completionRate}%! Flow is performing well.`);
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
      // Validate businessId
      if (!businessId) {
        const error = new Error('Business ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const flows = await Flow.find({ businessId, isDeleted: false })
        .select('_id name status analytics')
        .lean();

      const analytics = {
        businessId,
        totalFlows: flows.length,
        publishedFlows: flows.filter(f => f.status === 'PUBLISHED').length,
        draftFlows: flows.filter(f => f.status === 'DRAFT').length,
        flows: []
      };

      // Get stats for each flow (limit to avoid performance issues)
      const flowsToAnalyze = flows.slice(0, DEFAULT_ANALYTICS_LIMIT);
      
      for (const flow of flowsToAnalyze) {
        try {
          const stats = await this.getFlowCompletionStats(flow._id, { ...options, businessId });
          analytics.flows.push({
            flowId: flow._id,
            name: flow.name,
            status: flow.status,
            completionRate: stats.completionRate,
            totalResponses: stats.total,
            completed: stats.completed,
            abandoned: stats.abandoned
          });
        } catch (flowError) {
          logger.warn('Error getting stats for flow', {
            flowId: flow._id,
            error: flowError.message,
            businessId
          });
          // Continue with other flows
        }
      }

      // Sort by completion rate
      analytics.flows.sort((a, b) => b.completionRate - a.completionRate);

      if (flows.length > DEFAULT_ANALYTICS_LIMIT) {
        analytics.note = `Showing analytics for ${DEFAULT_ANALYTICS_LIMIT} out of ${flows.length} flows`;
      }

      logger.info('Business flow analytics calculated', { 
        businessId, 
        totalFlows: analytics.totalFlows,
        analyzedFlows: analytics.flows.length
      });

      return analytics;

    } catch (error) {
      logger.error('Get business flow analytics error', { 
        businessId, 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = new FlowAnalyticsService();
module.exports.FLOW_STATUS = FLOW_STATUS;
module.exports.COMPLETION_RATE_THRESHOLDS = COMPLETION_RATE_THRESHOLDS;
