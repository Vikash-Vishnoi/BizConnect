/**
 * Message Handler - Process incoming WhatsApp messages from webhooks
 * Includes proper logging, Contact model integration, and comprehensive message type support
 * @module routes/webhooks/messageHandler
 */

const Conversation = require('../../../database/models/Conversation');
const Contact = require('../../../database/models/Contact');
const User = require('../../../database/models/User');
const { sendWelcomeMessage } = require('./welcomeHandler');
const { buildMessageContent, getMessagePreview } = require('./messageContentBuilder');
const logger = require('../../../utils/helpers/logger');
const {  
  sanitizeName, 
  sanitizeMessage, 
  sanitizeMessageContent,
  sanitizeWhatsAppMediaUrl 
} = require('../../../utils/helpers/sanitizer');

/**
 * Handle incoming WhatsApp message
 * @param {Object} message - WhatsApp message object from webhook
 * @param {Object} metadata - Webhook metadata (phone_number_id, etc.)
 * @param {Object} io - Socket.IO instance
 * @param {Object} business - Business model instance
 */
async function handleIncomingMessage(message, metadata, io, business) {
  const startTime = Date.now();
  const requestId = `msg_${message.id}`;
  
  try {
    const from = message.from;
    const messageId = message.id;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    logger.logWhatsAppAPI('POST', 'webhook/message', 200, {
      requestId,
      messageId,
      from,
      type: message.type,
      businessId: business._id.toString(),
      businessName: business.name
    });

    // Validate required fields
    if (!from || !messageId) {
      logger.error('Invalid message data in webhook', {
        requestId,
        businessId: business._id.toString(),
        hasFrom: !!from,
        hasMessageId: !!messageId
      });
      return;
    }

    // Normalize phone number
    const phoneNormalized = Conversation.normalizePhone(from);

    // Handle reactions separately (they update existing messages, don't create new ones)
    if (message.type === 'reaction') {
      await handleReaction(message, phoneNormalized, timestamp, io, business, requestId);
      return;
    }

    // Get or create conversation
    let conversation = await findOrCreateConversation(
      phoneNormalized,
      message,
      metadata,
      timestamp,
      business,
      io,
      requestId
    );

    if (!conversation) {
      logger.error('Failed to create/find conversation', { requestId, phoneNumber: phoneNormalized });
      return;
    }

    // Build message content using content builder
    const rawContent = buildMessageContent(message, message);
    const type = message.type;

    // Sanitize message content to prevent XSS
    const content = sanitizeMessageContent(rawContent);

    logger.info('Message content built and sanitized', {
      requestId,
      type,
      hasText: !!content.text,
      hasMedia: !!(content.mediaId || content.mediaUrl),
      sanitized: true
    });

    // Update 24-hour conversation window
    updateConversationWindow(conversation, timestamp);

    // Create new message object
    const newMessage = {
      whatsappMessageId: messageId,
      type: type,
      content: content,
      direction: 'incoming',
      status: 'received',
      timestamp: timestamp,
      requiresTemplate: false,
      windowStatus: 'WITHIN_24H'
    };

    // Add message to conversation
    conversation.messages.push(newMessage);
    conversation.unreadCount += 1;
    conversation.lastMessageAt = timestamp;
    conversation.lastMessage = content.text || `[${type}]`;

    // Update metrics
    conversation.metrics.totalMessages += 1;
    conversation.metrics.incomingMessages += 1;

    await conversation.save();

    logger.info('Message saved to conversation', {
      requestId,
      conversationId: conversation._id.toString(),
      messageType: type,
      messageCount: conversation.messages.length
    });

    // Update Contact last contacted time
    await updateContactTimestamp(phoneNormalized, business._id, timestamp);

    // Emit new message event
    emitMessageEvent(io, conversation, newMessage, requestId);

    // Handle opt-out detection for text messages
    if (type === 'text' && content.text) {
      await detectAndHandleOptOut(
        phoneNormalized,
        content.text,
        business,
        conversation,
        io,
        requestId
      );
    }

    // Trigger automation rules
    await processAutomationRules(conversation, newMessage, business, requestId);

    // Increment business usage counters
    await business.incrementUsage('messages', 1);

    // Log completion time
    const duration = Date.now() - startTime;
    logger.info('Message processing completed', {
      requestId,
      duration: `${duration}ms`,
      conversationId: conversation._id.toString(),
      messageId: newMessage._id?.toString()
    });

  } catch (error) {
    logger.error('Error handling incoming message', {
      requestId,
      error: error.message,
      stack: error.stack,
      messageId: message?.id,
      businessId: business?._id?.toString()
    });
    throw error;
  }
}

/**
 * Find existing conversation or create new one
 */
