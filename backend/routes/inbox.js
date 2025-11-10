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

// @route   GET /api/inbox/:id/profile-history
// @desc    Get contact profile change history
// @access  Private
router.get('/:id/profile-history', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
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

// @route   POST /api/inbox/:id/messages/audio
// @desc    Send audio message
// @access  Private
router.post('/:id/messages/audio', auth, async (req, res) => {
  try {
    const { audioUrl, replyToMessageId } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: 'audioUrl required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check conversation status
    if (conversation.status === 'blocked') {
      return res.status(403).json({ error: 'Conversation is blocked. Unblock before sending.' });
    }

    // Reopen if archived/closed
    if (conversation.status === 'archived' || conversation.status === 'closed') {
      conversation.status = 'active';
      await conversation.save();
    }

    // Build context for reply-to-message
    let context = null;
    if (replyToMessageId) {
      const replyToMessage = conversation.messages.id(replyToMessageId);
      if (replyToMessage && replyToMessage.whatsappMessageId) {
        context = { message_id: replyToMessage.whatsappMessageId };
      }
    }

    // Send via WhatsApp
    const result = await whatsappService.sendAudioMessage(
      conversation.contact.phoneNumber,
      audioUrl,
      context
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Add message to conversation
    const messageData = {
      whatsappMessageId: result.messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type: 'audio',
      content: {
        mediaUrl: audioUrl
      },
      status: 'sent',
      timestamp: new Date()
    };

    // Add reply context to saved message
    if (replyToMessageId) {
      messageData.context = {
        messageId: replyToMessageId
      };
    }

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
    console.error('Send audio message error:', error);
    res.status(500).json({ error: 'Failed to send audio message' });
  }
});

// @route   POST /api/inbox/:id/messages/sticker
// @desc    Send sticker message
// @access  Private
router.post('/:id/messages/sticker', auth, async (req, res) => {
  try {
    const { stickerUrl, stickerId, replyToMessageId } = req.body;

    if (!stickerUrl && !stickerId) {
      return res.status(400).json({ error: 'stickerUrl or stickerId required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check conversation status
    if (conversation.status === 'blocked') {
      return res.status(403).json({ error: 'Conversation is blocked. Unblock before sending.' });
    }

    // Reopen if archived/closed
    if (conversation.status === 'archived' || conversation.status === 'closed') {
      conversation.status = 'active';
      await conversation.save();
    }

    // Build context for reply-to-message
    let context = null;
    if (replyToMessageId) {
      const replyToMessage = conversation.messages.id(replyToMessageId);
      if (replyToMessage && replyToMessage.whatsappMessageId) {
        context = { message_id: replyToMessage.whatsappMessageId };
      }
    }

    // Send via WhatsApp
    const result = await whatsappService.sendStickerMessage(
      conversation.contact.phoneNumber,
      stickerUrl,
      stickerId,
      context
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Add message to conversation
    const messageData = {
      whatsappMessageId: result.messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type: 'sticker',
      content: {
        mediaUrl: stickerUrl,
        stickerId: stickerId
      },
      status: 'sent',
      timestamp: new Date()
    };

    // Add reply context to saved message
    if (replyToMessageId) {
      messageData.context = {
        messageId: replyToMessageId
      };
    }

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
    console.error('Send sticker message error:', error);
    res.status(500).json({ error: 'Failed to send sticker message' });
  }
});

// @route   POST /api/inbox/:id/messages/reply
// @desc    Send a reply to a specific message
// @access  Private
router.post('/:id/messages/reply', auth, async (req, res) => {
  try {
    const { text, replyToMessageId, type = 'text', mediaUrl, caption } = req.body;

    if (!text && !mediaUrl) {
      return res.status(400).json({ error: 'Message text or media required' });
    }

    if (!replyToMessageId) {
      return res.status(400).json({ error: 'replyToMessageId required for reply' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check conversation status
    if (conversation.status === 'blocked') {
      return res.status(403).json({ error: 'Conversation is blocked. Unblock before sending.' });
    }

    // Reopen if archived/closed
    if (conversation.status === 'archived' || conversation.status === 'closed') {
      conversation.status = 'active';
      await conversation.save();
    }

    // Find the message to reply to
    const replyToMessage = conversation.messages.id(replyToMessageId);
    if (!replyToMessage || !replyToMessage.whatsappMessageId) {
      return res.status(404).json({ error: 'Message to reply to not found' });
    }

    // Build context for reply
    const context = { message_id: replyToMessage.whatsappMessageId };

    // Send via WhatsApp with context
    let result;
    if (type === 'text') {
      result = await whatsappService.sendTextMessage(
        conversation.contact.phoneNumber,
        text,
        context
      );
    } else if (mediaUrl) {
      result = await whatsappService.sendMediaMessage(
        conversation.contact.phoneNumber,
        type,
        mediaUrl,
        caption,
        context
      );
    }

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Add message to conversation with reply context
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
      context: {
        messageId: replyToMessageId
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
    console.error('Send reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
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

// @route   POST /api/inbox/:id/messages/:messageId/pin
// @desc    Pin a message in conversation
// @access  Private
router.post('/:id/messages/:messageId/pin', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = conversation.messages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.isDeleted) {
      return res.status(400).json({ error: 'Cannot pin deleted message' });
    }

    // Update pin status
    message.isPinned = true;
    message.pinnedAt = new Date();
    message.pinnedBy = req.userId;

    await conversation.save();

    // Emit Socket.io event
    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('message:pinned', {
        conversationId: conversation._id,
        messageId: message._id,
        isPinned: true
      });
    }

    res.json({ 
      message: 'Message pinned successfully',
      pinnedMessage: message 
    });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// @route   POST /api/inbox/:id/messages/:messageId/unpin
// @desc    Unpin a message in conversation
// @access  Private
router.post('/:id/messages/:messageId/unpin', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = conversation.messages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Update pin status
    message.isPinned = false;
    message.pinnedAt = undefined;
    message.pinnedBy = undefined;

    await conversation.save();

    // Emit Socket.io event
    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('message:pinned', {
        conversationId: conversation._id,
        messageId: message._id,
        isPinned: false
      });
    }

    res.json({ message: 'Message unpinned successfully' });
  } catch (error) {
    console.error('Unpin message error:', error);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

// @route   GET /api/inbox/:id/messages/pinned
// @desc    Get all pinned messages in conversation
// @access  Private
router.get('/:id/messages/pinned', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Filter pinned messages
    const pinnedMessages = conversation.messages
      .filter(msg => msg.isPinned && !msg.isDeleted)
      .sort((a, b) => b.pinnedAt - a.pinnedAt); // Most recently pinned first

    res.json({ pinnedMessages });
  } catch (error) {
    console.error('Get pinned messages error:', error);
    res.status(500).json({ error: 'Failed to get pinned messages' });
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

// @route   POST /api/inbox/:id/messages/poll
// @desc    Send interactive poll message
// @access  Private
router.post('/:id/messages/poll', auth, async (req, res) => {
  try {
    const { question, options } = req.body;

    if (!question || !options || !Array.isArray(options)) {
      return res.status(400).json({ error: 'question and options array required' });
    }

    // Validate options count (2-12)
    if (options.length < 2 || options.length > 12) {
      return res.status(400).json({ error: 'Poll must have 2-12 options' });
    }

    // Validate option length (1-20 chars each)
    for (const option of options) {
      if (!option || option.length > 20) {
        return res.status(400).json({ error: 'Each option must be 1-20 characters' });
      }
    }

    // Validate question length (1-255 chars)
    if (question.length > 255) {
      return res.status(400).json({ error: 'Question must be 1-255 characters' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.status === 'blocked') {
      return res.status(403).json({ error: 'Conversation is blocked. Unblock before sending.' });
    }

    console.log('📊 Sending poll:', { question, optionsCount: options.length });

    const result = await whatsappService.sendPollMessage(
      conversation.contact.phoneNumber,
      question,
      options
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
        text: question,
        interactive: {
          type: 'poll',
          body: question,
          options: options
        }
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
    console.error('Send poll message error:', error);
    res.status(500).json({ error: 'Failed to send poll message' });
  }
});

// @route   POST /api/inbox/:id/messages/cta
// @desc    Send interactive CTA (Call-to-Action) message
// @access  Private
router.post('/:id/messages/cta', auth, async (req, res) => {
  try {
    const { bodyText, ctaButtons } = req.body;

    // Validate input
    if (!bodyText || !ctaButtons || !Array.isArray(ctaButtons)) {
      return res.status(400).json({ error: 'bodyText and ctaButtons array required' });
    }

    if (ctaButtons.length === 0 || ctaButtons.length > 2) {
      return res.status(400).json({ error: 'Must have 1-2 CTA buttons' });
    }

    // Validate each button
    for (const btn of ctaButtons) {
      if (!btn.type || !['PHONE_NUMBER', 'URL'].includes(btn.type)) {
        return res.status(400).json({ error: 'Button type must be PHONE_NUMBER or URL' });
      }
      if (!btn.title || btn.title.length > 20) {
        return res.status(400).json({ error: 'Button title must be 1-20 characters' });
      }
      if (btn.type === 'PHONE_NUMBER' && !btn.phone_number) {
        return res.status(400).json({ error: 'phone_number required for PHONE_NUMBER button' });
      }
      if (btn.type === 'URL' && !btn.url) {
        return res.status(400).json({ error: 'url required for URL button' });
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

    if (conversation.status === 'blocked') {
      return res.status(403).json({ error: 'Cannot send messages to blocked conversation' });
    }

    console.log('📤 Sending CTA message:', {
      bodyText,
      buttons: ctaButtons.length,
      to: conversation.contact.phoneNumber
    });

    const result = await whatsappService.sendCTAMessage(
      conversation.contact.phoneNumber,
      bodyText,
      ctaButtons
    );

    if (!result.success) {
      console.error('❌ CTA message failed:', result.error);
      return res.status(500).json({ error: result.error || 'Failed to send CTA message' });
    }

    console.log('✅ CTA message sent:', result.messageId);

    // Save to conversation
    const messageData = {
      whatsappMessageId: result.messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type: 'interactive',
      content: {
        text: bodyText,
        interactive: {
          type: 'cta',
          body: bodyText,
          ctaButtons: ctaButtons
        }
      },
      status: 'sent',
      timestamp: new Date()
    };

    const savedMessage = await conversation.addMessage(messageData);

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('message:sent', {
        conversationId: conversation._id,
        message: savedMessage
      });
    }

    res.status(201).json({ message: savedMessage });
  } catch (error) {
    console.error('Send CTA message error:', error);
    res.status(500).json({ error: 'Failed to send CTA message' });
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

// @route   POST /api/inbox/:id/messages/live-location
// @desc    Start live location sharing (real-time tracking)
// @access  Private
router.post('/:id/messages/live-location', auth, async (req, res) => {
  try {
    const { latitude, longitude, name, address, duration = 900 } = req.body;

    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude required' });
    }

    // Validate latitude/longitude ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'latitude must be between -90 and 90' });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'longitude must be between -180 and 180' });
    }

    // Validate duration (60 seconds to 8 hours)
    const validDuration = Math.max(60, Math.min(28800, parseInt(duration)));

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Send live location via WhatsApp
    const result = await whatsappService.sendLiveLocation(
      conversation.contact.phoneNumber,
      latitude,
      longitude,
      name,
      address,
      validDuration
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Add to conversation with live location metadata
    const messageData = {
      whatsappMessageId: result.messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type: 'location',
      content: {
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          name: name || 'Live Location',
          address: address || '',
          isLive: true,
          duration: validDuration,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + validDuration * 1000),
          lastUpdate: new Date()
        }
      },
      status: 'sent',
      timestamp: new Date(),
      metadata: {
        liveLocation: true,
        duration: validDuration
      }
    };

    const savedMessage = await conversation.addMessage(messageData);

    res.status(201).json({ 
      message: savedMessage,
      duration: validDuration,
      expiresAt: messageData.content.location.expiresAt
    });
  } catch (error) {
    console.error('Send live location error:', error);
    res.status(500).json({ error: 'Failed to send live location' });
  }
});

// @route   PUT /api/inbox/:id/messages/:messageId/live-location
// @desc    Update live location coordinates (during active sharing)
// @access  Private
router.put('/:id/messages/:messageId/live-location', auth, async (req, res) => {
  try {
    const { latitude, longitude, speed, accuracy, bearing } = req.body;

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

    // Find the message
    const message = conversation.messages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify it's a live location message
    if (message.type !== 'location' || !message.content?.location?.isLive) {
      return res.status(400).json({ error: 'Not a live location message' });
    }

    // Check if live location has expired
    const expiresAt = message.content.location.expiresAt;
    if (new Date() > new Date(expiresAt)) {
      return res.status(400).json({ error: 'Live location sharing has expired' });
    }

    // Update location coordinates
    message.content.location.latitude = parseFloat(latitude);
    message.content.location.longitude = parseFloat(longitude);
    message.content.location.lastUpdate = new Date();

    // Update metadata if provided
    if (speed !== undefined) {
      message.content.location.speed = parseFloat(speed);
    }
    if (accuracy !== undefined) {
      message.content.location.accuracy = parseFloat(accuracy);
    }
    if (bearing !== undefined) {
      message.content.location.bearing = parseFloat(bearing);
    }

    await conversation.save();

    // Emit socket event for real-time updates
    if (global.io) {
      global.io.to(`user:${req.userId}`).emit('live:location:update', {
        conversationId: conversation._id,
        messageId: message._id,
        location: message.content.location
      });
    }

    res.json({ 
      message: 'Live location updated',
      location: message.content.location
    });
  } catch (error) {
    console.error('Update live location error:', error);
    res.status(500).json({ error: 'Failed to update live location' });
  }
});

// @route   DELETE /api/inbox/:id/messages/:messageId/live-location
// @desc    Stop live location sharing
// @access  Private
router.delete('/:id/messages/:messageId/live-location', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Find the message
    const message = conversation.messages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify it's a live location message
    if (message.type !== 'location' || !message.content?.location?.isLive) {
      return res.status(400).json({ error: 'Not a live location message' });
    }

    // Stop live location by setting isLive to false
    message.content.location.isLive = false;
    message.content.location.stoppedAt = new Date();

    await conversation.save();

    // Emit socket event
    if (global.io) {
      global.io.to(`user:${req.userId}`).emit('live:location:stopped', {
        conversationId: conversation._id,
        messageId: message._id
      });
    }

    res.json({ message: 'Live location sharing stopped' });
  } catch (error) {
    console.error('Stop live location error:', error);
    res.status(500).json({ error: 'Failed to stop live location' });
  }
});

// @route   POST /api/inbox/:id/messages/contact
// @desc    Send contact card (VCard)
// @access  Private
router.post('/:id/messages/contact', auth, async (req, res) => {
  try {
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'contacts array is required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Validate contact format
    for (const contact of contacts) {
      if (!contact.name || !contact.name.formatted_name) {
        return res.status(400).json({ error: 'Each contact must have name.formatted_name' });
      }
      if (!contact.phones || !Array.isArray(contact.phones) || contact.phones.length === 0) {
        return res.status(400).json({ error: 'Each contact must have at least one phone number' });
      }
    }

    // Send contact via WhatsApp
    const result = await whatsappService.sendContactMessage(
      conversation.contact.phoneNumber,
      contacts
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
      type: 'contacts',
      content: {
        contacts: contacts
      },
      status: 'sent',
      timestamp: new Date()
    };

    const savedMessage = await conversation.addMessage(messageData);

    // Emit Socket.io event
    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('message:sent', {
        conversationId: conversation._id.toString(),
        message: savedMessage
      });
    }

    res.status(201).json({ message: savedMessage });
  } catch (error) {
    console.error('Send contact error:', error);
    res.status(500).json({ error: 'Failed to send contact' });
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

// @route   POST /api/inbox/:id/block
// @desc    Block a contact (sets conversation status to 'blocked')
// @access  Private
router.post('/:id/block', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const previousStatus = conversation.status;
    conversation.status = 'blocked';
    await conversation.save();

    // Emit Socket.io event
    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('conversation:statusChanged', {
        conversationId: conversation._id,
        status: 'blocked',
        previousStatus
      });
    }

    res.json({ 
      message: 'Contact blocked successfully',
      conversation 
    });
  } catch (error) {
    console.error('Block contact error:', error);
    res.status(500).json({ error: 'Failed to block contact' });
  }
});

// @route   POST /api/inbox/:id/unblock
// @desc    Unblock a contact (sets conversation status to 'active')
// @access  Private
router.post('/:id/unblock', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.status !== 'blocked') {
      return res.status(400).json({ error: 'Conversation is not blocked' });
    }

    const previousStatus = conversation.status;
    conversation.status = 'active';
    await conversation.save();

    // Emit Socket.io event
    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('conversation:statusChanged', {
        conversationId: conversation._id,
        status: 'active',
        previousStatus
      });
    }

    res.json({ 
      message: 'Contact unblocked successfully',
      conversation 
    });
  } catch (error) {
    console.error('Unblock contact error:', error);
    res.status(500).json({ error: 'Failed to unblock contact' });
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
