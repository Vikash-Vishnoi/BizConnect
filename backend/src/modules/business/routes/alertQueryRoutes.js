/**
 * Alert Query Routes - Retrieve and filter alerts
 * @module routes/alerts/alertQueryRoutes
 */
 
const express = require('express');
const router = express.Router();
const { AlertLog } = require('../../../core/database/models');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { HTTP_STATUS, ERROR_CODES } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');

// Constants
const PAGINATION = {
  DEFAULT_LIMIT: parseInt(process.env.ALERTS_DEFAULT_LIMIT) || 50,
  MAX_LIMIT: parseInt(process.env.ALERTS_MAX_LIMIT) || 100,
  DEFAULT_PAGE: 1
};

const ALERT_SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

const ALERT_STATUS = {
  UNRESOLVED: 'UNRESOLVED',
  RESOLVED: 'RESOLVED'
};

const SORT_ORDER = {
  NEWEST_FIRST: { createdAt: -1 },
  SEVERITY_FIRST: { severity: -1, createdAt: -1 }
};

// GET / - Get all alerts
router.get('/', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { severity, status, type, limit = PAGINATION.DEFAULT_LIMIT, page = PAGINATION.DEFAULT_PAGE } = req.query;

    const requestedLimit = parseInt(limit);
    const finalLimit = Math.min(requestedLimit, PAGINATION.MAX_LIMIT);

    const query = { businessId: req.businessId };
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (type) query.type = type;

    const alerts = await AlertLog.find(query)
      .sort(SORT_ORDER.NEWEST_FIRST)
      .limit(finalLimit)
      .skip((parseInt(page) - 1) * finalLimit);

    const total = await AlertLog.countDocuments(query);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Alerts retrieved successfully',
      data: {
        count: alerts.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / finalLimit),
        alerts
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error getting alerts', {
      businessId: req.businessId.toString(),
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get alerts',
      error: error.message,
      processingTime
    });
  }
});

// GET /stats - Get alert statistics
router.get('/stats', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const [total, critical, high, medium, low, unresolved, resolved] = await Promise.all([
      AlertLog.countDocuments({ businessId: req.businessId }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: ALERT_SEVERITY.CRITICAL }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: ALERT_SEVERITY.HIGH }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: ALERT_SEVERITY.MEDIUM }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: ALERT_SEVERITY.LOW }),
      AlertLog.countDocuments({ businessId: req.businessId, status: ALERT_STATUS.UNRESOLVED }),
      AlertLog.countDocuments({ businessId: req.businessId, status: ALERT_STATUS.RESOLVED })
    ]);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Alert statistics retrieved successfully',
      data: {
        stats: {
          total,
          bySeverity: { critical, high, medium, low },
          byStatus: { unresolved, resolved }
        }
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error getting alert stats', {
      businessId: req.businessId.toString(),
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get alert stats',
      error: error.message,
      processingTime
    });
  }
});

// GET /unresolved - Get unresolved alerts
router.get('/unresolved', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const alerts = await AlertLog.find({
      businessId: req.businessId,
      status: ALERT_STATUS.UNRESOLVED
    }).sort(SORT_ORDER.SEVERITY_FIRST);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Unresolved alerts retrieved successfully',
      data: {
        count: alerts.length,
        alerts
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error getting unresolved alerts', {
      businessId: req.businessId.toString(),
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get unresolved alerts',
      error: error.message,
      processingTime
    });
  }
});

// GET /critical - Get critical alerts
router.get('/critical', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const alerts = await AlertLog.find({
      businessId: req.businessId,
      severity: ALERT_SEVERITY.CRITICAL
    }).sort(SORT_ORDER.NEWEST_FIRST);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Critical alerts retrieved successfully',
      data: {
        count: alerts.length,
        alerts
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error getting critical alerts', {
      businessId: req.businessId.toString(),
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get critical alerts',
      error: error.message,
      processingTime
    });
  }
});

// GET /:id - Get alert by ID
router.get('/:id', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Alert not found',
        processingTime
      });
    }

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Alert retrieved successfully',
      data: { alert },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error getting alert', {
      businessId: req.businessId.toString(),
      alertId: req.params.id,
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get alert',
      error: error.message,
      processingTime
    });
  }
});

module.exports = router;
