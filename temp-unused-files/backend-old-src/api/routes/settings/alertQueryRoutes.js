/**
 * Alert Query Routes - Retrieve and filter alerts
 * @module routes/alerts/alertQueryRoutes
 */
 
const express = require('express');
const router = express.Router();
const { AlertLog } = require('../../../database/models');

// GET / - Get all alerts
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
    const [total, critical, high, medium, low, unresolved, resolved] = await Promise.all([
      AlertLog.countDocuments({ businessId: req.businessId }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'CRITICAL' }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'HIGH' }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'MEDIUM' }),
      AlertLog.countDocuments({ businessId: req.businessId, severity: 'LOW' }),
      AlertLog.countDocuments({ businessId: req.businessId, status: 'UNRESOLVED' }),
      AlertLog.countDocuments({ businessId: req.businessId, status: 'RESOLVED' })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        bySeverity: { critical, high, medium, low },
        byStatus: { unresolved, resolved }
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

// GET /unresolved - Get unresolved alerts
router.get('/unresolved', async (req, res) => {
  try {
    const alerts = await AlertLog.find({
      businessId: req.businessId,
      status: 'UNRESOLVED'
    }).sort({ severity: -1, createdAt: -1 });

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error getting unresolved alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unresolved alerts',
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

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error getting critical alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get critical alerts',
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

module.exports = router;
