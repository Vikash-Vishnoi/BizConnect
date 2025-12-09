/**
 * Message Routes - Basic message sending and retrieval
 * @module routes/inbox/messageRoutes
 */

const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../../../core/middlewares/auth');
const Conversation = require('../../../core/database/models/Conversation');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
 
// GET /:id/messages - Get conversation messages (WhatsApp-style pagination)
router.get('/:id/messages', async (req, res) => {
  try {
    const defaultLimit = parseInt(process.env.MESSAGES_DEFAULT_LIMIT || '50');
    const maxLimit = parseInt(process.env.MESSAGES_MAX_LIMIT || '200');
    const { page = 1, limit = defaultLimit } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), maxLimit);
    
    // Use lean() for better performance and select only needed fields
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      isDeleted: false
    })
    .select('messages campaignId contact.phoneNumber')
    .lean();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get regular messages (filter out deleted messages)
    const regularMessages = (conversation.messages || []).filter(msg => !msg.isDeleted);
    let campaignMessages = [];
    
    // Load campaign message if exists
    if (conversation.campaignId) {
      try {
        const Campaign = require('../../../core/database/models/Campaign');
        const campaign = await Campaign.findById(conversation.campaignId)
          .select('recipients name')
          .lean();
        
        if (campaign) {
          const recipient = campaign.recipients.find(r => 
            r.conversationId && r.conversationId.toString() === conversation._id.toString()
          );

          if (recipient && recipient.messageContent) {
            campaignMessages.push({
              _id: `campaign_${campaign._id}_${recipient.phoneNumber}`,
              whatsappMessageId: recipient.whatsappMessageId,
              from: 'system',
              to: recipient.phoneNumber,
              direction: 'outgoing',
              type: recipient.messageContent.templateName ? 'template' : 'text',
              content: {
                text: recipient.messageContent.text,
                templateName: recipient.messageContent.templateName
              },
              status: recipient.status,
              timestamp: recipient.sentAt,
              isCampaignMessage: true,
              campaignId: campaign._id,
              campaignName: campaign.name
            });
          }
        }
      } catch (campaignError) {
        console.warn('Campaign load error:', campaignError.message);
      }
    }

    // Merge and sort all messages (oldest first - WhatsApp style)
    const allMessages = [...regularMessages, ...campaignMessages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const totalMessages = allMessages.length;
    
    // WhatsApp-style pagination: load from the END (latest messages)
    // Page 1 = latest messages, Page 2 = older messages, etc.
    const endIndex = totalMessages - ((pageNum - 1) * limitNum);
    const startIndex = Math.max(0, endIndex - limitNum);
    const messages = allMessages.slice(startIndex, endIndex);

    // Calculate if there are older messages available
    const hasMore = startIndex > 0;
    const totalPages = Math.ceil(totalMessages / limitNum);

    res.json({
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMessages,
        totalPages,
        hasMore,
        startIndex,
        endIndex,
        // Additional metadata for client
        oldestMessageTimestamp: messages[0]?.timestamp || null,
        newestMessageTimestamp: messages[messages.length - 1]?.timestamp || null
      },
      hasCampaignMessages: campaignMessages.length > 0
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /:id/messages - Send text message
router.post('/:id/messages', async (req, res) => {
  try {
    const { text, type = 'text', mediaUrl, caption } = req.body;

    if (!text && !mediaUrl) {
      return res.status(400).json({ error: 'Message text or media required' });
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

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
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
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /:id/messages/audio - Send audio message
router.post('/:id/messages/audio', async (req, res) => {
  try {
    const { audioUrl, replyToMessageId } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: 'audioUrl required' });
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

    if (conversation.status === 'archived' || conversation.status === 'closed') {
      conversation.status = 'active';
      await conversation.save();
    }

    let context = null;
    if (replyToMessageId) {
      const replyToMessage = conversation.messages.id(replyToMessageId);
      if (replyToMessage && replyToMessage.whatsappMessageId) {
        context = { message_id: replyToMessage.whatsappMessageId };
      }
    }

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendAudioMessage(
      conversation.contact.phoneNumber,
      audioUrl,
      context
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type: 'audio',
      content: {
        mediaUrl: audioUrl
      },
      status: 'sent',
      timestamp: new Date()
    };

    if (replyToMessageId) {
      messageData.context = {
        messageId: replyToMessageId
      };
    }

    const savedMessage = await conversation.addMessage(messageData);

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

// ❌ REMOVED: POST /:id/messages/sticker - WhatsApp API can RECEIVE stickers but cannot SEND custom ones

// POST /:id/messages/contact - Send contact card message
router.post('/:id/messages/contact', async (req, res) => {
  try {
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'contacts array is required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    for (const contact of contacts) {
      if (!contact.name || !contact.name.formatted_name) {
        return res.status(400).json({ error: 'Each contact must have name.formatted_name' });
      }
      if (!contact.phones || !Array.isArray(contact.phones) || contact.phones.length === 0) {
        return res.status(400).json({ error: 'Each contact must have at least one phone number' });
      }
    }

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendContactMessage(
      conversation.contact.phoneNumber,
      contacts
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
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

module.exports = router;
