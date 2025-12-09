/**
 * Consolidated Alerts Routes
 * Reduced from 10 routes to 6 routes
 * @module routes/alerts/alertsRoutes
 */
 
const express = require('express');
const router = express.Router();
const { AlertLog } = require('../../../core/database/models');

// GET / - Get all alerts with filtering
// Consolidates: /, /unresolved, /critical
router.get('/', async (req, res) => {
  try {
    const defaultLimit = parseInt(process.env.ALERTS_DEFAULT_LIMIT) || 50;
    const maxLimit = parseInt(process.env.ALERTS_MAX_LIMIT) || 100;
    const { severity, status, type, limit = defaultLimit, page = 1 } = req.query;

    const requestedLimit = parseInt(limit);
    const finalLimit = Math.min(requestedLimit, maxLimit);

    const query = { businessId: req.businessId };
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (type) query.type = type;

    const alerts = await AlertLog.find(query)
      .sort({ createdAt: -1 })
      .limit(finalLimit)
      .skip((parseInt(page) - 1) * finalLimit);

    const total = await AlertLog.countDocuments(query);

    res.json({
      success: true,
      count: alerts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / finalLimit),
      alerts
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get alerts',
      error: error.message
    });
  }
});

// GET /stats - Get alert statistics
router.get('/stats', async (req, res) => {
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

    res.json({
      success: true,
      stats: {
        total,
        bySeverity: { critical, high, medium, low },
        byStatus: { unread, read, resolved }
      }
    });
  } catch (error) {
    console.error('Error getting alert stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get alert stats',
      error: error.message
    });
  }
});

// GET /:id - Get alert by ID
router.get('/:id', async (req, res) => {
  try {
    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      alert
    });
  } catch (error) {
    console.error('Error getting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get alert',
      error: error.message
    });
  }
});

// PUT /:id - Update alert (consolidated: acknowledge, resolve, action, status)
// Consolidates: PUT /:id/acknowledge, PUT /:id/resolve, PUT /:id/action, PUT /:id/status
router.put('/:id', async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    let message = 'Alert updated successfully';

    if (status) {
      const validStatuses = ['UNRESOLVED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      alert.status = status;
      alert.statusUpdatedAt = new Date();
      message = 'Alert status updated successfully';

      if (status === 'ACKNOWLEDGED') {
        alert.acknowledgedBy = req.user._id;
        alert.acknowledgedAt = new Date();
        if (notes) alert.notes = notes;
        message = 'Alert acknowledged successfully';
      } else if (status === 'RESOLVED') {
        alert.resolvedBy = req.user._id;
        alert.resolvedAt = new Date();
        if (resolution) alert.resolution = resolution;
        message = 'Alert resolved successfully';
      }
    }

    if (action) {
      if (!alert.actions) alert.actions = [];
      alert.actions.push({
        action,
        actionBy: req.user._id,
        actionAt: new Date()
      });
      message = 'Action recorded successfully';
    }

    if (notes && !status) {
      alert.notes = notes;
    }

    await alert.save();

    res.json({
      success: true,
      message,
      alert
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message
    });
  }
});

// PUT /bulk/mark-read - Mark multiple alerts as read
router.put('/bulk/mark-read', async (req, res) => {
  try {
    const { alertIds } = req.body;

    if (!alertIds || !Array.isArray(alertIds)) {
      return res.status(400).json({
        success: false,
        message: 'alertIds array is required'
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

    res.json({
      success: true,
      message: `${result.modifiedCount} alerts marked as read`,
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking alerts as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark alerts as read',
      error: error.message
    });
  }
});

// POST /test - Create test alert (development/testing only)
router.post('/test', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test alerts are not allowed in production'
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

    res.json({
      success: true,
      message: 'Test alert created successfully',
      alert: testAlert
    });
  } catch (error) {
    console.error('Error creating test alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test alert',
      error: error.message
    });
  }
});

module.exports = router;
