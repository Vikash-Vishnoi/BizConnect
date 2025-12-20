/**
 * Message Routes - Basic message sending and retrieval
 * @module routes/inbox/messageRoutes
 */

const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness, requirePermission } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { NotFoundError, ValidationError, ConflictError } = require('../../../core/middlewares/errorHandler');
const { findByIdSafe } = require('../../../common/utils/dbHelpers');
const Conversation = require('../../../core/database/models/Conversation');
const Business = require('../../../core/database/models/Business');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// Constants for message operations
const DEFAULT_MESSAGES_LIMIT = 50; // Default limit for messages per page
const MAX_MESSAGES_LIMIT = 200; // Maximum limit for messages per page
const DEFAULT_PAGE = 1; // Default page number
const CONVERSATION_STATUS_BLOCKED = 'blocked'; // Blocked conversation status
const CONVERSATION_STATUS_ARCHIVED = 'archived'; // Archived conversation status
const CONVERSATION_STATUS_CLOSED = 'closed'; // Closed conversation status
const CONVERSATION_STATUS_ACTIVE = 'active'; // Active conversation status
const MESSAGE_DIRECTION_OUTGOING = 'out'; // Outgoing message direction (stored as 'out' in DB)
const MESSAGE_STATUS_SENT = 'sent'; // Sent message status
const MESSAGE_TYPE_TEXT = 'text'; // Text message type
const MESSAGE_TYPE_TEMPLATE = 'template'; // Template message type
const MESSAGE_TYPE_AUDIO = 'audio'; // Audio message type
const MESSAGE_TYPE_CONTACTS = 'contacts'; // Contacts message type
const MESSAGE_FROM_SYSTEM = 'system'; // System sender identifier
const HTTP_STATUS_CREATED = 201; // HTTP 201 Created status
const CAMPAIGN_MESSAGE_PREFIX = 'campaign_'; // Prefix for campaign message IDs
 
// GET /:id/messages - Get conversation messages (WhatsApp-style pagination)
router.get('/:id/messages', auth, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_MESSAGES_LIMIT } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), MAX_MESSAGES_LIMIT);
    
    // Use lean() for better performance and select only needed fields
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    })
    .select('messages campaignId contact.phoneNumber')
    .lean();

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // Get regular messages (filter out deleted messages)
    const regularMessages = (conversation.messages || []).filter(msg => !msg.isDeleted);
    let campaignMessages = [];
    
    // Load campaign message if exists (skip for performance if too many recipients)
    if (conversation.campaignId) {
      try {
        const Campaign = require('../../../core/database/models/Campaign');
        // Only get the specific recipient instead of all recipients
        const campaign = await Campaign.findOne(
          { 
            _id: conversation.campaignId,
            'recipients.conversationId': conversation._id
          },
          { 
            'recipients.$': 1,  // Only get the matching recipient
            name: 1
          }
        ).lean();
        
        if (campaign && campaign.recipients && campaign.recipients[0]) {
          const recipient = campaign.recipients[0];
          
          if (recipient.messageContent) {
            campaignMessages.push({
              _id: `${CAMPAIGN_MESSAGE_PREFIX}${campaign._id}_${recipient.phoneNumber}`,
              whatsappMessageId: recipient.whatsappMessageId,
              from: MESSAGE_FROM_SYSTEM,
              to: recipient.phoneNumber,
              direction: MESSAGE_DIRECTION_OUTGOING,
              type: recipient.messageContent.templateName ? MESSAGE_TYPE_TEMPLATE : MESSAGE_TYPE_TEXT,
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
        // Just log and continue - don't let campaign errors block message loading
        logger.warn('Campaign load error for conversation', {
          conversationId: conversation._id,
          campaignId: conversation.campaignId,
          error: campaignError.message,
          businessId: req.businessId.toString()
        });
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
    const paginatedMessages = allMessages.slice(startIndex, endIndex);

    // Transform messages for frontend (map 'in'/'out' to 'incoming'/'outgoing')
    const messages = paginatedMessages.map(msg => ({
      ...msg,
      direction: msg.direction === 'out' ? 'outgoing' : 'incoming'
    }));

    // Calculate if there are older messages available
    const hasMore = startIndex > 0;
    const totalPages = Math.ceil(totalMessages / limitNum);

    const processingTime = Date.now() - startTime;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
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
      },
      message: 'Messages retrieved successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error retrieving messages', {
      error: error.message,
      conversationId: req.params.id,
      businessId: req.businessId?.toString(),
      processingTime
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
      processingTime
    });
  }
});

// POST /:id/messages - Send text message
router.post('/:id/messages', auth, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { text, type = MESSAGE_TYPE_TEXT, mediaUrl, caption } = req.body;

    if (!text && !mediaUrl) {
      throw new ValidationError('Message text or media required');
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (conversation.status === CONVERSATION_STATUS_BLOCKED) {
      throw new ConflictError('Conversation is blocked. Unblock before sending.');
    }

    if (conversation.status === CONVERSATION_STATUS_ARCHIVED || conversation.status === CONVERSATION_STATUS_CLOSED) {
      conversation.status = CONVERSATION_STATUS_ACTIVE;
      await conversation.save();
      if (req.app.get('io')) {
        req.app.get('io').to(`user:${req.userId}`).emit('conversation:statusChanged', {
          conversationId: conversation._id,
          status: CONVERSATION_STATUS_ACTIVE,
          previousStatus: req.body.previousStatus || 'unknown'
        });
      }
    }

    logger.info('Fetching business for message sending', {
      businessId: req.businessId?.toString(),
      conversationBusinessId: conversation.businessId?.toString()
    });

    const business = await Business.findById(req.businessId);
    if (!business) {
      logger.error('Business not found', {
        requestBusinessId: req.businessId?.toString(),
        conversationBusinessId: conversation.businessId?.toString()
      });
      throw new NotFoundError('Business not found');
    }

    logger.info('Fetching WhatsApp credentials', {
      businessId: business._id.toString(),
      hasWhatsAppConfig: !!business.whatsappConfig
    });

    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    let result;
    if (type === MESSAGE_TYPE_TEXT) {
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
      throw new Error(result.error);
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || MESSAGE_FROM_SYSTEM,
      to: conversation.contact.phoneNumber,
      direction: MESSAGE_DIRECTION_OUTGOING,
      type,
      content: {
        text: text || caption,
        mediaUrl,
        caption
      },
      status: MESSAGE_STATUS_SENT,
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

    res.status(HTTP_STATUS_CREATED).json({ 
      success: true,
      data: { message: savedMessage },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error sending message', {
      error: error.message,
      conversationId: req.params.id,
      businessId: req.businessId?.toString(),
      processingTime
    });
    
    if (error instanceof NotFoundError) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof ConflictError) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: ERROR_CODES.CONFLICT_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
      processingTime
    });
  }
});

