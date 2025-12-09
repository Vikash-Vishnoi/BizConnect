/**
 * Conversation Window Routes
 * Handles 24-hour conversation window tracking and enforcement
 * @module routes/inbox/conversationWindowRoutes
 */

const express = require('express');
const router = express.Router();
const { Conversation } = require('../../../core/database/models');
 
/**
 * GET /:id/window-status - Get conversation window status
 * Returns whether the 24-hour window is open and when it expires
 */
router.get('/:id/window-status', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const now = new Date();
    const windowData = conversation.window || {};
    
    // Calculate window status
    const isOpen = windowData.isOpen && windowData.expiresAt && windowData.expiresAt > now;
    const expiresAt = windowData.expiresAt;
    const lastInboundAt = windowData.lastInboundAt;
    
    let hoursRemaining = 0;
    let minutesRemaining = 0;
    
    if (isOpen && expiresAt) {
      const msRemaining = expiresAt.getTime() - now.getTime();
      hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
      minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    }

    res.json({
      success: true,
      window: {
        isOpen,
        expiresAt: expiresAt || null,
        lastInboundAt: lastInboundAt || null,
        hoursRemaining: isOpen ? hoursRemaining : 0,
        minutesRemaining: isOpen ? minutesRemaining : 0,
        extendedCount: windowData.extendedCount || 0,
        requiresTemplate: !isOpen
      }
    });
  } catch (error) {
    console.error('Error getting window status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get window status',
      error: error.message
    });
  }
});

/**
 * POST /:id/extend-window - Send a message to extend the conversation window
 * This endpoint sends a message and opens/extends the 24-hour window
 */
router.post('/:id/extend-window', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const now = new Date();
    const windowData = conversation.window || {};
    const isCurrentlyOpen = windowData.isOpen && windowData.expiresAt && windowData.expiresAt > now;

    // Check if window is closed - if so, this is not allowed
    // User must send a template message instead
    if (!isCurrentlyOpen) {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend closed window. Please use a template message instead.',
        requiresTemplate: true,
        windowClosed: true
      });
    }

    // Import whatsappService here to avoid circular dependencies
    const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
    const whatsappService = new WhatsAppService();

    // Send the message
    const result = await whatsappService.sendMessage({
      businessId: req.businessId,
      to: conversation.contact.phoneNumber,
      message: {
        type: 'text',
        text: message
      }
    });

    // Update conversation window (extends it)
    const windowDurationHours = parseInt(process.env.CONVERSATION_WINDOW_HOURS || '24');
    conversation.window.extendedCount = (windowData.extendedCount || 0) + 1;
    conversation.window.isOpen = true;
    conversation.window.expiresAt = new Date(now.getTime() + windowDurationHours * 60 * 60 * 1000);

    // Add message to conversation
    conversation.messages.push({
      whatsappMessageId: result.messageId,
      from: req.businessId,
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type: 'text',
      content: {
        text: message
      },
      status: 'sent',
      timestamp: now,
      requiresTemplate: false,
      windowStatus: 'WITHIN_24H'
    });

    conversation.lastMessageAt = now;
    conversation.lastMessage = {
      text: message,
      type: 'text',
      direction: 'outgoing',
      timestamp: now,
      status: 'sent'
    };

    await conversation.save();

    res.json({
      success: true,
      message: 'Message sent and window extended',
      messageId: result.messageId,
      window: {
        isOpen: true,
        expiresAt: conversation.window.expiresAt,
        extendedCount: conversation.window.extendedCount,
        hoursRemaining: windowDurationHours,
        minutesRemaining: 0
      }
    });
  } catch (error) {
    console.error('Error extending window:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend window',
      error: error.message
    });
  }
});

/**
 * Helper middleware to check window status before sending
 * Can be used in other routes to enforce window rules
 */
router.checkWindowStatus = async (conversationId, businessId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    businessId
  });

  if (!conversation) {
    return {
      valid: false,
      error: 'Conversation not found',
      requiresTemplate: true
    };
  }

  const now = new Date();
  const windowData = conversation.window || {};
  const isOpen = windowData.isOpen && windowData.expiresAt && windowData.expiresAt > now;

  return {
    valid: true,
    isOpen,
    expiresAt: windowData.expiresAt,
    requiresTemplate: !isOpen,
    conversation
  };
};

module.exports = router;
