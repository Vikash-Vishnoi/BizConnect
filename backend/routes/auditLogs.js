/**
 * ✅ FEATURE 36: Audit Logs Routes
 * REST API for querying and analyzing audit logs
 */

const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { auth, requirePermission, requireBusiness } = require('../middleware/auth');

// Helper middleware for checking audit permissions
const checkPermission = (permission) => requirePermission(permission);

/**
 * @route   GET /api/audit-logs
 * @desc    Get filtered audit logs with pagination
 * @access  Private (VIEW_AUDIT_LOGS permission)
 */
router.get('/', auth, requireBusiness, checkPermission('VIEW_AUDIT_LOGS'), async (req, res) => {
  try {
    const {
      userId,
      action,
      resourceType,
      status,
      startDate,
      endDate,
      ipAddress,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filters
    const filters = { businessId: req.businessId };
    
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resourceType) filters.resourceType = resourceType;
    if (status) filters.status = status;
    if (ipAddress) filters.ipAddress = ipAddress;
    if (search) filters.searchTerm = search;
    
    if (startDate || endDate) {
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
    }

    // Build options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    // Get logs
    const result = await AuditLog.getFilteredLogs(filters, options);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('❌ Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Private (VIEW_AUDIT_LOGS permission)
 */
router.get('/stats', auth, requireBusiness, checkPermission('VIEW_AUDIT_LOGS'), async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await AuditLog.getStatistics(req.businessId, userId || null, start, end);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Get audit stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit statistics',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit-logs/user/:userId
 * @desc    Get audit log timeline for a specific user
 * @access  Private (VIEW_AUDIT_LOGS permission)
 */
router.get('/user/:userId', auth, requireBusiness, checkPermission('VIEW_AUDIT_LOGS'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const timeline = await AuditLog.getUserTimeline(req.businessId, userId, parseInt(days));

    res.json({
      success: true,
      data: timeline
    });

  } catch (error) {
    console.error('❌ Get user timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user timeline',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit-logs/sensitive
 * @desc    Get sensitive operations logs
 * @access  Private (VIEW_AUDIT_LOGS permission)
 */
router.get('/sensitive', auth, requireBusiness, checkPermission('VIEW_AUDIT_LOGS'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const operations = await AuditLog.getSensitiveOperations(req.businessId, start, end);

    res.json({
      success: true,
      data: operations,
      count: operations.length
    });

  } catch (error) {
    console.error('❌ Get sensitive operations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensitive operations',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit-logs/actions
 * @desc    Get list of all available actions
 * @access  Private (VIEW_AUDIT_LOGS permission)
 */
router.get('/actions', auth, requireBusiness, checkPermission('VIEW_AUDIT_LOGS'), async (req, res) => {
  try {
    const actions = [
      // Authentication
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
      
      // User Management
      'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ROLE_CHANGE',
      
      // Message Operations
      'MESSAGE_SEND', 'MESSAGE_DELETE', 'MESSAGE_FORWARD', 'MESSAGE_REPLY', 'MESSAGE_REACT',
      
      // Template Operations
      'TEMPLATE_CREATE', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE', 'TEMPLATE_SUBMIT', 
      'TEMPLATE_APPROVE', 'TEMPLATE_REJECT',
      
      // Campaign Operations
      'CAMPAIGN_CREATE', 'CAMPAIGN_UPDATE', 'CAMPAIGN_DELETE', 'CAMPAIGN_START', 
      'CAMPAIGN_PAUSE', 'CAMPAIGN_STOP', 'CAMPAIGN_DUPLICATE',
      
      // RBAC
      'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE',
      'PERMISSION_GRANT', 'PERMISSION_REVOKE',
      
      // Automation
      'AUTOMATION_CREATE', 'AUTOMATION_UPDATE', 'AUTOMATION_DELETE',
      'AUTOMATION_ENABLE', 'AUTOMATION_DISABLE',
      
      // Settings
      'SETTINGS_UPDATE', 'WEBHOOK_CONFIG', 'API_KEY_CREATE', 'API_KEY_REVOKE',
      
      // Flows
      'FLOW_CREATE', 'FLOW_UPDATE', 'FLOW_DELETE', 'FLOW_PUBLISH', 'FLOW_SEND',
      
      // Channels
      'CHANNEL_CREATE', 'CHANNEL_UPDATE', 'CHANNEL_DELETE', 'CHANNEL_BROADCAST',
      
      // Data Operations
      'DATA_EXPORT', 'DATA_DELETE', 'DATA_IMPORT'
    ];

    res.json({
      success: true,
      data: actions
    });

  } catch (error) {
    console.error('❌ Get actions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch actions',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit-logs/resource-types
 * @desc    Get list of all resource types
 * @access  Private (VIEW_AUDIT_LOGS permission)
 */
router.get('/resource-types', auth, requireBusiness, checkPermission('VIEW_AUDIT_LOGS'), async (req, res) => {
  try {
    const resourceTypes = [
      'USER', 'MESSAGE', 'TEMPLATE', 'CAMPAIGN', 'CONVERSATION',
      'ROLE', 'PERMISSION', 'AUTOMATION', 'SETTINGS', 'GROUP',
      'FLOW', 'CHANNEL', 'CONTACT', 'MEDIA', 'WEBHOOK', 'SYSTEM'
    ];

    res.json({
      success: true,
      data: resourceTypes
    });

  } catch (error) {
    console.error('❌ Get resource types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resource types',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/audit-logs/export
 * @desc    Export audit logs to CSV
 * @access  Private (VIEW_AUDIT_LOGS permission)
 */
router.post('/export', auth, requireBusiness, checkPermission('VIEW_AUDIT_LOGS'), async (req, res) => {
  try {
    const {
      userId,
      action,
      resourceType,
      status,
      startDate,
      endDate
    } = req.body;

    // Build filters
    const filters = { businessId: req.businessId };
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resourceType) filters.resourceType = resourceType;
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    // Get all logs (no pagination)
    const result = await AuditLog.getFilteredLogs(filters, { 
      page: 1, 
      limit: 10000 
    });

    // Convert to CSV
    const csv = convertToCSV(result.logs);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('❌ Export audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs',
      message: error.message
    });
  }
});

/**
 * Helper function to convert logs to CSV format
 */
function convertToCSV(logs) {
  if (!logs || logs.length === 0) {
    return 'No data to export';
  }

  const headers = [
    'Date',
    'User',
    'Action',
    'Resource Type',
    'Resource Name',
    'Status',
    'IP Address',
    'Description'
  ];

  const rows = logs.map(log => [
    new Date(log.createdAt).toLocaleString(),
    log.userName || 'System',
    log.action,
    log.resourceType,
    log.resourceName || '-',
    log.status,
    log.ipAddress || '-',
    log.description
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

module.exports = router;

