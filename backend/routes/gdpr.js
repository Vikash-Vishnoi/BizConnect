const express = require('express');
const router = express.Router();
const DataExport = require('../models/DataExport');
const gdprService = require('../services/gdprService');
const { auth, requirePermission } = require('../middleware/auth');

/**
 * GDPR Routes
 * Endpoints for data export, deletion, and privacy management
 * 
 * Endpoints:
 * - POST /api/gdpr/export - Request data export
 * - POST /api/gdpr/delete - Request data deletion
 * - GET /api/gdpr/requests - Get user's GDPR requests
 * - GET /api/gdpr/requests/:id - Get specific request
 * - POST /api/gdpr/requests/:id/verify - Verify request with token
 * - POST /api/gdpr/requests/:id/cancel - Cancel pending request
 * - GET /api/gdpr/download/:id - Download export file
 * - GET /api/gdpr/stats - Get GDPR statistics (admin)
 */

// Request data export
router.post('/export', auth, async (req, res) => {
  try {
    const { dataTypes, format } = req.body;

    // Validate input
    if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please specify at least one data type to export'
      });
    }

    const validDataTypes = [
      'profile', 'conversations', 'messages', 'contacts',
      'templates', 'campaigns', 'analytics', 'automations',
      'media', 'settings', 'audit_logs', 'all'
    ];

    const invalidTypes = dataTypes.filter(type => !validDataTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid data types: ${invalidTypes.join(', ')}`
      });
    }

    const validFormats = ['JSON', 'CSV', 'PDF'];
    const exportFormat = format || 'JSON';
    if (!validFormats.includes(exportFormat)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Must be JSON, CSV, or PDF'
      });
    }

    // Check for existing pending requests
    const existingRequest = await DataExport.findOne({
      userId: req.user._id,
      requestType: 'EXPORT',
      status: { $in: ['PENDING', 'PROCESSING'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending export request',
        requestId: existingRequest._id
      });
    }

    // Create export request
    const request = await DataExport.createExportRequest(
      req.user._id,
      dataTypes,
      exportFormat,
      {
        userId: req.user._id,
        userEmail: req.user.email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    );

    // Process request asynchronously
    gdprService.processExportRequest(request._id.toString())
      .catch(err => console.error('Export processing error:', err));

    res.status(202).json({
      success: true,
      message: 'Export request created successfully. You will receive an email when it\'s ready.',
      request: {
        id: request._id,
        requestType: request.requestType,
        dataTypes: request.dataTypes,
        format: request.format,
        status: request.status,
        createdAt: request.createdAt
      }
    });
  } catch (error) {
    console.error('Export request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create export request'
    });
  }
});

// Request data deletion
router.post('/delete', auth, async (req, res) => {
  try {
    const { deleteDataTypes, deletionReason, confirmPassword } = req.body;

    // Validate input
    if (!deleteDataTypes || !Array.isArray(deleteDataTypes) || deleteDataTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please specify at least one data type to delete'
      });
    }

    const validDeleteTypes = [
      'conversations', 'messages', 'contacts', 'templates',
      'campaigns', 'analytics', 'automations', 'media', 'audit_logs', 'all'
    ];

    const invalidTypes = deleteDataTypes.filter(type => !validDeleteTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid data types: ${invalidTypes.join(', ')}`
      });
    }

    // Verify password for deletion
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const isPasswordValid = await user.comparePassword(confirmPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please confirm your password to proceed.'
      });
    }

    // Check for existing pending requests
    const existingRequest = await DataExport.findOne({
      userId: req.user._id,
      requestType: 'DELETE',
      status: { $in: ['PENDING', 'PROCESSING'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending deletion request',
        requestId: existingRequest._id
      });
    }

    // Create deletion request
    const request = await DataExport.createDeletionRequest(
      req.user._id,
      deleteDataTypes,
      deletionReason,
      {
        userId: req.user._id,
        userEmail: req.user.email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    );

    // Process request asynchronously
    gdprService.processDeletionRequest(request._id.toString())
      .catch(err => console.error('Deletion processing error:', err));

    res.status(202).json({
      success: true,
      message: 'Deletion request created successfully. Your data will be deleted within 30 days.',
      request: {
        id: request._id,
        requestType: request.requestType,
        deleteDataTypes: request.deleteDataTypes,
        status: request.status,
        createdAt: request.createdAt
      }
    });
  } catch (error) {
    console.error('Deletion request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create deletion request'
    });
  }
});

