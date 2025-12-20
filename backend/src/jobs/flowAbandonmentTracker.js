const FlowResponse = require('../core/database/models/FlowResponse');
const logger = require('../common/helpers/logger');

// Constants for flow abandonment tracking
const ABANDONMENT_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const FLOW_STATUS_IN_PROGRESS = 'in_progress'; // In progress status
const FLOW_STATUS_ABANDONED = 'abandoned'; // Abandoned status
const FLOW_STATUS_EXPIRED = 'expired'; // Expired status
const DEFAULT_RECENTLY_ABANDONED_LIMIT = 50; // Default limit for recently abandoned flows
const MS_TO_SECONDS = 1000; // Milliseconds to seconds conversion
const MS_TO_MINUTES = 60000; // Milliseconds to minutes conversion
const EARLY_DROP_OFF_SCREEN_MAX = 1; // Max screens completed for early drop-off
const PERCENTAGE_DECIMAL_PLACES = 2; // Decimal places for percentage

/**
 * Flow Abandonment Tracker Job
 * Identifies and marks abandoned flow responses
 * 
 * P2 FIX: Flow abandonment tracking
 * 
 * Run frequency: Every 1 hour
 * Purpose: Mark flows as abandoned if:
 * - In progress for > 30 minutes with no activity
 * - Expired without completion
 */

class FlowAbandonmentTracker {
  constructor() {
    this.abandonmentThreshold = ABANDONMENT_THRESHOLD_MS;
    this.isRunning = false;
  }

