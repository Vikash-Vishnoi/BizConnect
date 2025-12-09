const express = require('express');
const router = express.Router();
const flowAnalyticsService = require('../services/flowAnalyticsService');
const { auth } = require('../../../core/middlewares/auth');
const { enforceBusinessIsolation } = require('../../../core/middlewares/businessSecurity');
const logger = require('../../../common/helpers/logger');

/**
 * Flow Analytics Routes
 * Track flow performance and user behavior
 * 
 * P2 FIX: Flow analytics dashboard
 */

/**
 * GET /api/flows/:flowId/analytics/completion
 * Get flow completion statistics
 */
router.get('/:flowId/analytics/completion', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await flowAnalyticsService.getFlowCompletionStats(flowId, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get flow completion stats error', {
      flowId: req.params.flowId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/flows/:flowId/analytics/abandonment
 * Get flow abandonment analysis
 */
router.get('/:flowId/analytics/abandonment', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { startDate, endDate } = req.query;

    const analysis = await flowAnalyticsService.getFlowAbandonmentAnalysis(flowId, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error('Get flow abandonment analysis error', {
      flowId: req.params.flowId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/flows/:flowId/analytics/performance
 * Get comprehensive flow performance report
 */
router.get('/:flowId/analytics/performance', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { startDate, endDate } = req.query;

    const report = await flowAnalyticsService.getFlowPerformanceReport(flowId, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error('Get flow performance report error', {
      flowId: req.params.flowId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/flows/:flowId/analytics/trends
 * Get flow response trends over time
 */
router.get('/:flowId/analytics/trends', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { groupBy, startDate, endDate } = req.query;

    // Validate groupBy
    if (groupBy && !['hour', 'day', 'week', 'month'].includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message: 'groupBy must be one of: hour, day, week, month'
      });
    }

    const trends = await flowAnalyticsService.getFlowTrends(flowId, {
      groupBy: groupBy || 'day',
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    logger.error('Get flow trends error', {
      flowId: req.params.flowId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/business/:businessId/flows/analytics
 * Get business-wide flow analytics
 */
router.get('/business/:businessId/analytics', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;

    const analytics = await flowAnalyticsService.getBusinessFlowAnalytics(businessId, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Get business flow analytics error', {
      businessId: req.params.businessId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
