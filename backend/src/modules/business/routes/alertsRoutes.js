/**
 * Consolidated Alerts Routes
 * Reduced from 10 routes to 6 routes
 * @module routes/alerts/alertsRoutes
 */
 
const express = require('express');
const router = express.Router();
const { AlertLog } = require('../../../core/database/models');
const logger = require('../../../common/helpers/logger');

// Route constants
const ROUTE_CONTEXT = 'ALERTS_ROUTES';
const ALERTS_DEFAULT_LIMIT = 50;
const ALERTS_MAX_LIMIT = 100;
const VALID_ALERT_STATUSES = ['UNRESOLVED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'];
const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DEFAULT_PAGE = 1;

// Error messages
const ERROR_MESSAGES = {
  GET_ALERTS: 'Failed to get alerts',
  GET_STATS: 'Failed to get alert stats',
  GET_ALERT: 'Failed to get alert',
  UPDATE_ALERT: 'Failed to update alert',
  ALERT_NOT_FOUND: 'Alert not found',
  MARK_READ: 'Failed to mark alerts as read',
  CREATE_TEST: 'Failed to create test alert',
  INVALID_STATUS: 'Invalid status',
  INVALID_ALERT_IDS: 'alertIds array is required',
  TEST_NOT_ALLOWED: 'Test alerts are not allowed in production'
};

// Success messages
const SUCCESS_MESSAGES = {
  ALERTS_RETRIEVED: 'Alerts retrieved successfully',
  STATS_RETRIEVED: 'Alert statistics retrieved successfully',
  ALERT_RETRIEVED: 'Alert retrieved successfully',
  ALERT_UPDATED: 'Alert updated successfully',
  STATUS_UPDATED: 'Alert status updated successfully',
  ACKNOWLEDGED: 'Alert acknowledged successfully',
  RESOLVED: 'Alert resolved successfully',
  ACTION_RECORDED: 'Action recorded successfully',
  MARKED_READ: 'alerts marked as read',
  TEST_CREATED: 'Test alert created successfully'
};

// GET / - Get all alerts with filtering
// Consolidates: /, /unresolved, /critical
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const businessContext = {
    businessId: req.businessId?.toString(),
    context: ROUTE_CONTEXT,
    operation: 'GET_ALERTS'
  };

  try {
    const { severity, status, type, limit = ALERTS_DEFAULT_LIMIT, page = DEFAULT_PAGE } = req.query;

    const requestedLimit = parseInt(limit);
    const finalLimit = Math.min(requestedLimit, ALERTS_MAX_LIMIT);
    const pageNum = parseInt(page);

    const query = { businessId: req.businessId };
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (type) query.type = type;

    const alerts = await AlertLog.find(query)
      .sort({ createdAt: -1 })
      .limit(finalLimit)
      .skip((pageNum - 1) * finalLimit);

    const total = await AlertLog.countDocuments(query);

    const processingTime = Date.now() - startTime;
    logger.info('Alerts retrieved', { ...businessContext, count: alerts.length, total, processingTime });

    res.success({
      count: alerts.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / finalLimit),
      alerts
    }, SUCCESS_MESSAGES.ALERTS_RETRIEVED);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error getting alerts', {
      ...businessContext,
      error: error.message,
      stack: error.stack,
      processingTime
    });
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.GET_ALERTS,
      error: error.message
    });
  }
});

// GET /stats - Get alert statistics
router.get('/stats', async (req, res) => {
  const startTime = Date.now();
  const businessContext = {
    businessId: req.businessId?.toString(),
    context: ROUTE_CONTEXT,
    operation: 'GET_ALERT_STATS'
  };

  try {
    const [total, critical, high, medium, low, unread, read, resolved] = await Promise.all([
      AlertLog.countDocuments({ businessId: req.businessId }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'CRITICAL' }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'HIGH' }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'MEDIUM' }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'LOW' }),
      AlertLog.countDocuments({ businessId: req.businessId, status: 'UNREAD' }),
      AlertLog.countDocuments({ businessId: req.businessId, status: 'READ' }),
      AlertLog.countDocuments({ businessId: req.businessId, status: 'RESOLVED' })
    ]);

    const processingTime = Date.now() - startTime;
    logger.info('Alert statistics retrieved', { ...businessContext, total, processingTime });

    res.success({
      stats: {
        total,
        bySeverity: { critical, high, medium, low },
        byStatus: { unread, read, resolved }
      }
    }, SUCCESS_MESSAGES.STATS_RETRIEVED);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error getting alert stats', {
      ...businessContext,
      error: error.message,
      stack: error.stack,
      processingTime
    });
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.GET_STATS,
      error: error.message
    });
  }
});

// GET /:id - Get alert by ID
router.get('/:id', async (req, res) => {
  const startTime = Date.now();
  const businessContext = {
    businessId: req.businessId?.toString(),
    context: ROUTE_CONTEXT,
    operation: 'GET_ALERT_BY_ID',
    alertId: req.params.id
  };

  try {
    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      const processingTime = Date.now() - startTime;
      logger.warn('Alert not found', { ...businessContext, processingTime });
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.ALERT_NOT_FOUND
      });
    }

    const processingTime = Date.now() - startTime;
    logger.info('Alert retrieved by ID', { ...businessContext, processingTime });

    res.success({ alert }, SUCCESS_MESSAGES.ALERT_RETRIEVED);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error getting alert', {
      ...businessContext,
      error: error.message,
      stack: error.stack,
      processingTime
    });
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.GET_ALERT,
      error: error.message
    });
  }
});

