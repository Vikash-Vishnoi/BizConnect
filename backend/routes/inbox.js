/**
 * Inbox Routes - Conversation Model
 * 
 * All conversation and message operations in one place,
 * aligned with WhatsApp Business API conversation-centric approach.
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const whatsappService = require('../services/whatsappService');

// @route   GET /api/inbox
// @desc    Get all conversations with optional filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search, 
      sortBy = 'lastMessageAt', 
      sortOrder = -1 
    } = req.query;

    const result = await Conversation.getPaginated(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search,
      sortBy,
      sortOrder: parseInt(sortOrder)
    });

    res.json(result);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// @route   GET /api/inbox/stats
// @desc    Get inbox statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const [total, active, archived, blocked] = await Promise.all([
      Conversation.countDocuments({ userId: req.userId, isDeleted: false }),
      Conversation.countDocuments({ userId: req.userId, status: 'active', isDeleted: false }),
      Conversation.countDocuments({ userId: req.userId, status: 'archived', isDeleted: false }),
      Conversation.countDocuments({ userId: req.userId, status: 'blocked', isDeleted: false })
    ]);

    const unreadConversations = await Conversation.find({
      userId: req.userId,
      unreadCount: { $gt: 0 },
      isDeleted: false
    }).lean();

    const totalUnread = unreadConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

    // Calculate response metrics
    const conversations = await Conversation.find({ 
      userId: req.userId,
      isDeleted: false 
    }).lean();
    
    const avgResponseRate = conversations.length > 0
      ? conversations.reduce((sum, c) => sum + (c.metrics?.responseRate || 0), 0) / conversations.length
      : 0;

    res.json({
      conversations: {
        total,
        active,
        archived,
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

// @route   GET /api/inbox/:id
// @desc    Get single conversation with all messages
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
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

// @route   GET /api/inbox/:id/messages
// @desc    Get conversation messages with pagination (includes campaign messages by reference)
// @access  Private
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    }).lean();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get regular messages from conversation
    const regularMessages = conversation.messages || [];

    // ✅ OPTIMIZATION: Fetch campaign messages by reference (no duplication)
    let campaignMessages = [];
    if (conversation.campaignId) {
      const Campaign = require('../models/Campaign');
      const campaign = await Campaign.findById(conversation.campaignId).lean();
      
      if (campaign) {
        // Find recipient in campaign that matches this conversation's phone
        const recipient = campaign.recipients.find(r => 
          r.conversationId && r.conversationId.toString() === conversation._id.toString()
        );

        if (recipient && recipient.messageContent) {
          // Create message object from campaign data (not duplicated in DB)
          campaignMessages.push({
            _id: `campaign_${campaign._id}_${recipient.phoneNumber}`,
            whatsappMessageId: recipient.whatsappMessageId,
            from: process.env.WHATSAPP_PHONE_NUMBER_ID,
            to: recipient.phoneNumber,
            direction: 'outgoing',
            type: recipient.messageContent.templateName ? 'template' : 'text',
            content: {
              text: recipient.messageContent.text,
              templateName: recipient.messageContent.templateName
            },
            status: recipient.status,
            timestamp: recipient.sentAt,
            isCampaignMessage: true, // ✅ Flag for frontend
            campaignId: campaign._id,
            campaignName: campaign.name
          });
        }
      }
    }

    // Merge and sort all messages by timestamp
    const allMessages = [...regularMessages, ...campaignMessages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Paginate combined messages
    const totalMessages = allMessages.length;
    const startIndex = Math.max(0, totalMessages - (page * limit));
    const endIndex = totalMessages - ((page - 1) * limit);
    const messages = allMessages.slice(startIndex, endIndex).reverse();

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalMessages,
        hasMore: startIndex > 0
      },
      hasCampaignMessages: campaignMessages.length > 0
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// @route   POST /api/inbox/:id/messages
// @desc    Send a message in conversation
// @access  Private
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { text, type = 'text', mediaUrl, caption } = req.body;

    if (!text && !mediaUrl) {
      return res.status(400).json({ error: 'Message text or media required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // WhatsApp-like status rules before sending
    if (conversation.status === 'blocked') {
      return res.status(403).json({ error: 'Conversation is blocked. Unblock before sending.' });
    }

    // If archived or closed and we are sending a message, reopen to active
    if (conversation.status === 'archived' || conversation.status === 'closed') {
      conversation.status = 'active';
      await conversation.save();
      if (req.app.get('io')) {
        req.app.get('io').to(`user:${req.userId}`).emit('conversation:statusChanged', {
          conversationId: conversation._id,
          status: 'active',
          previousStatus: req.body.previousStatus || 'unknown'
        });
      }
    }

    // Send via WhatsApp
    let result;
    if (type === 'text') {
      result = await whatsappService.sendTextMessage(
        conversation.contact.phoneNumber,
        text
      );
    } else if (mediaUrl) {
      result = await whatsappService.sendMediaMessage(
        conversation.contact.phoneNumber,
        type,
        mediaUrl,
        caption
      );
    }

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Add message to conversation
    const messageData = {
      whatsappMessageId: result.messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type,
      content: {
        text: text || caption,
        mediaUrl,
        caption
      },
      status: 'sent',
      timestamp: new Date()
    };

    const savedMessage = await conversation.addMessage(messageData);

    // Emit Socket.io event
    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('message:sent', {
        conversationId: conversation._id,
        message: savedMessage
      });
    }

    res.status(201).json({ message: savedMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// @route   POST /api/inbox/:id/messages/reaction
// @desc    Send reaction to a message
// @access  Private
router.post('/:id/messages/reaction', auth, async (req, res) => {
  try {
    const { messageId, emoji } = req.body;

    if (!messageId || !emoji) {
      return res.status(400).json({ error: 'messageId and emoji required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Find the message to get whatsappMessageId
    const message = conversation.messages.id(messageId);
    if (!message || !message.whatsappMessageId) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Send reaction via WhatsApp
    const result = await whatsappService.sendReaction(
      conversation.contact.phoneNumber,
      message.whatsappMessageId,
      emoji
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, message: 'Reaction sent' });
  } catch (error) {
    console.error('Send reaction error:', error);
    res.status(500).json({ error: 'Failed to send reaction' });
  }
});

// @route   POST /api/inbox/:id/messages/button
// @desc    Send interactive button message
// @access  Private
router.post('/:id/messages/button', auth, async (req, res) => {
  try {
    const { bodyText, buttons } = req.body;

    if (!bodyText || !buttons || !Array.isArray(buttons)) {
      return res.status(400).json({ error: 'bodyText and buttons array required' });
    }

    // Validate buttons (WhatsApp allows max 3 buttons)
    if (buttons.length === 0 || buttons.length > 3) {
      return res.status(400).json({ error: 'Must have 1-3 buttons' });
    }

    // Validate button structure
    for (const btn of buttons) {
      if (!btn.title || btn.title.length > 20) {
        return res.status(400).json({ error: 'Button title required and must be max 20 characters' });
      }
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    console.log('📤 Sending button message:', { bodyText, buttons, to: conversation.contact.phoneNumber });

    const result = await whatsappService.sendButtonMessage(
      conversation.contact.phoneNumber,
      bodyText,
      buttons
    );

    if (!result.success) {
      console.error('❌ Button message failed:', result.error);
      return res.status(500).json({ error: result.error || 'Failed to send button message' });
    }

    console.log('✅ Button message sent:', result.messageId);

    // Add to conversation
    const messageData = {
      whatsappMessageId: result.messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type: 'interactive',
      content: {
        text: bodyText,
        interactive: {
          type: 'button',
          body: bodyText,
          buttons: buttons
        }
      },
      status: 'sent',
      timestamp: new Date()
    };

    const savedMessage = await conversation.addMessage(messageData);

    res.status(201).json({ message: savedMessage });
  } catch (error) {
    console.error('Send button message error:', error);
    res.status(500).json({ error: 'Failed to send button message' });
  }
});

// @route   POST /api/inbox/:id/messages/list
// @desc    Send interactive list message
// @access  Private
router.post('/:id/messages/list', auth, async (req, res) => {
  try {
    const { bodyText, buttonText, sections } = req.body;

    if (!bodyText || !buttonText || !sections) {
      return res.status(400).json({ error: 'bodyText, buttonText, and sections required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const result = await whatsappService.sendListMessage(
      conversation.contact.phoneNumber,
      bodyText,
      buttonText,
      sections
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Add to conversation
    const messageData = {
      whatsappMessageId: result.messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type: 'interactive',
      content: {
        text: bodyText,
        interactive: {
          type: 'list',
          body: bodyText,
          sections: sections
        }
      },
      status: 'sent',
      timestamp: new Date()
    };

    const savedMessage = await conversation.addMessage(messageData);

    res.status(201).json({ message: savedMessage });
  } catch (error) {
    console.error('Send list message error:', error);
    res.status(500).json({ error: 'Failed to send list message' });
  }
});

// @route   POST /api/inbox/:id/messages/location
// @desc    Send location message
// @access  Private
router.post('/:id/messages/location', auth, async (req, res) => {
  try {
    const { latitude, longitude, name, address } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Send location via WhatsApp
    const result = await whatsappService.sendLocationMessage(
      conversation.contact.phoneNumber,
      latitude,
      longitude,
      name,
      address
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Add to conversation
    const messageData = {
      whatsappMessageId: result.messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type: 'location',
      content: {
        location: {
          latitude,
          longitude,
          name: name || 'Location',
          address: address || ''
        }
      },
      status: 'sent',
      timestamp: new Date()
    };

    const savedMessage = await conversation.addMessage(messageData);

    res.status(201).json({ message: savedMessage });
  } catch (error) {
    console.error('Send location error:', error);
    res.status(500).json({ error: 'Failed to send location' });
  }
});

// @route   POST /api/inbox/:id/read
// @desc    Mark conversation as read
// @access  Private
router.post('/:id/read', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await conversation.markAsRead();

    // Emit Socket.io event
    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('conversation:read', {
        conversationId: conversation._id
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// @route   POST /api/inbox/:id/status
// @desc    Update conversation status
// @access  Private
router.post('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'archived', 'blocked', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.status = status;
    await conversation.save();

    // Emit Socket.io event
    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('conversation:statusChanged', {
        conversationId: conversation._id,
        status
      });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// @route   DELETE /api/inbox/:id
// @desc    Soft delete conversation
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.isDeleted = true;
    conversation.deletedAt = new Date();
    await conversation.save();

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

module.exports = router;
