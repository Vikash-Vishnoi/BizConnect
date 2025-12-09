const express = require('express');
const router = express.Router();
const auditExportService = require('../services/auditExportService');
const { auth } = require('../../../core/middlewares/auth');
const { enforceBusinessIsolation } = require('../../../core/middlewares/businessSecurity');
const logger = require('../../../common/helpers/logger');

/**
 * @route   POST /api/analytics/audit-logs/export
 * @desc    Export audit logs with advanced filtering
 * @access  Private
 */
router.post('/audit-logs/export', auth, async (req, res) => {
  try {
    const { filters = {}, format = 'csv' } = req.body;

    // Validate format
    const validFormats = ['csv', 'json', 'excel', 'pdf'];
    if (!validFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid format. Supported formats: ${validFormats.join(', ')}`
      });
    }

    const result = await auditExportService.exportAuditLogs(filters, format);

    // Set appropriate headers
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    // Send the data
    if (Buffer.isBuffer(result.data)) {
      res.send(result.data);
    } else {
      res.send(result.data);
    }

    logger.info('Audit logs exported successfully', {
      userId: req.user._id,
      format,
      recordCount: result.recordCount
    });
  } catch (error) {
    logger.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export audit logs'
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Private
 */
router.get('/audit-logs/stats', auth, async (req, res) => {
  try {
    const filters = {
      businessId: req.query.businessId,
      userId: req.query.userId,
      action: req.query.action,
      resourceType: req.query.resourceType,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const stats = await auditExportService.getAuditStats(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting audit stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve audit statistics'
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs/business/:businessId
 * @desc    Get audit logs for a specific business
 * @access  Private
 */
router.get('/audit-logs/business/:businessId', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 50, action, status, startDate, endDate } = req.query;

    const AuditLog = require('../../../core/database/models/AuditLog');

    const query = { businessId };

    if (action) query.action = action;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', 'email name')
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching business audit logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve audit logs'
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs/user/:userId
 * @desc    Get audit logs for a specific user
 * @access  Private
 */
router.get('/audit-logs/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, action, status, startDate, endDate } = req.query;

    // Users can only view their own audit logs unless they're admins
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const AuditLog = require('../../../core/database/models/AuditLog');

    const query = { userId };

    if (action) query.action = action;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('businessId', 'name')
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user audit logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve audit logs'
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs/actions
 * @desc    Get list of all available audit log actions
 * @access  Private
 */
router.get('/audit-logs/actions', auth, async (req, res) => {
  try {
    const AuditLog = require('../../../core/database/models/AuditLog');

    const actions = await AuditLog.distinct('action');

    res.json({
      success: true,
      data: {
        actions: actions.sort(),
        count: actions.length
      }
    });
  } catch (error) {
    logger.error('Error fetching audit actions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve audit actions'
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs/resource-types
 * @desc    Get list of all available resource types
 * @access  Private
 */
router.get('/audit-logs/resource-types', auth, async (req, res) => {
  try {
    const AuditLog = require('../../../core/database/models/AuditLog');

    const resourceTypes = await AuditLog.distinct('resourceType');

    res.json({
      success: true,
      data: {
        resourceTypes: resourceTypes.sort(),
        count: resourceTypes.length
      }
    });
  } catch (error) {
    logger.error('Error fetching resource types:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve resource types'
    });
  }
});

module.exports = router;
