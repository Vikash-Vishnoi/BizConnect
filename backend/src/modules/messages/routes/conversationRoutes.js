/**
 * Conversation Routes - Main conversation CRUD operations
 * @module routes/inbox/conversationRoutes
 */

const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness, requirePermission } = require('../../../core/middlewares/authorization');
const Conversation = require('../../../core/database/models/Conversation');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// Import subroutes
const messageRoutes = require('./messageRoutes');
const locationRoutes = require('./locationRoutes');
const interactiveMessageRoutes = require('./interactiveMessageRoutes');

// Constants for conversations
const DEFAULT_CONVERSATIONS_LIMIT = 20; // Default pagination limit
const MAX_CONVERSATIONS_LIMIT = 100; // Maximum pagination limit
const DEFAULT_SORT_BY = 'lastMessageAt'; // Default sort field
const DEFAULT_SORT_ORDER = -1; // Descending order
const VALID_SORT_FIELDS = ['lastMessageAt', 'createdAt', 'unreadCount', 'contactName']; // Valid sort fields
 
// GET / - Get all conversations with filters (WhatsApp-style)
router.get('/', auth, requireBusiness, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      page = 1, 
      limit = DEFAULT_CONVERSATIONS_LIMIT, 
      status, 
      search, 
      sortBy = DEFAULT_SORT_BY, 
      sortOrder = DEFAULT_SORT_ORDER 
    } = req.query;

    const finalLimit = Math.min(parseInt(limit), MAX_CONVERSATIONS_LIMIT);

  const result = await Conversation.getPaginated(req.businessId, {
    page: parseInt(page),
    limit: finalLimit,
    status,
    search,
    sortBy,
    sortOrder: parseInt(sortOrder)
  });

    // Add real-time metadata
    const enhancedConversations = result.conversations.map(conv => ({
      ...conv,
      // Calculate if conversation window is open
      isWindowOpen: conv.conversationWindow?.expiresAt ? 
        new Date(conv.conversationWindow.expiresAt) > new Date() : false,
      // Time until window expires (in milliseconds)
      windowTimeRemaining: conv.conversationWindow?.expiresAt ? 
        Math.max(0, new Date(conv.conversationWindow.expiresAt) - new Date()) : 0
    }));

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      ...result,
      conversations: enhancedConversations,
      serverTime: new Date().toISOString(),
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get conversations error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retrieve conversations'
    });
  }
});

// GET /stats - Get inbox statistics
router.get('/stats', auth, requireBusiness, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const [total, active, closed, blocked] = await Promise.all([
      Conversation.countDocuments({ businessId: req.businessId }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'active' }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'closed' }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'blocked' })
    ]);

    const unreadConversations = await Conversation.find({
      businessId: req.businessId,
      unreadCount: { $gt: 0 }
    }).lean();

    const totalUnread = unreadConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

    const conversations = await Conversation.find({ 
      businessId: req.businessId
    }).lean();
    
    const avgResponseRate = conversations.length > 0
      ? conversations.reduce((sum, c) => sum + (c.metrics?.responseRate || 0), 0) / conversations.length
      : 0;

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      conversations: {
        total,
        active,
        closed,
        blocked,
        unread: unreadConversations.length
      },
      messages: {
        unread: totalUnread
      },
      metrics: {
        avgResponseRate: Math.round(avgResponseRate)
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get conversation stats error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retrieve conversation statistics'
    });
  }
});

// GET /:id - Get single conversation
router.get('/:id', auth, requireBusiness, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found'
      });
    }

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      ...conversation.toObject(),
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get conversation error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retrieve conversation'
    });
  }
});

// GET /:id/profile-history - Get contact profile history
router.get('/:id/profile-history', auth, requireBusiness, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    }).select('contact.profileHistory contact.name contact.phoneNumber contact.profilePhoto contact.about');

    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found'
      });
    }

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      contact: {
        name: conversation.contact.name,
        phoneNumber: conversation.contact.phoneNumber,
        profilePhoto: conversation.contact.profilePhoto,
        about: conversation.contact.about
      },
      profileHistory: conversation.contact.profileHistory || [],
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get profile history error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retrieve profile history'
    });
  }
});

// POST /:id/read - Mark conversation as read
router.post('/:id/read', auth, requireBusiness, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Simple and fast update - just reset unreadCount
    // Individual message read status is tracked by WhatsApp, not needed for our UI
    const result = await Conversation.updateOne(
      {
        _id: req.params.id,
        businessId: req.businessId
      },
      {
        $set: { unreadCount: 0 }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found'
      });
    }

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Conversation marked as read',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Mark conversation read error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to mark conversation as read'
    });
  }
});

// POST /:id/status - Change conversation status
router.post('/:id/status', auth, requireBusiness, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { status } = req.body;

    if (!['active', 'closed'].includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid status. Must be "active" or "closed"'
      });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found'
      });
    }

    conversation.status = status;
    await conversation.save();

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      ...conversation.toObject(),
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Update conversation status error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to update conversation status'
    });
  }
});

// POST /:id/block - Block conversation
router.post('/:id/block', auth, requireBusiness, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found'
      });
    }

    conversation.status = 'blocked';
    await conversation.save();

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      ...conversation.toObject(),
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Block conversation error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to block conversation'
    });
  }
});

// POST /:id/unblock - Unblock conversation
router.post('/:id/unblock', auth, requireBusiness, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found'
      });
    }

    conversation.status = 'active';
    await conversation.save();

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      ...conversation.toObject(),
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Unblock conversation error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to unblock conversation'
    });
  }
});

// Mount subroutes for conversation-specific operations
router.use('/', messageRoutes);
router.use('/', locationRoutes);
router.use('/', interactiveMessageRoutes);

module.exports = router;
