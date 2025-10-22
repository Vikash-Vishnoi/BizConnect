const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { auth } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

// @route   GET /api/messages
// @desc    Get messages for a conversation
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { conversationId, page = 1, limit = 50 } = req.query;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Message.countDocuments({ conversationId });

    res.json({
      messages: messages.reverse(), // Reverse to show oldest first
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// @route   POST /api/messages
// @desc    Send a new message
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { conversationId, text, type = 'text', mediaUrl, caption } = req.body;

    if (!conversationId || !text) {
      return res.status(400).json({ error: 'conversationId and text are required' });
    }

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Try to send message via WhatsApp (but don't fail if it doesn't work)
    let whatsappMessageId = null;
    let messageStatus = 'pending';
    
    try {
      let result;
      if (type === 'text') {
        result = await whatsappService.sendTextMessage(conversation.phoneNumber, text);
      } else if (['image', 'video', 'document'].includes(type) && mediaUrl) {
        result = await whatsappService.sendMediaMessage(
          conversation.phoneNumber,
          type,
          mediaUrl,
          caption
        );
      }

      if (result && result.success) {
        whatsappMessageId = result.messageId;
        messageStatus = 'sent';
      }
    } catch (whatsappError) {
      console.warn('WhatsApp send failed, saving message locally:', whatsappError.message);
      // Continue to save message locally even if WhatsApp fails
    }

    // Create message record
    const message = new Message({
      conversationId,
      whatsappMessageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
      to: conversation.phoneNumber,
      direction: 'outgoing',
      type,
      content: {
        text,
        mediaUrl,
        caption
      },
      status: messageStatus,
      userId: req.userId
    });

    await message.save();

    // Update conversation last message
    conversation.lastMessage = text;
    conversation.lastMessageAt = new Date();
    conversation.unreadCount = 0; // Reset unread for outgoing message
    await conversation.save();

    // Emit message via Socket.io
    const io = req.app.get('io');
    io.to(`user:${req.userId}`).emit('message:sent', {
      conversationId,
      message
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      conversationId: req.body.conversationId,
      userId: req.userId
    });
    res.status(500).json({ 
      error: 'Failed to send message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/messages/:id
// @desc    Get message by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      userId: req.userId
    }).populate('conversationId');

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

module.exports = router;
