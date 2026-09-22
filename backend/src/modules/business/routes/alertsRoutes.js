/**
 * Consolidated Alerts Routes
 * Handles system alerts querying, statistics, acknowledgment, resolution, and updates.
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
const VALID_ALERT_STATUSES = ['UNREAD', 'READ', 'UNRESOLVED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'IGNORED'];
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

// ==================================================
// SPECIFIC GET ROUTES (Must be defined BEFORE /:id)
// ==================================================

// GET / - Get all alerts with filtering
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const businessContext = {
    businessId: req.businessId?.toString(),
    context: ROUTE_CONTEXT,
    operation: 'GET_ALERTS'
  };

  try {
    const { severity, status, type, alertType, limit = ALERTS_DEFAULT_LIMIT, page = DEFAULT_PAGE } = req.query;

    const requestedLimit = parseInt(limit) || ALERTS_DEFAULT_LIMIT;
    const finalLimit = Math.min(requestedLimit, ALERTS_MAX_LIMIT);
    const pageNum = parseInt(page) || DEFAULT_PAGE;

    const query = { businessId: req.businessId };
    
    if (severity) {
      query.severity = severity.toUpperCase();
    }
    
    if (status) {
      const upperStatus = status.toUpperCase();
      if (upperStatus === 'UNRESOLVED') {
        query.status = { $nin: ['RESOLVED', 'DISMISSED', 'IGNORED'] };
      } else {
        query.status = upperStatus;
      }
    }
    
    const targetType = alertType || type;
    if (targetType) {
      query.alertType = targetType;
    }

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
      pages: Math.ceil(total / finalLimit) || 1,
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
    const [total, critical, high, medium, low, unread, read, unresolved, resolved] = await Promise.all([
      AlertLog.countDocuments({ businessId: req.businessId }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'CRITICAL' }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'HIGH' }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'MEDIUM' }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'LOW' }),
      AlertLog.countDocuments({ businessId: req.businessId, status: 'UNREAD' }),
      AlertLog.countDocuments({ businessId: req.businessId, status: 'READ' }),
      AlertLog.countDocuments({ businessId: req.businessId, status: { $nin: ['RESOLVED', 'DISMISSED', 'IGNORED'] } }),
      AlertLog.countDocuments({ businessId: req.businessId, status: 'RESOLVED' })
    ]);

    const processingTime = Date.now() - startTime;
    logger.info('Alert statistics retrieved', { ...businessContext, total, processingTime });

    res.success({
      stats: {
        total,
        unresolved,
        resolved,
        CRITICAL: critical,
        HIGH: high,
        MEDIUM: medium,
        LOW: low,
        bySeverity: { critical, high, medium, low, CRITICAL: critical, HIGH: high, MEDIUM: medium, LOW: low },
        byStatus: { unread, read, unresolved, resolved }
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

// GET /unresolved - Get unresolved alerts
router.get('/unresolved', async (req, res) => {
  try {
    const alerts = await AlertLog.find({
      businessId: req.businessId,
      status: { $nin: ['RESOLVED', 'DISMISSED', 'IGNORED'] }
    }).sort({ createdAt: -1 });

    res.success({ count: alerts.length, alerts }, SUCCESS_MESSAGES.ALERTS_RETRIEVED);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.GET_ALERTS,
      error: error.message
    });
  }
});

// GET /critical - Get critical alerts
router.get('/critical', async (req, res) => {
  try {
    const alerts = await AlertLog.find({
      businessId: req.businessId,
      severity: 'CRITICAL'
    }).sort({ createdAt: -1 });

    res.success({ count: alerts.length, alerts }, SUCCESS_MESSAGES.ALERTS_RETRIEVED);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.GET_ALERTS,
      error: error.message
    });
  }
});

// ==================================================
// SPECIFIC PUT & POST ROUTES (Must be defined BEFORE /:id)
// ==================================================

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
          status: 'READ',
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

    const { severity = 'HIGH', type = 'ACCOUNT_WARNING', alertType, message = 'Test alert', title = 'Test Alert' } = req.body;

    const testAlert = new AlertLog({
      userId: req.user?._id,
      businessId: req.businessId,
      severity: severity.toUpperCase(),
      alertType: alertType || type || 'ACCOUNT_WARNING',
      title,
      message,
      status: 'UNREAD',
      whatsappData: {
        event: 'manual_test'
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

// Helper for alert updates
async function handleAlertUpdate(req, res, targetStatus, bodyData = {}) {
  const startTime = Date.now();
  const alertId = req.params.id;
  const businessContext = {
    businessId: req.businessId?.toString(),
    context: ROUTE_CONTEXT,
    operation: 'UPDATE_ALERT',
    alertId
  };

  try {
    const alert = await AlertLog.findOne({
      _id: alertId,
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

    const { action, status, notes, resolution, reason } = { ...req.body, ...bodyData };
    let finalStatus = targetStatus || status;

    if (finalStatus) {
      const upperStatus = finalStatus.toUpperCase();
      if (!VALID_ALERT_STATUSES.includes(upperStatus)) {
        const processingTime = Date.now() - startTime;
        logger.warn('Invalid alert status', { ...businessContext, status: upperStatus, processingTime });
        return res.status(400).json({
          success: false,
          message: `${ERROR_MESSAGES.INVALID_STATUS}. Must be one of: ${VALID_ALERT_STATUSES.join(', ')}`
        });
      }

      alert.status = upperStatus;
      if (upperStatus === 'ACKNOWLEDGED') {
        alert.resolvedBy = req.user?._id;
        if (notes || reason) alert.notes = notes || reason;
      } else if (upperStatus === 'RESOLVED') {
        alert.resolvedBy = req.user?._id;
        alert.resolvedAt = new Date();
        if (notes || resolution || reason) alert.notes = notes || resolution || reason;
      }
    }

    if (action) {
      if (!alert.actions) alert.actions = [];
      alert.actions.push({
        action,
        actionBy: req.user?._id,
        actionAt: new Date()
      });
    }

    if ((notes || reason) && !finalStatus) {
      alert.notes = notes || reason;
    }

    await alert.save();

    const processingTime = Date.now() - startTime;
    logger.info('Alert updated', { ...businessContext, status: alert.status, processingTime });

    res.success({
      message: SUCCESS_MESSAGES.ALERT_UPDATED,
      alert
    }, SUCCESS_MESSAGES.ALERT_UPDATED);
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
}

// Subroutes for actions (Must be defined BEFORE /:id)
router.put('/:id/acknowledge', (req, res) => handleAlertUpdate(req, res, 'ACKNOWLEDGED'));
router.put('/:id/resolve', (req, res) => handleAlertUpdate(req, res, 'RESOLVED'));
router.put('/:id/action', (req, res) => handleAlertUpdate(req, res, null));
router.put('/:id/status', (req, res) => handleAlertUpdate(req, res, req.body?.status));

// ==================================================
// PARAMETERIZED ROUTES (Must be defined LAST)
// ==================================================

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

// PUT /:id - Update alert
router.put('/:id', (req, res) => handleAlertUpdate(req, res, null));

module.exports = router;
