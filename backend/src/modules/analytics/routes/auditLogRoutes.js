const express = require('express');
const router = express.Router();
const auditExportService = require('../services/auditExportService');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');

// ============================================================================
// CONSTANTS
// ============================================================================

// Valid Export Formats
const VALID_FORMATS = ['csv', 'json', 'excel', 'pdf'];

// Default Values
const DEFAULT_FORMAT = 'csv';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

// Pagination Limits
const MIN_PAGE = 1;
const MIN_LIMIT = 1;

// Access Control
const ROLE_ADMIN = 'admin';

// Error Messages
const ERROR_INVALID_FORMAT = 'Invalid format. Supported formats: ';
const ERROR_EXPORT_FAILED = 'Failed to export audit logs';
const ERROR_STATS_FAILED = 'Failed to retrieve audit statistics';
const ERROR_FETCH_FAILED = 'Failed to retrieve audit logs';
const ERROR_FETCH_ACTIONS_FAILED = 'Failed to retrieve audit actions';
const ERROR_FETCH_RESOURCE_TYPES_FAILED = 'Failed to retrieve resource types';
const ERROR_ACCESS_DENIED = 'Access denied';

// Success Messages
const SUCCESS_EXPORT = 'Audit logs exported successfully';
const SUCCESS_STATS = 'Audit statistics retrieved successfully';
const SUCCESS_LOGS_RETRIEVED = 'Business audit logs retrieved successfully';
const SUCCESS_USER_LOGS_RETRIEVED = 'User audit logs retrieved successfully';
const SUCCESS_ACTIONS_RETRIEVED = 'Audit actions retrieved successfully';
const SUCCESS_RESOURCE_TYPES_RETRIEVED = 'Resource types retrieved successfully';

// Sort Order
const SORT_TIMESTAMP_DESC = { timestamp: -1 };

// Populate Fields
const POPULATE_USER_ID = 'email name';
const POPULATE_BUSINESS_ID = 'name';

// ============================================================================
// ROUTES
// ============================================================================

/**
 * @route   POST /api/analytics/audit-logs/export
 * @desc    Export audit logs with advanced filtering
 * @access  Private
 */
router.post('/audit-logs/export', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { filters = {}, format = DEFAULT_FORMAT } = req.body;

    // Validate format
    if (!VALID_FORMATS.includes(format.toLowerCase())) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: `${ERROR_INVALID_FORMAT}${VALID_FORMATS.join(', ')}`,
        processingTime: Date.now() - startTime
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

    const processingTime = Date.now() - startTime;
    logger.info(SUCCESS_EXPORT, {
      userId: req.user._id?.toString(),
      format,
      recordCount: result.recordCount,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id?.toString(),
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message || ERROR_EXPORT_FAILED,
      processingTime
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs
 * @desc    Get global audit logs (Platform wide with filters)
 * @access  Private
 */
router.get('/audit-logs', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, action, status, user, startDate, endDate } = req.query;

    const AuditLog = require('../../../core/database/models/AuditLog');

    const query = {};

    if (action) query.action = action;
    if (status) query.status = status;
    if (user) query.userId = user;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(query)
      .sort(SORT_TIMESTAMP_DESC)
      .skip((page - MIN_PAGE) * limit)
      .limit(parseInt(limit))
      .populate('userId', POPULATE_USER_ID)
      .populate('businessId', POPULATE_BUSINESS_ID)
      .lean();

    const total = await AuditLog.countDocuments(query);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      logs: auditLogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      totalPages: Math.ceil(total / limit),
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id?.toString(),
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message || ERROR_FETCH_FAILED,
      processingTime
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Private
 */
router.get('/audit-logs/stats', auth, async (req, res) => {
  const startTime = Date.now();
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

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
      message: SUCCESS_STATS,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id?.toString(),
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message || ERROR_STATS_FAILED,
      processingTime
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs/business/:businessId
 * @desc    Get audit logs for a specific business
 * @access  Private
 */
router.get('/audit-logs/business/:businessId', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { businessId } = req.params;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, action, status, startDate, endDate } = req.query;

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
      .sort(SORT_TIMESTAMP_DESC)
      .skip((page - MIN_PAGE) * limit)
      .limit(parseInt(limit))
      .populate('userId', POPULATE_USER_ID)
      .lean();

    const total = await AuditLog.countDocuments(query);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      },
      message: SUCCESS_LOGS_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.params.businessId,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message || ERROR_FETCH_FAILED,
      processingTime
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs/user/:userId
 * @desc    Get audit logs for a specific user
 * @access  Private
 */
router.get('/audit-logs/user/:userId', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { userId } = req.params;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, action, status, startDate, endDate } = req.query;

    // Users can only view their own audit logs unless they're admins
    if (req.user._id.toString() !== userId && req.user.role !== ROLE_ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_ACCESS_DENIED,
        processingTime: Date.now() - startTime
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
      .sort(SORT_TIMESTAMP_DESC)
      .skip((page - MIN_PAGE) * limit)
      .limit(parseInt(limit))
      .populate('businessId', POPULATE_BUSINESS_ID)
      .lean();

    const total = await AuditLog.countDocuments(query);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      },
      message: SUCCESS_USER_LOGS_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message || ERROR_FETCH_FAILED,
      processingTime
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs/actions
 * @desc    Get list of all available audit log actions
 * @access  Private
 */
router.get('/audit-logs/actions', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const AuditLog = require('../../../core/database/models/AuditLog');

    const actions = await AuditLog.distinct('action');

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        actions: actions.sort(),
        count: actions.length
      },
      message: SUCCESS_ACTIONS_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id?.toString(),
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message || ERROR_FETCH_ACTIONS_FAILED,
      processingTime
    });
  }
});

/**
 * @route   GET /api/analytics/audit-logs/resource-types
 * @desc    Get list of all available resource types
 * @access  Private
 */
router.get('/audit-logs/resource-types', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const AuditLog = require('../../../core/database/models/AuditLog');

    const resourceTypes = await AuditLog.distinct('resourceType');

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        resourceTypes: resourceTypes.sort(),
        count: resourceTypes.length
      },
      message: SUCCESS_RESOURCE_TYPES_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id?.toString(),
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message || ERROR_FETCH_RESOURCE_TYPES_FAILED,
      processingTime
    });
  }
});

module.exports = router;