  /**
   * Execute the abandonment tracking job
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Flow abandonment tracker already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Flow abandonment tracker started');

      // Find in-progress flows that haven't been updated recently
      const cutoffTime = new Date(Date.now() - this.abandonmentThreshold);

      const staleFlows = await FlowResponse.find({
        status: FLOW_STATUS_IN_PROGRESS,
        updatedAt: { $lt: cutoffTime }
      });

      let markedCount = 0;

      for (const flowResponse of staleFlows) {
        try {
          // Use the model's markAbandoned method
          await flowResponse.markAbandoned();
          markedCount++;

          const inactiveMinutes = Math.round((Date.now() - flowResponse.updatedAt.getTime()) / MS_TO_MINUTES);

          logger.info('Flow marked as abandoned', {
            flowResponseId: flowResponse._id,
            flowId: flowResponse.flowId,
            contactPhone: flowResponse.contactPhone,
            inactiveFor: `${inactiveMinutes} minutes`
          });

        } catch (error) {
          logger.error('Error marking flow as abandoned', {
            flowResponseId: flowResponse._id,
            error: error.message
          });
        }
      }

      // Also check for expired flows
      const expiredFlows = await FlowResponse.find({
        status: FLOW_STATUS_IN_PROGRESS,
        expiresAt: { $lt: new Date() }
      });

      for (const flowResponse of expiredFlows) {
        try {
          flowResponse.status = FLOW_STATUS_EXPIRED;
          await flowResponse.save();
          markedCount++;

          logger.info('Flow marked as expired', {
            flowResponseId: flowResponse._id,
            flowId: flowResponse.flowId,
            contactPhone: flowResponse.contactPhone
          });

        } catch (error) {
          logger.error('Error marking flow as expired', {
            flowResponseId: flowResponse._id,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Flow abandonment tracker completed', {
        totalChecked: staleFlows.length + expiredFlows.length,
        markedAbandoned: markedCount,
        duration: duration + 'ms'
      });

      return {
        success: true,
        totalChecked: staleFlows.length + expiredFlows.length,
        markedAbandoned: markedCount,
        duration
      };

    } catch (error) {
      logger.error('Flow abandonment tracker error', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get abandonment statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Abandonment stats
   */
  async getAbandonmentStats(options = {}) {
    try {
      const { flowId, businessId, startDate, endDate } = options;

      // Build query
      const query = { status: FLOW_STATUS_ABANDONED };
      
      if (flowId) query.flowId = flowId;
      if (businessId) query.businessId = businessId;
      
      if (startDate || endDate) {
        query.updatedAt = {};
        if (startDate) query.updatedAt.$gte = new Date(startDate);
        if (endDate) query.updatedAt.$lte = new Date(endDate);
      }

      const abandonedFlows = await FlowResponse.find(query)
        .select('flowId contactPhone responseData createdAt updatedAt')
        .lean();

      // Calculate statistics
      const stats = {
        totalAbandoned: abandonedFlows.length,
        abandonmentReasons: {
          earlyDropOff: 0,
          midFlowDropOff: 0,
          timeout: 0
        },
        averageTimeBeforeAbandonment: 0,
        dropOffPoints: {}
      };

      let totalTime = 0;

      for (const flow of abandonedFlows) {
        const timeDiff = flow.updatedAt - flow.createdAt;
        totalTime += timeDiff;

        // Categorize abandonment reason
        const screenCount = Object.keys(flow.responseData || {}).length;

        if (screenCount === 0 || screenCount === EARLY_DROP_OFF_SCREEN_MAX) {
          stats.abandonmentReasons.earlyDropOff++;
        } else if (timeDiff > this.abandonmentThreshold) {
          stats.abandonmentReasons.timeout++;
        } else {
          stats.abandonmentReasons.midFlowDropOff++;
        }

        // Track drop-off points
        if (screenCount > 0) {
          const screens = Object.keys(flow.responseData);
          const lastScreen = screens[screens.length - 1];
          stats.dropOffPoints[lastScreen] = (stats.dropOffPoints[lastScreen] || 0) + 1;
        }
      }

      if (abandonedFlows.length > 0) {
        stats.averageTimeBeforeAbandonment = Math.round(totalTime / abandonedFlows.length / MS_TO_SECONDS); // seconds
      }

      // Convert dropOffPoints to sorted array
      const dropOffArray = Object.entries(stats.dropOffPoints)
        .map(([screen, count]) => ({
          screen,
          count,
          percentage: parseFloat(((count / abandonedFlows.length) * 100).toFixed(PERCENTAGE_DECIMAL_PLACES))
        }))
        .sort((a, b) => b.count - a.count);

      stats.dropOffPoints = dropOffArray;
      stats.topDropOffScreen = dropOffArray[0] || null;

      logger.info('Abandonment stats calculated', {
        flowId,
        businessId,
        totalAbandoned: stats.totalAbandoned
      });

      return stats;

    } catch (error) {
      logger.error('Get abandonment stats error', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get recently abandoned flows
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Recently abandoned flows
   */
  async getRecentlyAbandoned(options = {}) {
    try {
      const { limit = DEFAULT_RECENTLY_ABANDONED_LIMIT, flowId, businessId } = options;

      const query = { status: FLOW_STATUS_ABANDONED };
      if (flowId) query.flowId = flowId;
      if (businessId) query.businessId = businessId;

      const abandonedFlows = await FlowResponse.find(query)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate('flowId', 'name')
        .lean();

      const flows = abandonedFlows.map(flow => ({
        flowResponseId: flow._id,
        flowId: flow.flowId,
        flowName: flow.flowId?.name,
        contactPhone: flow.contactPhone,
        abandonedAt: flow.updatedAt,
        timeInFlow: Math.round((flow.updatedAt - flow.createdAt) / MS_TO_SECONDS), // seconds
        screensCompleted: Object.keys(flow.responseData || {}).length
      }));

      logger.info('Recently abandoned flows retrieved', {
        count: flows.length,
        limit
      });

      return flows;

    } catch (error) {
      logger.error('Get recently abandoned error', {
        error: error.message
      });
      throw error;
    }
  }
}

// Export singleton instance
const tracker = new FlowAbandonmentTracker();

module.exports = tracker;
