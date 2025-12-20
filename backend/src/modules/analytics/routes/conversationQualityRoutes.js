const express = require('express');
const router = express.Router();
const conversationQualityService = require('../services/conversationQualityService');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const { NotFoundError, ValidationError, ConflictError } = require('../../../core/middlewares/errorHandler');

// ============================================================================
// CONSTANTS
// ============================================================================

// Route Paths
const ROUTE_PATHS = {
  CONVERSATION_QUALITY: '/conversations/:conversationId/quality',
  BUSINESS_QUALITY: '/quality/business/:businessId',
  QUALITY_TRENDS: '/quality/trends'
};

// Query Parameters
const DEFAULT_LIMIT = 100;
const DEFAULT_SKIP = 0;

// Group By Options
const GROUP_BY_OPTIONS = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month'
};

const VALID_GROUP_BY = [
  GROUP_BY_OPTIONS.HOUR,
  GROUP_BY_OPTIONS.DAY,
  GROUP_BY_OPTIONS.WEEK,
  GROUP_BY_OPTIONS.MONTH
];

// Default Values
const DEFAULT_GROUP_BY = GROUP_BY_OPTIONS.DAY;

// Error Messages
const ERROR_MESSAGES = {
  BUSINESS_ID_REQUIRED: 'businessId is required',
  ACCESS_DENIED: 'Access denied',
  INVALID_GROUP_BY: `groupBy must be one of: ${VALID_GROUP_BY.join(', ')}`,
  QUALITY_SCORE_ERROR: 'Failed to retrieve conversation quality score',
  BUSINESS_METRICS_ERROR: 'Failed to retrieve business quality metrics',
  TRENDS_ERROR: 'Failed to retrieve quality trends'
};

// Success Messages
const SUCCESS_MESSAGES = {
  QUALITY_SCORE_RETRIEVED: 'Conversation quality score retrieved successfully',
  BUSINESS_METRICS_RETRIEVED: 'Business quality metrics retrieved successfully',
  TRENDS_RETRIEVED: 'Quality trends retrieved successfully'
};

// User Roles
const USER_ROLES = {
  ADMIN: 'admin'
};

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
router.get(ROUTE_PATHS.CONVERSATION_QUALITY, auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { conversationId } = req.params;

    const metrics = await conversationQualityService.calculateQualityScore(conversationId);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: metrics,
      message: SUCCESS_MESSAGES.QUALITY_SCORE_RETRIEVED,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get conversation quality error', {
      error: error.message,
      stack: error.stack,
      conversationId: req.params.conversationId,
      userId: req.user?.id,
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.QUALITY_SCORE_ERROR);
  }
});

/**
 * GET /api/analytics/quality/business/:businessId
 * Get aggregate quality metrics for a business
 */
router.get(ROUTE_PATHS.BUSINESS_QUALITY, auth, requireBusiness, async (req, res) => {
  const startTime = Date.now();
  try {
    const { businessId } = req.params;
    const { startDate, endDate, limit, skip } = req.query;

    const metrics = await conversationQualityService.getBusinessQualityMetrics(businessId, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : DEFAULT_LIMIT,
      skip: skip ? parseInt(skip) : DEFAULT_SKIP
    });

    // Add recommendations
    const recommendations = conversationQualityService.getQualityRecommendations(metrics);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        ...metrics,
        recommendations
      },
      message: SUCCESS_MESSAGES.BUSINESS_METRICS_RETRIEVED,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get business quality metrics error', {
      error: error.message,
      stack: error.stack,
      businessId: req.params.businessId?.toString(),
      userId: req.user?.id,
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.BUSINESS_METRICS_ERROR);
  }
});

/**
 * GET /api/analytics/quality/trends
 * Get quality trends over time
 */
router.get(ROUTE_PATHS.QUALITY_TRENDS, auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { businessId, groupBy, startDate, endDate } = req.query;

    if (!businessId) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.BUSINESS_ID_REQUIRED,
        processingTime
      });
    }

    // Verify business access
    if (req.user.role !== USER_ROLES.ADMIN && req.user.businessId.toString() !== businessId) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED,
        processingTime
      });
    }

    // Validate groupBy
    if (groupBy && !VALID_GROUP_BY.includes(groupBy)) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_GROUP_BY,
        processingTime
      });
    }

    const trends = await conversationQualityService.getQualityTrends(businessId, {
      groupBy: groupBy || DEFAULT_GROUP_BY,
      startDate,
      endDate
    });

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        groupBy: groupBy || DEFAULT_GROUP_BY,
        trends
      },
      message: SUCCESS_MESSAGES.TRENDS_RETRIEVED,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get quality trends error', {
      error: error.message,
      stack: error.stack,
      businessId: req.query.businessId?.toString(),
      userId: req.user?.id,
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.TRENDS_ERROR);
  }
});

module.exports = router;