// POST /:id/messages/audio - Send audio message
router.post('/:id/messages/audio', auth, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { audioUrl, replyToMessageId } = req.body;

    if (!audioUrl) {
      throw new ValidationError('audioUrl required');
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (conversation.status === CONVERSATION_STATUS_BLOCKED) {
      throw new ConflictError('Conversation is blocked. Unblock before sending.');
    }

    if (conversation.status === CONVERSATION_STATUS_ARCHIVED || conversation.status === CONVERSATION_STATUS_CLOSED) {
      conversation.status = CONVERSATION_STATUS_ACTIVE;
      await conversation.save();
    }

    let context = null;
    if (replyToMessageId) {
      const replyToMessage = conversation.messages.id(replyToMessageId);
      if (replyToMessage && replyToMessage.whatsappMessageId) {
        context = { message_id: replyToMessage.whatsappMessageId };
      }
    }

    const business = await Business.findById(req.businessId);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendAudioMessage(
      conversation.contact.phoneNumber,
      audioUrl,
      context
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || MESSAGE_FROM_SYSTEM,
      to: conversation.contact.phoneNumber,
      direction: MESSAGE_DIRECTION_OUTGOING,
      type: MESSAGE_TYPE_AUDIO,
      content: {
        mediaUrl: audioUrl
      },
      status: MESSAGE_STATUS_SENT,
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

    const processingTime = Date.now() - startTime;

    res.status(HTTP_STATUS_CREATED).json({ 
      success: true,
      data: { message: savedMessage },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error sending audio message', {
      error: error.message,
      conversationId: req.params.id,
      businessId: req.businessId?.toString(),
      processingTime
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
      processingTime
    });
  }
});

// ❌ REMOVED: POST /:id/messages/sticker - WhatsApp API can RECEIVE stickers but cannot SEND custom ones

// POST /:id/messages/contact - Send contact card message
router.post('/:id/messages/contact', auth, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      throw new ValidationError('contacts array is required');
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    for (const contact of contacts) {
      if (!contact.name || !contact.name.formatted_name) {
        throw new ValidationError('Each contact must have name.formatted_name');
      }
      if (!contact.phones || !Array.isArray(contact.phones) || contact.phones.length === 0) {
        throw new ValidationError('Each contact must have at least one phone number');
      }
    }

    const business = await Business.findById(req.businessId);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendContactMessage(
      conversation.contact.phoneNumber,
      contacts
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || MESSAGE_FROM_SYSTEM,
      to: conversation.contact.phoneNumber,
      direction: MESSAGE_DIRECTION_OUTGOING,
      type: MESSAGE_TYPE_CONTACTS,
      content: {
        contacts: contacts
      },
      status: MESSAGE_STATUS_SENT,
      timestamp: new Date()
    };

    const savedMessage = await conversation.addMessage(messageData);

    if (req.app.get('io')) {
      req.app.get('io').to(`user:${req.userId}`).emit('message:sent', {
        conversationId: conversation._id.toString(),
        message: savedMessage
      });
    }

    const processingTime = Date.now() - startTime;

    res.status(HTTP_STATUS_CREATED).json({ 
      success: true,
      data: { message: savedMessage },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error sending contact message', {
      error: error.message,
      conversationId: req.params.id,
      businessId: req.businessId?.toString(),
      processingTime
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
      processingTime
    });
  }
});

module.exports = router;
