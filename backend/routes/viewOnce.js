/**
 * ✅ FEATURE 26: VIEW ONCE MEDIA ROUTES
 * 
 * Handles sending media that disappears after viewing once
 * WhatsApp Cloud API Feature: View Once Media (Ephemeral Media)
 * 
 * Endpoints:
 * - POST /view-once/send - Send view-once image or video
 * - GET /view-once/supported-types - Get list of supported media types
 * 
 * @version 1.0.0
 * @date November 2025
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
const Conversation = require('../models/Conversation');
const ViewOnceMedia = require('../models/ViewOnceMedia');

/**
 * POST /api/view-once/send
 * Send view-once media (image or video) to a contact
 * 
 * Body:
 * - phoneNumber: string (recipient phone number)
 * - mediaType: 'image' | 'video'
 * - mediaId: string (WhatsApp media ID)
 * - caption: string (optional)
 */
router.post('/send', auth, async (req, res) => {
  try {
    const { phoneNumber, mediaType, mediaId, caption } = req.body;

    // Validation
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return res.status(400).json({
        success: false,
        error: 'Media type must be "image" or "video"'
      });
    }

    if (!mediaId) {
      return res.status(400).json({
        success: false,
        error: 'Media ID is required'
      });
    }

    // Validate caption length (WhatsApp limit: 1024 characters)
    if (caption && caption.length > 1024) {
      return res.status(400).json({
        success: false,
        error: 'Caption must be 1024 characters or less'
      });
    }

    // Send view-once media via WhatsApp
    const result = await whatsappService.sendViewOnceMedia(
      phoneNumber,
      mediaType,
      mediaId,
      caption
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send view-once media'
      });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      userId: req.userId,
      phoneNumber: phoneNumber
    });

    if (!conversation) {
      conversation = await Conversation.create({
        userId: req.userId,
        phoneNumber: phoneNumber,
        contactName: phoneNumber,
        lastMessage: `📸 View-once ${mediaType}`,
        lastMessageTime: new Date(),
        status: 'active'
      });
    } else {
      // Update conversation
      conversation.lastMessage = `📸 View-once ${mediaType}`;
      conversation.lastMessageTime = new Date();
      await conversation.save();
    }

    // Save to database
    const viewOnceMedia = await ViewOnceMedia.create({
      userId: req.userId,
      phoneNumber: phoneNumber,
      conversationId: conversation._id,
      mediaType: mediaType,
      mediaId: mediaId,
      caption: caption || '',
      whatsappMessageId: result.messageId,
      whatsappStatus: 'sent',
      sentAt: new Date()
    });

    res.json({
      success: true,
      messageId: result.messageId,
      viewOnceMediaId: viewOnceMedia._id,
      conversationId: conversation._id,
      mediaType: mediaType,
      viewOnce: true,
      sentAt: new Date()
    });

  } catch (error) {
    console.error('❌ Send View-Once Media Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send view-once media'
    });
  }
});

/**
 * GET /api/view-once/supported-types
 * Get list of media types that support view-once feature
 */
router.get('/supported-types', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      supportedTypes: ['image', 'video'],
      description: 'Media types that can be sent as view-once messages',
      limitations: {
        maxCaptionLength: 1024,
        viewCount: 1,
        expiryBehavior: 'Disappears after viewing once'
      }
    });
  } catch (error) {
    console.error('❌ Get Supported Types Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get supported types'
    });
  }
});

/**
 * GET /api/view-once/history
 * Get view-once media history for current user
 * Query params:
 * - limit: number (default 20)
 * - skip: number (default 0)
 * - phoneNumber: string (optional filter)
 */
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 20, skip = 0, phoneNumber } = req.query;
    
    const query = { userId: req.userId };
    if (phoneNumber) {
      query.phoneNumber = phoneNumber;
    }

    const viewOnceMedia = await ViewOnceMedia.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('conversationId', 'contactName phoneNumber');

    const total = await ViewOnceMedia.countDocuments(query);

    res.json({
      success: true,
      viewOnceMedia: viewOnceMedia.map(m => ({
        _id: m._id,
        phoneNumber: m.phoneNumber,
        mediaType: m.mediaType,
        caption: m.caption,
        isViewed: m.isViewed,
        viewedAt: m.viewedAt,
        whatsappStatus: m.whatsappStatus,
        sentAt: m.sentAt,
        deliveredAt: m.deliveredAt,
        readAt: m.readAt
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get View-Once History Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get history'
    });
  }
});

/**
 * GET /api/view-once/stats
 * Get view-once media statistics
 * Query params:
 * - days: number (default 30)
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const stats = await ViewOnceMedia.getUserStats(req.userId, parseInt(days));

    res.json({
      success: true,
      stats: {
        ...stats,
        period: `Last ${days} days`
      }
    });

  } catch (error) {
    console.error('❌ Get View-Once Stats Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stats'
    });
  }
});

/**
 * PATCH /api/view-once/:id/status
 * Update view-once media status (for webhook processing)
 * 
 * Body:
 * - status: 'sent' | 'delivered' | 'read' | 'failed'
 */
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['sent', 'delivered', 'read', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status required (sent, delivered, read, failed)'
      });
    }

    const viewOnceMedia = await ViewOnceMedia.findOne({
      _id: id,
      userId: req.userId
    });

    if (!viewOnceMedia) {
      return res.status(404).json({
        success: false,
        error: 'View-once media not found'
      });
    }

    await viewOnceMedia.updateStatus(status);

    res.json({
      success: true,
      message: 'Status updated',
      status: viewOnceMedia.whatsappStatus,
      isViewed: viewOnceMedia.isViewed
    });

  } catch (error) {
    console.error('❌ Update View-Once Status Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update status'
    });
  }
});

/**
 * DELETE /api/view-once/:id
 * Delete view-once media record
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await ViewOnceMedia.deleteOne({
      _id: id,
      userId: req.userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'View-once media not found'
      });
    }

    res.json({
      success: true,
      message: 'View-once media record deleted'
    });

  } catch (error) {
    console.error('❌ Delete View-Once Media Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete record'
    });
  }
});

module.exports = router;
