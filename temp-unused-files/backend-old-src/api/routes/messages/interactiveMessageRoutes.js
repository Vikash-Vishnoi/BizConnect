/**
 * Interactive Message Routes - Interactive message types (buttons, lists, polls, reactions, pins)
 * @module routes/inbox/interactiveMessageRoutes
 */

const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../../../api/middlewares/auth');
const Conversation = require('../../../database/models/Conversation');
const WhatsAppService = require('../../../services/whatsapp/whatsappService');
 
// POST /:id/messages/reply - Reply to a specific message
router.post('/:id/messages/reply', async (req, res) => {
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
      businessId: req.businessId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.status === 'blocked') {
      return res.status(403).json({ error: 'Conversation is blocked. Unblock before sending.' });
    }

    if (conversation.status === 'closed') {
      conversation.status = 'active';
      await conversation.save();
    }

    const replyToMessage = conversation.messages.id(replyToMessageId);
    if (!replyToMessage || !replyToMessage.whatsappMessageId) {
      return res.status(404).json({ error: 'Message to reply to not found' });
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
      return res.status(500).json({ error: result.error });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
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

// POST /:id/messages/reaction - Send reaction to message
router.post('/:id/messages/reaction', async (req, res) => {
  try {
    const { messageId, emoji } = req.body;

    if (!messageId || !emoji) {
      return res.status(400).json({ error: 'messageId and emoji required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = conversation.messages.id(messageId);
    if (!message || !message.whatsappMessageId) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
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

// ❌ REMOVED: Message pinning routes - WhatsApp API does NOT support message pinning
// - POST /:id/messages/:messageId/pin
// - POST /:id/messages/:messageId/unpin
// - GET /:id/messages/pinned

// POST /:id/messages/button - Send button message
router.post('/:id/messages/button', async (req, res) => {
  try {
    const { bodyText, buttons } = req.body;

    if (!bodyText || !buttons || !Array.isArray(buttons)) {
      return res.status(400).json({ error: 'bodyText and buttons array required' });
    }

    if (buttons.length === 0 || buttons.length > 3) {
      return res.status(400).json({ error: 'Must have 1-3 buttons' });
    }

    for (const btn of buttons) {
      if (!btn.title || btn.title.length > 20) {
        return res.status(400).json({ error: 'Button title required and must be max 20 characters' });
      }
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendButtonMessage(
      conversation.contact.phoneNumber,
      bodyText,
      buttons
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to send button message' });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
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

// POST /:id/messages/list - Send list message
router.post('/:id/messages/list', async (req, res) => {
  try {
    const { bodyText, buttonText, sections } = req.body;

    if (!bodyText || !buttonText || !sections) {
      return res.status(400).json({ error: 'bodyText, buttonText, and sections required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
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
      return res.status(500).json({ error: result.error });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
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

// ❌ REMOVED: POST /:id/messages/poll - WhatsApp API does NOT support creating/sending polls
// Businesses can only receive poll responses from users, not create polls

// POST /:id/messages/cta - Send CTA message
router.post('/:id/messages/cta', async (req, res) => {
  try {
    const { bodyText, ctaButtons } = req.body;

    if (!bodyText || !ctaButtons || !Array.isArray(ctaButtons)) {
      return res.status(400).json({ error: 'bodyText and ctaButtons array required' });
    }

    if (ctaButtons.length === 0 || ctaButtons.length > 2) {
      return res.status(400).json({ error: 'Must have 1-2 CTA buttons' });
    }

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
      businessId: req.businessId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.status === 'blocked') {
      return res.status(403).json({ error: 'Cannot send messages to blocked conversation' });
    }

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendCTAMessage(
      conversation.contact.phoneNumber,
      bodyText,
      ctaButtons
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to send CTA message' });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
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

module.exports = router;
