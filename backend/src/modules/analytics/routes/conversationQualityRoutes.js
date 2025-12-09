const express = require('express');
const router = express.Router();
const conversationQualityService = require('../services/conversationQualityService');
const { auth } = require('../../../core/middlewares/auth');
const { enforceBusinessIsolation } = require('../../../core/middlewares/businessSecurity');
const logger = require('../../../common/helpers/logger');

/**
 * Conversation Quality Routes
 * Track conversation quality and engagement metrics
 * 
 * P2 FIX: Conversation quality metrics
 */

/**
 * GET /api/analytics/conversations/:conversationId/quality
 * Get quality score for a specific conversation
 */
router.get('/conversations/:conversationId/quality', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const metrics = await conversationQualityService.calculateQualityScore(conversationId);

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Get conversation quality error', {
      conversationId: req.params.conversationId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/quality/business/:businessId
 * Get aggregate quality metrics for a business
 */
router.get('/quality/business/:businessId', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate, limit, skip } = req.query;

    const metrics = await conversationQualityService.getBusinessQualityMetrics(businessId, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100,
      skip: skip ? parseInt(skip) : 0
    });

    // Add recommendations
    const recommendations = conversationQualityService.getQualityRecommendations(metrics);

    res.json({
      success: true,
      data: {
        ...metrics,
        recommendations
      }
    });

  } catch (error) {
    logger.error('Get business quality metrics error', {
      businessId: req.params.businessId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/quality/trends
 * Get quality trends over time
 */
router.get('/quality/trends', auth, async (req, res) => {
  try {
    const { businessId, groupBy, startDate, endDate } = req.query;

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
    if (groupBy && !['hour', 'day', 'week', 'month'].includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message: 'groupBy must be one of: hour, day, week, month'
      });
    }

    const trends = await conversationQualityService.getQualityTrends(businessId, {
      groupBy: groupBy || 'day',
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: {
        groupBy: groupBy || 'day',
        trends
      }
    });

  } catch (error) {
    logger.error('Get quality trends error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
