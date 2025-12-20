/**
 * Interactive Message Routes - Interactive message types (buttons, lists, polls, reactions, pins)
 * @module routes/inbox/interactiveMessageRoutes
 */

const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness, requirePermission } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const Conversation = require('../../../core/database/models/Conversation');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// Constants for interactive messages
const MIN_BUTTON_COUNT = 1; // Minimum buttons in button message
const MAX_BUTTON_COUNT = 3; // Maximum buttons in button message
const MAX_BUTTON_TITLE_LENGTH = 20; // Maximum button title length
const MIN_CTA_BUTTONS = 1; // Minimum CTA buttons
const MAX_CTA_BUTTONS = 2; // Maximum CTA buttons
const VALID_CTA_TYPES = ['PHONE_NUMBER', 'URL']; // Valid CTA button types
 
// POST /:id/messages/reply - Reply to a specific message
router.post('/:id/messages/reply', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { text, replyToMessageId, type = 'text', mediaUrl, caption } = req.body;

    if (!text && !mediaUrl) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Message text or media is required'
      });
    }

    if (!replyToMessageId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'replyToMessageId is required for reply'
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

    if (conversation.status === 'blocked') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: ERROR_CODES.AUTHORIZATION_ERROR,
        message: 'Conversation is blocked. Unblock before sending.'
      });
    }

    if (conversation.status === 'closed') {
      conversation.status = 'active';
      await conversation.save();
    }

    const replyToMessage = conversation.messages.id(replyToMessageId);
    if (!replyToMessage || !replyToMessage.whatsappMessageId) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Message to reply to not found'
      });
    }

    const context = { message_id: replyToMessage.whatsappMessageId };
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
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
      logger.error('Failed to send reply message', {
        businessId: req.businessId?.toString(),
        conversationId: req.params.id,
        error: result.error
      });
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        error: ERROR_CODES.INTERNAL_ERROR,
        message: result.error || 'Failed to send reply message'
      });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'out',
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

    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('message:sent', {
        conversationId: conversation._id,
        message: savedMessage
      });
    }

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.CREATED).json({ 
      message: savedMessage,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Send reply message error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to send reply message'
    });
  }
});

// POST /:id/messages/reaction - Send reaction to message
router.post('/:id/messages/reaction', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { messageId, emoji } = req.body;

    if (!messageId || !emoji) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'messageId and emoji are required'
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

    const message = conversation.messages.id(messageId);
    if (!message || !message.whatsappMessageId) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Message not found'
      });
    }

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendReaction(
      conversation.contact.phoneNumber,
      message.whatsappMessageId,
      emoji
    );

    if (!result.success) {
      logger.error('Failed to send reaction', {
        businessId: req.businessId?.toString(),
        conversationId: req.params.id,
        error: result.error
      });
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        error: ERROR_CODES.INTERNAL_ERROR,
        message: result.error || 'Failed to send reaction'
      });
    }

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      message: 'Reaction sent successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Send reaction error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to send reaction'
    });
  }
});

// ❌ REMOVED: Message pinning routes - WhatsApp API does NOT support message pinning
// - POST /:id/messages/:messageId/pin
// - POST /:id/messages/:messageId/unpin
// - GET /:id/messages/pinned

// POST /:id/messages/button - Send button message
router.post('/:id/messages/button', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { bodyText, buttons } = req.body;

    if (!bodyText || !buttons || !Array.isArray(buttons)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'bodyText and buttons array are required'
      });
    }

    if (buttons.length < MIN_BUTTON_COUNT || buttons.length > MAX_BUTTON_COUNT) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Must have ${MIN_BUTTON_COUNT}-${MAX_BUTTON_COUNT} buttons`
      });
    }

    for (const btn of buttons) {
      if (!btn.title || btn.title.length > MAX_BUTTON_TITLE_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Button title is required and must be max ${MAX_BUTTON_TITLE_LENGTH} characters`
        });
      }
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

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendButtonMessage(
      conversation.contact.phoneNumber,
      bodyText,
      buttons
    );

    if (!result.success) {
      logger.error('Failed to send button message', {
        businessId: req.businessId?.toString(),
        conversationId: req.params.id,
        error: result.error
      });
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        error: ERROR_CODES.INTERNAL_ERROR,
        message: result.error || 'Failed to send button message'
      });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'out',
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

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.CREATED).json({ 
      message: savedMessage,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Send button message error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to send button message'
    });
  }
});

// POST /:id/messages/list - Send list message
router.post('/:id/messages/list', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { bodyText, buttonText, sections } = req.body;

    if (!bodyText || !buttonText || !sections) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'bodyText, buttonText, and sections are required'
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

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendListMessage(
      conversation.contact.phoneNumber,
      bodyText,
      buttonText,
      sections
    );

    if (!result.success) {
      logger.error('Failed to send list message', {
        businessId: req.businessId?.toString(),
        conversationId: req.params.id,
        error: result.error
      });
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        error: ERROR_CODES.INTERNAL_ERROR,
        message: result.error || 'Failed to send list message'
      });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'out',
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

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.CREATED).json({ 
      message: savedMessage,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Send list message error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to send list message'
    });
  }
});

// ❌ REMOVED: POST /:id/messages/poll - WhatsApp API does NOT support creating/sending polls
// Businesses can only receive poll responses from users, not create polls

// POST /:id/messages/cta - Send CTA message
router.post('/:id/messages/cta', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { bodyText, ctaButtons } = req.body;

    if (!bodyText || !ctaButtons || !Array.isArray(ctaButtons)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'bodyText and ctaButtons array are required'
      });
    }

    if (ctaButtons.length < MIN_CTA_BUTTONS || ctaButtons.length > MAX_CTA_BUTTONS) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Must have ${MIN_CTA_BUTTONS}-${MAX_CTA_BUTTONS} CTA buttons`
      });
    }

    for (const btn of ctaButtons) {
      if (!btn.type || !VALID_CTA_TYPES.includes(btn.type)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Button type must be one of: ${VALID_CTA_TYPES.join(', ')}`
        });
      }
      if (!btn.title || btn.title.length > MAX_BUTTON_TITLE_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Button title must be 1-${MAX_BUTTON_TITLE_LENGTH} characters`
        });
      }
      if (btn.type === 'PHONE_NUMBER' && !btn.phone_number) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'phone_number is required for PHONE_NUMBER button'
        });
      }
      if (btn.type === 'URL' && !btn.url) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'url is required for URL button'
        });
      }
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

    if (conversation.status === 'blocked') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: ERROR_CODES.AUTHORIZATION_ERROR,
        message: 'Cannot send messages to blocked conversation'
      });
    }

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendCTAMessage(
      conversation.contact.phoneNumber,
      bodyText,
      ctaButtons
    );

    if (!result.success) {
      logger.error('Failed to send CTA message', {
        businessId: req.businessId?.toString(),
        conversationId: req.params.id,
        error: result.error
      });
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        error: ERROR_CODES.INTERNAL_ERROR,
        message: result.error || 'Failed to send CTA message'
      });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'out',
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

    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('message:sent', {
        conversationId: conversation._id,
        message: savedMessage
      });
    }

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.CREATED).json({ 
      message: savedMessage,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Send CTA message error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to send CTA message'
    });
  }
});

module.exports = router;
