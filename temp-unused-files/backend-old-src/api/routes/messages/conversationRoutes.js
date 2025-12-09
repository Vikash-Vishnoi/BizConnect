/**
 * Conversation Routes - Main conversation CRUD operations
 * @module routes/inbox/conversationRoutes
 */

const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../../../api/middlewares/auth');
const Conversation = require('../../../database/models/Conversation');
 
// GET / - Get all conversations with filters (WhatsApp-style)
router.get('/', async (req, res) => {
  try {
    const defaultLimit = parseInt(process.env.CONVERSATIONS_DEFAULT_LIMIT || '20');
    const maxLimit = parseInt(process.env.CONVERSATIONS_MAX_LIMIT || '100');
    const { 
      page = 1, 
      limit = defaultLimit, 
      status, 
      search, 
      sortBy = 'lastMessageAt', 
      sortOrder = -1 
    } = req.query;

    const finalLimit = Math.min(parseInt(limit), maxLimit);

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

    res.json({
      ...result,
      conversations: enhancedConversations,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /stats - Get inbox statistics
router.get('/stats', async (req, res) => {
  try {
    const [total, active, closed, blocked] = await Promise.all([
      Conversation.countDocuments({ businessId: req.businessId, isDeleted: false }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'active', isDeleted: false }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'closed', isDeleted: false }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'blocked', isDeleted: false })
    ]);

    const unreadConversations = await Conversation.find({
      businessId: req.businessId,
      unreadCount: { $gt: 0 },
      isDeleted: false
    }).lean();

    const totalUnread = unreadConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

    const conversations = await Conversation.find({ 
      businessId: req.businessId,
      isDeleted: false 
    }).lean();
    
    const avgResponseRate = conversations.length > 0
      ? conversations.reduce((sum, c) => sum + (c.metrics?.responseRate || 0), 0) / conversations.length
      : 0;

    res.json({
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
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /:id - Get single conversation
router.get('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// GET /:id/profile-history - Get contact profile history
router.get('/:id/profile-history', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      isDeleted: false
    }).select('contact.profileHistory contact.name contact.phoneNumber contact.profilePhoto contact.about');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      contact: {
        name: conversation.contact.name,
        phoneNumber: conversation.contact.phoneNumber,
        profilePhoto: conversation.contact.profilePhoto,
        about: conversation.contact.about
      },
      profileHistory: conversation.contact.profileHistory || []
    });
  } catch (error) {
    console.error('Get profile history error:', error);
    res.status(500).json({ error: 'Failed to fetch profile history' });
  }
});

// POST /:id/read - Mark conversation as read
router.post('/:id/read', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.unreadCount = 0;
    await conversation.save();

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// POST /:id/status - Change conversation status
router.post('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.status = status;
    await conversation.save();

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /:id/block - Block conversation
router.post('/:id/block', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.status = 'blocked';
    await conversation.save();

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Block conversation error:', error);
    res.status(500).json({ error: 'Failed to block conversation' });
  }
});

// POST /:id/unblock - Unblock conversation
router.post('/:id/unblock', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.status = 'active';
    await conversation.save();

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Unblock conversation error:', error);
    res.status(500).json({ error: 'Failed to unblock conversation' });
  }
});

module.exports = router;
