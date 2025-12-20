const express = require('express');
const router = express.Router();
const flowAnalyticsService = require('../services/flowAnalyticsService');
const { auth } = require('../../../core/middlewares/auth');
const { businessContext } = require('../../../core/middlewares/businessContext');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS, MONGODB_PATTERNS } = require('../../../common/constants');

/**
 * Flow Analytics Routes
 * Track flow performance and user behavior
 * 
 * P2 FIX: Flow analytics dashboard
 */

/**
 * @route   GET /api/flows/:flowId/analytics/completion
 * @desc    Get flow completion statistics
 * @access  Private
 */
router.get('/:flowId/analytics/completion', auth, businessContext, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { startDate, endDate } = req.query;
    const businessId = req.businessId;

    // Validate flowId format
    if (!flowId || !MONGODB_PATTERNS.OBJECT_ID.test(flowId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid flow ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const stats = await flowAnalyticsService.getFlowCompletionStats(flowId, {
      startDate,
      endDate,
      businessId
    });

    res.json({
      success: true,
      message: 'Flow completion stats retrieved successfully',
      data: stats
    });
  } catch (error) {
    logger.error('Get flow completion stats error', {
      flowId: req.params.flowId,
      businessId: req.businessId,
      userId: req.user?._id,
      error: error.message
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : error.code === ERROR_CODES.NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve completion stats',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/flows/:flowId/analytics/abandonment
 * @desc    Get flow abandonment analysis
 * @access  Private
 */
router.get('/:flowId/analytics/abandonment', auth, businessContext, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { startDate, endDate } = req.query;
    const businessId = req.businessId;

    // Validate flowId format
    if (!flowId || !MONGODB_PATTERNS.OBJECT_ID.test(flowId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid flow ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const analysis = await flowAnalyticsService.getFlowAbandonmentAnalysis(flowId, {
      startDate,
      endDate,
      businessId
    });

    res.json({
      success: true,
      message: 'Flow abandonment analysis retrieved successfully',
      data: analysis
    });
  } catch (error) {
    logger.error('Get flow abandonment analysis error', {
      flowId: req.params.flowId,
      businessId: req.businessId,
      userId: req.user?._id,
      error: error.message
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : error.code === ERROR_CODES.NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve abandonment analysis',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/flows/:flowId/analytics/performance
 * @desc    Get comprehensive flow performance report
 * @access  Private
 */
router.get('/:flowId/analytics/performance', auth, businessContext, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { startDate, endDate } = req.query;
    const businessId = req.businessId;

    // Validate flowId format
    if (!flowId || !MONGODB_PATTERNS.OBJECT_ID.test(flowId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid flow ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const report = await flowAnalyticsService.getFlowPerformanceReport(flowId, {
      startDate,
      endDate,
      businessId
    });

    res.json({
      success: true,
      message: 'Flow performance report retrieved successfully',
      data: report
    });
  } catch (error) {
    logger.error('Get flow performance report error', {
      flowId: req.params.flowId,
      businessId: req.businessId,
      userId: req.user?._id,
      error: error.message
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : error.code === ERROR_CODES.NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve performance report',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/flows/:flowId/analytics/trends
 * @desc    Get flow response trends over time
 * @access  Private
 */
router.get('/:flowId/analytics/trends', auth, businessContext, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { groupBy, startDate, endDate } = req.query;
    const businessId = req.businessId;

    // Validate flowId format
    if (!flowId || !MONGODB_PATTERNS.OBJECT_ID.test(flowId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid flow ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    // Validate groupBy
    if (groupBy && !ANALYTICS_GROUPBY_OPTIONS.includes(groupBy)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: `groupBy must be one of: ${ANALYTICS_GROUPBY_OPTIONS.join(', ')}`,
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const trends = await flowAnalyticsService.getFlowTrends(flowId, {
      groupBy: groupBy || 'day',
      startDate,
      endDate,
      businessId
    });

    res.json({
      success: true,
      message: 'Flow trends retrieved successfully',
      data: trends
    });
  } catch (error) {
    logger.error('Get flow trends error', {
      flowId: req.params.flowId,
      businessId: req.businessId,
      userId: req.user?._id,
      error: error.message
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve flow trends',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/business/:businessId/flows/analytics
 * @desc    Get business-wide flow analytics
 * @access  Private
 */
router.get('/business/:businessId/analytics', auth, businessContext, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate businessId format
    if (!businessId || !MONGODB_PATTERNS.OBJECT_ID.test(businessId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid business ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    // Verify user has access to this business
    if (req.businessId && req.businessId !== businessId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Access denied to this business',
        code: ERROR_CODES.BUSINESS_ACCESS_DENIED
      });
    }

    const analytics = await flowAnalyticsService.getBusinessFlowAnalytics(businessId, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      message: 'Business flow analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    logger.error('Get business flow analytics error', {
      businessId: req.params.businessId,
      userId: req.user?._id,
      error: error.message
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : error.code === ERROR_CODES.FORBIDDEN
      ? HTTP_STATUS.FORBIDDEN
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve business analytics',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

module.exports = router;