// PUT /:id - Update alert (consolidated: acknowledge, resolve, action, status)
// Consolidates: PUT /:id/acknowledge, PUT /:id/resolve, PUT /:id/action, PUT /:id/status
router.put('/:id', async (req, res) => {
  const startTime = Date.now();
  const businessContext = {
    businessId: req.businessId?.toString(),
    context: ROUTE_CONTEXT,
    operation: 'UPDATE_ALERT',
    alertId: req.params.id
  };

  try {
    const { 
      action, 
      status, 
      notes, 
      resolution 
    } = req.body;

    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      const processingTime = Date.now() - startTime;
      logger.warn('Alert not found for update', { ...businessContext, processingTime });
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.ALERT_NOT_FOUND
      });
    }

    let message = SUCCESS_MESSAGES.ALERT_UPDATED;

    if (status) {
      if (!VALID_ALERT_STATUSES.includes(status)) {
        const processingTime = Date.now() - startTime;
        logger.warn('Invalid alert status', { ...businessContext, status, processingTime });
        return res.status(400).json({
          success: false,
          message: `${ERROR_MESSAGES.INVALID_STATUS}. Must be one of: ${VALID_ALERT_STATUSES.join(', ')}`
        });
      }

      alert.status = status;
      alert.statusUpdatedAt = new Date();
      message = SUCCESS_MESSAGES.STATUS_UPDATED;

      if (status === 'ACKNOWLEDGED') {
        alert.acknowledgedBy = req.user._id;
        alert.acknowledgedAt = new Date();
        if (notes) alert.notes = notes;
        message = SUCCESS_MESSAGES.ACKNOWLEDGED;
      } else if (status === 'RESOLVED') {
        alert.resolvedBy = req.user._id;
        alert.resolvedAt = new Date();
        if (resolution) alert.resolution = resolution;
        message = SUCCESS_MESSAGES.RESOLVED;
      }
    }

    if (action) {
      if (!alert.actions) alert.actions = [];
      alert.actions.push({
        action,
        actionBy: req.user._id,
        actionAt: new Date()
      });
      message = SUCCESS_MESSAGES.ACTION_RECORDED;
    }

    if (notes && !status) {
      alert.notes = notes;
    }

    await alert.save();

    const processingTime = Date.now() - startTime;
    logger.info('Alert updated', { ...businessContext, status, action: !!action, processingTime });

    res.success({
      message,
      alert
    }, message);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error updating alert', {
      ...businessContext,
      error: error.message,
      stack: error.stack,
      processingTime
    });
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.UPDATE_ALERT,
      error: error.message
    });
  }
});

// PUT /bulk/mark-read - Mark multiple alerts as read
router.put('/bulk/mark-read', async (req, res) => {
  const startTime = Date.now();
  const businessContext = {
    businessId: req.businessId?.toString(),
    context: ROUTE_CONTEXT,
    operation: 'BULK_MARK_READ'
  };

  try {
    const { alertIds } = req.body;

    if (!alertIds || !Array.isArray(alertIds)) {
      const processingTime = Date.now() - startTime;
      logger.warn('Invalid alertIds for bulk mark read', { ...businessContext, processingTime });
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_ALERT_IDS
      });
    }

    const result = await AlertLog.updateMany(
      {
        _id: { $in: alertIds },
        businessId: req.businessId
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    const processingTime = Date.now() - startTime;
    logger.info('Alerts marked as read', { ...businessContext, count: result.modifiedCount, processingTime });

    res.success({
      message: `${result.modifiedCount} ${SUCCESS_MESSAGES.MARKED_READ}`,
      modified: result.modifiedCount
    }, `${result.modifiedCount} ${SUCCESS_MESSAGES.MARKED_READ}`);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error marking alerts as read', {
      ...businessContext,
      error: error.message,
      stack: error.stack,
      processingTime
    });
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.MARK_READ,
      error: error.message
    });
  }
});

// POST /test - Create test alert (development/testing only)
router.post('/test', async (req, res) => {
  const startTime = Date.now();
  const businessContext = {
    businessId: req.businessId?.toString(),
    context: ROUTE_CONTEXT,
    operation: 'CREATE_TEST_ALERT'
  };

  try {
    if (process.env.NODE_ENV === 'production') {
      const processingTime = Date.now() - startTime;
      logger.warn('Test alert creation blocked in production', { ...businessContext, processingTime });
      return res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.TEST_NOT_ALLOWED
      });
    }

    const { severity = 'HIGH', type = 'TEST', message = 'Test alert' } = req.body;

    const testAlert = new AlertLog({
      businessId: req.businessId,
      severity,
      type,
      message,
      status: 'UNRESOLVED',
      metadata: {
        source: 'manual_test',
        createdBy: req.user._id
      }
    });

    await testAlert.save();

    const processingTime = Date.now() - startTime;
    logger.info('Test alert created', { ...businessContext, alertId: testAlert._id.toString(), processingTime });

    res.success({
      message: SUCCESS_MESSAGES.TEST_CREATED,
      alert: testAlert
    }, SUCCESS_MESSAGES.TEST_CREATED);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error creating test alert', {
      ...businessContext,
      error: error.message,
      stack: error.stack,
      processingTime
    });
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.CREATE_TEST,
      error: error.message
    });
  }
});

module.exports = router;