async function findOrCreateConversation(
  phoneNormalized,
  message,
  metadata,
  timestamp,
  business,
  io,
  requestId
) {
  try {
    let conversation = await Conversation.findOne({
      'contact.phoneNumber': phoneNormalized,
      businessId: business._id
    });

    if (conversation) {
      logger.debug('Found existing conversation', {
        requestId,
        conversationId: conversation._id.toString()
      });
      return conversation;
    }

    // Create new conversation
    logger.info('Creating new conversation', {
      requestId,
      phoneNumber: phoneNormalized,
      businessId: business._id.toString()
    });

    // Find user to assign conversation to
    const assignedUser = await findUserForAssignment(business);

    if (!assignedUser) {
      logger.error('No user found to assign conversation', {
        requestId,
        businessId: business._id.toString()
      });
      return null;
    }

    // Create or update Contact entry
    let contact = await Contact.findOne({
      businessId: business._id,
      phoneNumber: phoneNormalized
    });

    const rawContactName = message.profile?.name || metadata?.profile_name || phoneNormalized;
    // Sanitize contact name to prevent XSS
    const contactName = sanitizeName(rawContactName);

    if (!contact) {
      contact = await Contact.create({
        businessId: business._id,
        phoneNumber: phoneNormalized,
        name: contactName,
        source: 'webhook',
        isOptedIn: true, // Incoming message implies opt-in
        optInDate: timestamp,
        lastContactedAt: timestamp,
        tags: ['webhook-contact'],
        customFields: {
          firstMessageType: message.type,
          firstMessageTimestamp: timestamp
        }
      });

      logger.info('Created new contact (sanitized)', {
        requestId,
        contactId: contact._id.toString(),
        phoneNumber: phoneNormalized,
        sanitized: true
      });
    } else {
      // Update existing contact
      if (contact.name !== contactName && contactName !== phoneNormalized) {
        contact.name = contactName;
      }
      contact.lastContactedAt = timestamp;
      if (!contact.isOptedIn) {
        contact.isOptedIn = true;
        contact.optInDate = timestamp;
      }
      await contact.save();
    }

    // Create conversation
    conversation = await Conversation.create({
      businessId: business._id,
      userId: assignedUser._id,
      contact: {
        phoneNumber: phoneNormalized,
        name: contact.name || contactName
      },
      status: 'active',
      unreadCount: 0,
      source: 'webhook',
      metrics: {
        totalMessages: 0,
        incomingMessages: 0,
        outgoingMessages: 0
      }
    });

    logger.info('Conversation created', {
      requestId,
      conversationId: conversation._id.toString(),
      assignedUserId: assignedUser._id.toString()
    });

    // Emit new conversation event
    io.to(`user:${assignedUser._id}`).emit('conversation:new', {
      conversation
    });

    // Send welcome message if enabled
    if (business.settings?.welcomeMessage?.enabled) {
      try {
        logger.info('Sending welcome message', {
          requestId,
          conversationId: conversation._id.toString()
        });
        await sendWelcomeMessage(conversation, business, io);
      } catch (welcomeError) {
        logger.error('Failed to send welcome message', {
          requestId,
          error: welcomeError.message,
          conversationId: conversation._id.toString()
        });
      }
    }

    // Increment business usage
    await business.incrementUsage('conversations', 1);

    return conversation;
  } catch (error) {
    logger.error('Error in findOrCreateConversation', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Find appropriate user to assign conversation to
 */
async function findUserForAssignment(business) {
  try {
    // Try business owner first
    let user = await User.findById(business.owner);
    if (user) return user;

    // Try team members
    if (business.team && business.team.length > 0) {
      const teamMember = business.team.find(t => 
        ['admin', 'agent', 'manager'].includes(t.role)
      );
      if (teamMember) {
        user = await User.findById(teamMember.user);
        if (user) return user;
      }
    }

    // Last resort: any admin
    user = await User.findOne({ userType: 'business_admin' });
    return user;
  } catch (error) {
    logger.error('Error finding user for assignment', {
      error: error.message,
      businessId: business._id.toString()
    });
    return null;
  }
}

/**
 * Handle message reaction
 */
async function handleReaction(message, phoneNormalized, timestamp, io, business, requestId) {
  try {
    logger.info('Processing reaction', {
      requestId,
      targetMessageId: message.reaction.message_id,
      emoji: message.reaction.emoji,
      from: phoneNormalized
    });

    const conversation = await Conversation.findOne({
      'contact.phoneNumber': phoneNormalized,
      businessId: business._id
    });

    if (!conversation) {
      logger.warn('Conversation not found for reaction', {
        requestId,
        phoneNumber: phoneNormalized
      });
      return;
    }

    const originalMessage = conversation.messages.find(
      m => m.whatsappMessageId === message.reaction.message_id
    );

    if (!originalMessage) {
      logger.warn('Original message not found for reaction', {
        requestId,
        targetMessageId: message.reaction.message_id
      });
      return;
    }

    if (!originalMessage.reactions) {
      originalMessage.reactions = [];
    }

    // Remove existing reaction from this sender
    originalMessage.reactions = originalMessage.reactions.filter(
      r => r.from !== phoneNormalized
    );

    // Add new reaction if emoji is provided
    if (message.reaction.emoji && message.reaction.emoji.trim() !== '') {
      originalMessage.reactions.push({
        from: phoneNormalized,
        emoji: message.reaction.emoji,
        timestamp: timestamp
      });
    }

    await conversation.save();

    logger.info('Reaction processed', {
      requestId,
      messageId: originalMessage._id?.toString(),
      reactionsCount: originalMessage.reactions.length
    });

    // Emit reaction event
    io.to(`user:${conversation.userId}`).emit('message:reacted', {
      conversationId: conversation._id,
      messageId: originalMessage._id,
      whatsappMessageId: originalMessage.whatsappMessageId,
      reactions: originalMessage.reactions
    });
  } catch (error) {
    logger.error('Error handling reaction', {
      requestId,
      error: error.message
    });
  }
}

/**
 * Update conversation 24-hour window
 */
function updateConversationWindow(conversation, timestamp) {
  const windowHours = parseInt(process.env.CONVERSATION_WINDOW_HOURS || '24');
  conversation.window = conversation.window || {};
  conversation.window.isOpen = true;
  conversation.window.lastInboundAt = timestamp;
  conversation.window.expiresAt = new Date(timestamp.getTime() + windowHours * 60 * 60 * 1000);
}

/**
 * Update contact last contacted timestamp
 */
async function updateContactTimestamp(phoneNumber, businessId, timestamp) {
  try {
    await Contact.updateOne(
      { businessId, phoneNumber },
      { 
        $set: { lastContactedAt: timestamp },
        $setOnInsert: { createdAt: timestamp }
      },
      { upsert: true }
    );
  } catch (error) {
    logger.error('Error updating contact timestamp', {
      error: error.message,
      phoneNumber,
      businessId: businessId.toString()
    });
  }
}

/**
 * Emit message event to connected clients
 */
function emitMessageEvent(io, conversation, newMessage, requestId) {
  try {
    io.to(`user:${conversation.userId}`).emit('message:new', {
      conversationId: conversation._id,
      message: newMessage,
      contact: conversation.contact
    });

    logger.debug('Message event emitted', {
      requestId,
      userId: conversation.userId.toString(),
      event: 'message:new'
    });
  } catch (error) {
    logger.error('Error emitting message event', {
      requestId,
      error: error.message
    });
  }
}

/**
 * Detect and handle opt-out keywords
 */
async function detectAndHandleOptOut(
  phoneNumber,
  messageText,
  business,
  conversation,
  io,
  requestId
) {
  try {
    // Default opt-out keywords (case-insensitive)
    const DEFAULT_OPT_OUT_KEYWORDS = [
      'STOP', 'UNSUBSCRIBE', 'REMOVE', 'OPT OUT', 'OPTOUT', 'CANCEL', 'END', 'QUIT'
    ];

    // Get opt-out keywords from business config or use defaults
    const keywords = business.whatsappConfig?.optOutKeywords || DEFAULT_OPT_OUT_KEYWORDS;
    const autoHandle = business.whatsappConfig?.autoHandleOptOut !== false;

    // Normalize message
    const normalizedMessage = messageText.trim().toUpperCase();

    // Check if message contains any opt-out keyword
    const detectedKeyword = keywords.find(keyword => {
      const normalizedKeyword = keyword.toUpperCase();
      return normalizedMessage === normalizedKeyword || 
             normalizedMessage.split(/\s+/).includes(normalizedKeyword);
    });

    if (detectedKeyword && autoHandle) {
      logger.info('Opt-out detected', {
        requestId,
        phoneNumber,
        keyword: detectedKeyword
      });

      // Update contact to opted-out status
      const contact = await Contact.findOne({
        businessId: business._id,
        phoneNumber
      });

      if (contact) {
        contact.isOptedIn = false;
        contact.optedOutAt = new Date();
        contact.optedOutReason = 'user_request';
        contact.metadata = contact.metadata || {};
        contact.metadata.optOutKeyword = detectedKeyword;
        
        // Add opted-out tag
        contact.tags = contact.tags || [];
        if (!contact.tags.includes('opted-out')) {
          contact.tags.push('opted-out');
        }

        await contact.save();

        io.to(`user:${conversation.userId}`).emit('contact:opted-out', {
          conversationId: conversation._id,
          phoneNumber,
          keyword: detectedKeyword,
          autoRevoked: true,
          timestamp: new Date()
        });
      }
    }
  } catch (error) {
    logger.error('Error detecting opt-out', {
      requestId,
      error: error.message
    });
  }
}

async function processAutomationRules(conversation, message, business, requestId) {
  try {
    logger.debug('Automation rules disabled - AutomationService deleted (depends on non-existent models)', {
      requestId,
      conversationId: conversation._id.toString()
    });
  } catch (error) {
    logger.error('Error processing automation rules', {
      requestId,
      error: error.message,
      conversationId: conversation._id.toString()
    });
  }
}

module.exports = {
  handleIncomingMessage
};
