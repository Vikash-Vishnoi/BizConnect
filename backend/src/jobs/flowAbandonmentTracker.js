const FlowResponse = require('../core/database/models/FlowResponse');
const logger = require('../common/helpers/logger');

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
    this.abandonmentThreshold = 30 * 60 * 1000; // 30 minutes
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
        status: 'in_progress',
        updatedAt: { $lt: cutoffTime }
      });

      let markedCount = 0;

      for (const flowResponse of staleFlows) {
        try {
          // Use the model's markAbandoned method
          await flowResponse.markAbandoned();
          markedCount++;

          logger.info('Flow marked as abandoned', {
            flowResponseId: flowResponse._id,
            flowId: flowResponse.flowId,
            contactPhone: flowResponse.contactPhone,
            inactiveFor: Math.round((Date.now() - flowResponse.updatedAt.getTime()) / 60000) + ' minutes'
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
        status: 'in_progress',
        expiresAt: { $lt: new Date() }
      });

      for (const flowResponse of expiredFlows) {
        try {
          flowResponse.status = 'expired';
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
      const query = { status: 'abandoned' };
      
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

        if (screenCount === 0 || screenCount === 1) {
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
        stats.averageTimeBeforeAbandonment = Math.round(totalTime / abandonedFlows.length / 1000); // seconds
      }

      // Convert dropOffPoints to sorted array
      const dropOffArray = Object.entries(stats.dropOffPoints)
        .map(([screen, count]) => ({
          screen,
          count,
          percentage: parseFloat(((count / abandonedFlows.length) * 100).toFixed(2))
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
      const { limit = 50, flowId, businessId } = options;

      const query = { status: 'abandoned' };
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
        timeInFlow: Math.round((flow.updatedAt - flow.createdAt) / 1000), // seconds
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