// Get user's GDPR requests
router.get('/requests', auth, async (req, res) => {
  try {
    const { requestType, status, page = 1, limit = 20 } = req.query;

    const query = { userId: req.user._id };
    if (requestType) query.requestType = requestType;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      DataExport.find(query)
        .select('-verificationToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DataExport.countDocuments(query)
    ]);

    res.json({
      success: true,
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests'
    });
  }
});

// Get specific request
router.get('/requests/:id', auth, async (req, res) => {
  try {
    const request = await DataExport.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).select('-verificationToken');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request'
    });
  }
});

// Verify request with token (for email verification)
router.post('/requests/:id/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const request = await DataExport.findOne({
      _id: req.params.id,
      verificationToken: token
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    if (request.verifiedAt) {
      return res.status(400).json({
        success: false,
        message: 'Request already verified'
      });
    }

    request.verifiedAt = new Date();
    request.consentGiven = true;
    await request.save();

    res.json({
      success: true,
      message: 'Request verified successfully'
    });
  } catch (error) {
    console.error('Verify request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify request'
    });
  }
});

// Cancel pending request
router.post('/requests/:id/cancel', auth, async (req, res) => {
  try {
    const request = await DataExport.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be cancelled'
      });
    }

    request.status = 'CANCELLED';
    request.completedAt = new Date();
    await request.save();

    res.json({
      success: true,
      message: 'Request cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel request'
    });
  }
});

// Download export file
router.get('/download/:id', auth, async (req, res) => {
  try {
    const request = await DataExport.findOne({
      _id: req.params.id,
      userId: req.user._id,
      requestType: 'EXPORT'
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Export not found'
      });
    }

    if (request.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Export is not ready yet',
        status: request.status
      });
    }

    if (request.isExpired) {
      return res.status(410).json({
        success: false,
        message: 'Export file has expired'
      });
    }

    if (!request.exportUrl) {
      return res.status(404).json({
        success: false,
        message: 'Export file not found'
      });
    }

    // Send file
    res.download(request.exportUrl, `gdpr_export_${request._id}.${request.format.toLowerCase()}`, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to download file'
          });
        }
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download export'
    });
  }
});

// Get GDPR statistics (admin only)
router.get('/stats', auth, requirePermission('VIEW_ANALYTICS'), async (req, res) => {
  try {
    const { userId } = req.query;

    const stats = await DataExport.getRequestStats(userId);

    // Transform stats into readable format
    const formattedStats = {
      total: 0,
      byType: { EXPORT: 0, DELETE: 0 },
      byStatus: { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0, CANCELLED: 0 },
      avgProcessingTime: 0
    };

    stats.forEach(stat => {
      const count = stat.count;
      formattedStats.total += count;
      formattedStats.byType[stat._id.requestType] = 
        (formattedStats.byType[stat._id.requestType] || 0) + count;
      formattedStats.byStatus[stat._id.status] = 
        (formattedStats.byStatus[stat._id.status] || 0) + count;
      
      if (stat.avgProcessingTime) {
        formattedStats.avgProcessingTime += stat.avgProcessingTime * count;
      }
    });

    if (formattedStats.total > 0) {
      formattedStats.avgProcessingTime = Math.round(formattedStats.avgProcessingTime / formattedStats.total);
    }

    res.json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;
