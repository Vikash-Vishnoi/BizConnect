/**
 * Message Forwarding Routes
 * 
 * API endpoints for forwarding messages between conversations
 * 
 * @route /api/forward
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const messageForwardingService = require('../services/messageForwardingService');

/**
 * @route   POST /api/forward/message
 * @desc    Forward a single message to one or more conversations
 * @access  Private
 */
router.post('/message', auth, async (req, res) => {
  try {
    const {
      sourceConversationId,
      messageId,
      targetConversationIds,
      addCaption,
      keepOriginalCaption = true
    } = req.body;

    // Validation
    if (!sourceConversationId || !messageId || !targetConversationIds) {
      return res.status(400).json({
        success: false,
        message: 'sourceConversationId, messageId, and targetConversationIds are required'
      });
    }

    if (!Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'targetConversationIds must be a non-empty array'
      });
    }

    if (targetConversationIds.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Cannot forward to more than 10 conversations at once'
      });
    }

    const result = await messageForwardingService.forwardMessage(
      sourceConversationId,
      messageId,
      targetConversationIds,
      req.user._id,
      { addCaption, keepOriginalCaption }
    );

    // Emit real-time events for successful forwards
    const io = req.app.get('io');
    if (io && result.results.success.length > 0) {
      result.results.success.forEach(forward => {
        io.to(`user:${req.user._id}`).emit('message:forwarded', {
          sourceConversationId,
          targetConversationId: forward.conversationId,
          messageId: forward.messageId,
          timestamp: new Date()
        });
      });
    }

    res.json({
      success: true,
      message: `Message forwarded to ${result.summary.successCount} conversation(s)`,
      data: result
    });
  } catch (error) {
    console.error('Error forwarding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to forward message',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/forward/messages
 * @desc    Forward multiple messages to one or more conversations
 * @access  Private
 */
router.post('/messages', auth, async (req, res) => {
  try {
    const {
      sourceConversationId,
      messageIds,
      targetConversationIds
    } = req.body;

    // Validation
    if (!sourceConversationId || !messageIds || !targetConversationIds) {
      return res.status(400).json({
        success: false,
        message: 'sourceConversationId, messageIds, and targetConversationIds are required'
      });
    }

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'messageIds must be a non-empty array'
      });
    }

    if (!Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'targetConversationIds must be a non-empty array'
      });
    }

    if (messageIds.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Cannot forward more than 5 messages at once'
      });
    }

    if (targetConversationIds.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Cannot forward to more than 10 conversations at once'
      });
    }

    const result = await messageForwardingService.forwardMultipleMessages(
      sourceConversationId,
      messageIds,
      targetConversationIds,
      req.user._id
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user._id}`).emit('messages:bulk_forwarded', {
        sourceConversationId,
        targetConversationIds,
        messageCount: messageIds.length,
        successCount: result.summary.successfulMessages,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: `Forwarded ${result.summary.successfulMessages} message(s) successfully`,
      data: result
    });
  } catch (error) {
    console.error('Error forwarding messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to forward messages',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/forward/conversations
 * @desc    Get list of conversations available for forwarding
 * @access  Private
 */
router.get('/conversations', auth, async (req, res) => {
  try {
    const { excludeConversationId } = req.query;

    const conversations = await messageForwardingService.getForwardableConversations(
      req.user._id,
      excludeConversationId
    );

    res.json({
      success: true,
      data: {
        conversations,
        total: conversations.length
      }
    });
  } catch (error) {
    console.error('Error getting forwardable conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/forward/check/:conversationId/:messageId
 * @desc    Check if a message can be forwarded
 * @access  Private
 */
router.get('/check/:conversationId/:messageId', auth, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;

    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const message = conversation.messages.id(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const canForward = messageForwardingService.canForwardMessage(message);

    res.json({
      success: true,
      data: {
        canForward,
        messageType: message.type,
        messageStatus: message.status,
        isDeleted: message.isDeleted,
        reason: !canForward ? 'Message type not supported or message is deleted/failed' : null
      }
    });
  } catch (error) {
    console.error('Error checking forward eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check forward eligibility',
      error: error.message
    });
  }
});

module.exports = router;
