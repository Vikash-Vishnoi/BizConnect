/**
 * ✅ FEATURE 27: STATUS/STORY UPDATES ROUTES
 * 
 * Handles WhatsApp Status updates (24-hour ephemeral posts)
 * Similar to Instagram Stories
 * 
 * Endpoints:
 * - POST /status - Create new status
 * - GET /status - Get all statuses (active and expired)
 * - GET /status/active - Get only active (non-expired) statuses
 * - GET /status/:id - Get specific status details
 * - DELETE /status/:id - Delete status before expiry
 * - GET /status/:id/views - Get status view analytics
 * - POST /status/:id/view - Record a status view
 * 
 * @version 1.0.0
 * @date November 2025
 */

const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const Status = require('../models/Status');
const WhatsAppService = require('../services/whatsappService');

/**
 * POST /api/status
 * Create a new status update
 * 
 * Body:
 * - type: 'text' | 'image' | 'video'
 * - content: string (text content or caption)
 * - mediaId: string (for image/video)
 * - mediaUrl: string (for image/video)
 * - backgroundColor: string (for text status)
 * - textColor: string (for text status)
 * - font: string (for text status)
 * - privacy: 'all' | 'contacts' | 'selected'
 * - allowedViewers: array of phone numbers
 * - blockedViewers: array of phone numbers
 */
router.post('/', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const {
      type,
      content,
      mediaId,
      mediaUrl,
      mediaType,
      backgroundColor,
      textColor,
      font,
      privacy,
      allowedViewers,
      blockedViewers
    } = req.body;

    // Validation
    if (!type || !['text', 'image', 'video'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status type required (text, image, or video)'
      });
    }

    if (type === 'text' && !content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required for text status'
      });
    }

    if ((type === 'image' || type === 'video') && !mediaId) {
      return res.status(400).json({
        success: false,
        error: 'Media ID is required for image/video status'
      });
    }

    // Get business credentials and create WhatsApp service instance
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Send to WhatsApp (note: API has limitations)
    let whatsappResult;
    if (type === 'text') {
      whatsappResult = await whatsappService.sendTextStatus(content, {
        backgroundColor,
        textColor,
        font
      });
    } else {
      whatsappResult = await whatsappService.sendMediaStatus(
        type,
        mediaId,
        content
      );
    }

    // Create status in database
    const status = await Status.create({
      businessId: req.businessId,
      type,
      content,
      mediaId,
      mediaUrl,
      mediaType: type === 'text' ? undefined : type,
      backgroundColor: backgroundColor || '#128C7E',
      textColor: textColor || '#FFFFFF',
      font: font || 'default',
      privacy: privacy || 'all',
      allowedViewers: allowedViewers || [],
      blockedViewers: blockedViewers || [],
      whatsappStatus: whatsappResult.success ? 'sent' : 'failed',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    res.status(201).json({
      success: true,
      status: {
        _id: status._id,
        type: status.type,
        content: status.content,
        mediaUrl: status.mediaUrl,
        expiresAt: status.expiresAt,
        timeRemaining: status.timeRemaining,
        isViewable: status.isViewable,
        createdAt: status.createdAt
      },
      whatsappNote: whatsappResult.note
    });

  } catch (error) {
    console.error('❌ Create Status Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create status'
    });
  }
});

/**
 * GET /api/status
 * Get all statuses for current business
 * Query params:
 * - limit: number (default 20)
 * - skip: number (default 0)
 * - includeExpired: boolean (default true)
 */
