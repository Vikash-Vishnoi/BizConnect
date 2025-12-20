/**
 * Conversation Window Routes
 * Handles 24-hour conversation window tracking and enforcement
 * @module routes/inbox/conversationWindowRoutes
 */

const express = require('express');
const router = express.Router();
const { Conversation } = require('../../../core/database/models');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const { businessContext } = require('../../../core/middlewares/businessContext');

// Apply business context middleware
router.use(businessContext);

// Constants for conversation window
const CONVERSATION_WINDOW_HOURS = 24; // WhatsApp 24-hour window
const CONVERSATION_WINDOW_MS = CONVERSATION_WINDOW_HOURS * 60 * 60 * 1000; // 24 hours in milliseconds
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
 
/**
 * GET /:id/window-status - Get conversation window status
 * Returns whether the 24-hour window is open and when it expires
 */
router.get('/:id/window-status', async (req, res) => {
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
      hoursRemaining = Math.floor(msRemaining / MS_PER_HOUR);
      minutesRemaining = Math.floor((msRemaining % MS_PER_HOUR) / MS_PER_MINUTE);
    }

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      window: {
        isOpen,
        expiresAt: expiresAt || null,
        lastInboundAt: lastInboundAt || null,
        hoursRemaining: isOpen ? hoursRemaining : 0,
        minutesRemaining: isOpen ? minutesRemaining : 0,
        extendedCount: windowData.extendedCount || 0,
        requiresTemplate: !isOpen
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get window status error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get conversation window status'
    });
  }
});

/**
 * POST /:id/extend-window - Send a message to extend the conversation window
 * This endpoint sends a message and opens/extends the 24-hour window
 */
router.post('/:id/extend-window', businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Message text is required'
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

    const now = new Date();
    const windowData = conversation.window || {};
    const isCurrentlyOpen = windowData.isOpen && windowData.expiresAt && windowData.expiresAt > now;

    // Check if window is closed - if so, this is not allowed
    // User must send a template message instead
    if (!isCurrentlyOpen) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Cannot extend closed window. Please use a template message instead.'
      });
    }

    // Get credentials and create WhatsAppService instance
    const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

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
    conversation.window.extendedCount = (windowData.extendedCount || 0) + 1;
    conversation.window.isOpen = true;
    conversation.window.expiresAt = new Date(now.getTime() + CONVERSATION_WINDOW_MS);

    // Add message to conversation
    conversation.messages.push({
      whatsappMessageId: result.messageId,
      from: req.businessId,
      to: conversation.contact.phoneNumber,
      direction: 'out',
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
      direction: 'out',
      timestamp: now,
      status: 'sent'
    };

    await conversation.save();

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      message: 'Message sent and window extended',
      messageId: result.messageId,
      window: {
        isOpen: true,
        expiresAt: conversation.window.expiresAt,
        extendedCount: conversation.window.extendedCount,
        hoursRemaining: CONVERSATION_WINDOW_HOURS,
        minutesRemaining: 0
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Extend conversation window error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to extend conversation window'
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