router.get('/', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { limit = 20, skip = 0, includeExpired = 'true' } = req.query;
    
    const query = { businessId: req.businessId };
    if (includeExpired === 'false') {
      query.isExpired = false;
    }

    const statuses = await Status.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Status.countDocuments(query);

    res.json({
      success: true,
      statuses: statuses.map(s => ({
        _id: s._id,
        type: s.type,
        content: s.content,
        mediaUrl: s.mediaUrl,
        backgroundColor: s.backgroundColor,
        textColor: s.textColor,
        totalViews: s.totalViews,
        uniqueViewers: s.uniqueViewers,
        isExpired: s.isExpired,
        expiresAt: s.expiresAt,
        timeRemaining: s.timeRemaining,
        isViewable: s.isViewable,
        createdAt: s.createdAt
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get Statuses Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get statuses'
    });
  }
});

/**
 * GET /api/status/active
 * Get only active (non-expired) statuses
 */
router.get('/active', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const statuses = await Status.getActiveStatuses(req.businessId);

    res.json({
      success: true,
      statuses: statuses.map(s => ({
        _id: s._id,
        type: s.type,
        content: s.content,
        mediaUrl: s.mediaUrl,
        backgroundColor: s.backgroundColor,
        textColor: s.textColor,
        totalViews: s.totalViews,
        uniqueViewers: s.uniqueViewers,
        expiresAt: s.expiresAt,
        timeRemaining: s.timeRemaining,
        createdAt: s.createdAt
      })),
      count: statuses.length
    });

  } catch (error) {
    console.error('❌ Get Active Statuses Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active statuses'
    });
  }
});

/**
 * GET /api/status/:id
 * Get specific status details
 */
router.get('/:id', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { id } = req.params;

    const status = await Status.findOne({
      _id: id,
      businessId: req.businessId
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Status not found'
      });
    }

    // Check and update expiry
    await status.checkExpiry();

    res.json({
      success: true,
      status: {
        _id: status._id,
        type: status.type,
        content: status.content,
        mediaUrl: status.mediaUrl,
        mediaType: status.mediaType,
        backgroundColor: status.backgroundColor,
        textColor: status.textColor,
        font: status.font,
        privacy: status.privacy,
        totalViews: status.totalViews,
        uniqueViewers: status.uniqueViewers,
        isExpired: status.isExpired,
        expiresAt: status.expiresAt,
        expiredAt: status.expiredAt,
        timeRemaining: status.timeRemaining,
        isViewable: status.isViewable,
        createdAt: status.createdAt,
        updatedAt: status.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Get Status Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status'
    });
  }
});

/**
 * DELETE /api/status/:id
 * Delete status before expiry
 */
router.delete('/:id', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { id } = req.params;

    const status = await Status.findOne({
      _id: id,
      businessId: req.businessId
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Status not found'
      });
    }

    // Mark as expired immediately
    status.isExpired = true;
    status.expiredAt = new Date();
    await status.save();

    // Get business credentials and create WhatsApp service instance
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Try to delete from WhatsApp (though API doesn't support it)
    if (status.whatsappMessageId) {
      await whatsappService.deleteStatus(status.whatsappMessageId);
    }

    res.json({
      success: true,
      message: 'Status marked as expired',
      note: 'WhatsApp does not support deleting status via API'
    });

  } catch (error) {
    console.error('❌ Delete Status Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete status'
    });
  }
});

/**
 * GET /api/status/:id/views
 * Get status view analytics
 */
router.get('/:id/views', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { id } = req.params;

    const status = await Status.findOne({
      _id: id,
      businessId: req.businessId
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Status not found'
      });
    }

    const viewers = status.getViewers();

    res.json({
      success: true,
      analytics: {
        totalViews: status.totalViews,
        uniqueViewers: status.uniqueViewers,
        viewers: viewers,
        viewRate: status.totalViews > 0 ? (status.uniqueViewers / status.totalViews * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('❌ Get Status Views Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status views'
    });
  }
});

/**
 * POST /api/status/:id/view
 * Record a status view (for tracking purposes)
 * 
 * Body:
 * - phoneNumber: string (viewer's phone)
 * - viewDuration: number (optional, in seconds)
 */
router.post('/:id/view', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { phoneNumber, viewDuration } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const status = await Status.findById(id);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Status not found'
      });
    }

    // Check if status is viewable
    if (!status.isViewable) {
      return res.status(400).json({
        success: false,
        error: 'Status has expired and cannot be viewed'
      });
    }

    // Check viewing permissions
    if (!status.canView(phoneNumber)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this status'
      });
    }

    // Add view
    const analytics = await status.addView(phoneNumber, viewDuration || 0);

    res.json({
      success: true,
      message: 'View recorded',
      analytics
    });

  } catch (error) {
    console.error('❌ Record View Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record view'
    });
  }
});

module.exports = router;
