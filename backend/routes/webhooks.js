const express = require('express');
const router = express.Router();
// ✅ REMOVED: Message model no longer exists - using Conversation.messages
const Conversation = require('../models/Conversation');
const Template = require('../models/Template');
const Campaign = require('../models/Campaign');
const TemplateAnalytics = require('../models/TemplateAnalytics');
const Flow = require('../models/Flow');
const FlowResponse = require('../models/FlowResponse');
const Channel = require('../models/Channel');
const ChannelMessage = require('../models/ChannelMessage');
const AlertLog = require('../models/AlertLog');
const automationService = require('../services/automationService');

// @route   GET /api/webhooks/whatsapp
// @desc    Webhook verification (WhatsApp requires this)
// @access  Public
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log('✅ Webhook verified');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// @route   POST /api/webhooks/whatsapp
// @desc    Receive WhatsApp webhook events
// @access  Public
router.post('/whatsapp', async (req, res) => {
  try {
    // ✅ ADDED: Webhook signature verification for security
    const signature = req.headers['x-hub-signature-256'];
    
    if (signature && process.env.WHATSAPP_APP_SECRET) {
      const crypto = require('crypto');
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('❌ Webhook signature verification failed');
        return res.sendStatus(403);
      }
    }

    // Always respond with 200 OK quickly (after verification)
    res.sendStatus(200);

    const body = req.body;

    // Check if this is a WhatsApp message webhook
    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const io = req.app.get('io');

    // Process each entry
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        // Handle incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            await handleIncomingMessage(message, value.metadata, io);
          }
        }

        // Handle message status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await handleMessageStatus(status, io);
          }
        }

        // Handle template status updates
        if (value.message_template_status_update) {
          await handleTemplateStatusUpdate(value.message_template_status_update, io);
        }

        // ✅ FEATURE: Account Alerts - Handle account quality/status updates
        if (change.field === 'phone_number_quality_update' || 
            change.field === 'account_update' ||
            change.field === 'account_alerts') {
          await handleAccountAlert(change, value, io);
        }

        // ✅ FEATURE: Contact Updates - Handle contact profile changes
        if (change.field === 'contacts') {
          await handleContactUpdate(change, value, io);
        }

        // ✅ FEATURE 32: Flow Responses - Handle WhatsApp Flow responses
        if (value.messages) {
          for (const message of value.messages) {
            if (message.type === 'interactive' && message.interactive?.type === 'nfm_reply') {
              await handleFlowResponse(message, value.metadata, io);
            }
          }
        }

        // ✅ FEATURE 33: Channel Events - Handle channel-related events
        if (change.field === 'channel_messages') {
          await handleChannelEvent(value, io);
        }

        // ✅ FEATURE 35: Enhanced Webhook Events
        // Phone number name update
        if (change.field === 'phone_number_name_update') {
          await handlePhoneNameUpdate(value, io);
        }

        // Template limit update
        if (change.field === 'template_category_limit_update') {
          await handleTemplateLimitUpdate(value, io);
        }

        // Security notifications
        if (change.field === 'security' || value.event === 'DISABLED' || value.event === 'VERIFIED') {
          await handleSecurityEvent(value, io);
        }
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Don't send error response as we already sent 200 OK
  }
});

// Handle incoming messages
async function handleIncomingMessage(message, metadata, io) {
  try {
    const from = message.from;
    const messageId = message.id;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    // Normalize phone number
    const phoneNormalized = Conversation.normalizePhone(from);

    // Get or create conversation
    let conversation = await Conversation.findOne({
      'contact.phoneNumber': phoneNormalized
    });

    if (!conversation) {
      // Create new conversation (assign to first admin user)
      const User = require('../models/User');
      let firstUser = await User.findOne({ role: 'admin' });
      
      // Fallback to any user if no admin found
      if (!firstUser) {
        firstUser = await User.findOne();
      }
      
      if (!firstUser) {
        console.error('❌ No user found to assign conversation');
        return;
      }

      console.log(`✅ Creating new conversation for ${from}, assigning to user: ${firstUser._id}`);

      conversation = await Conversation.create({
        userId: firstUser._id,
        contact: {
          phoneNumber: phoneNormalized,
          name: message.profile?.name || from
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

      console.log(`📡 Emitting conversation:new to user:${firstUser._id}`);
      
      // Emit new conversation event
      io.to(`user:${firstUser._id}`).emit('conversation:new', {
        conversation
      });

      // 🎉 NEW: Send automatic welcome message for first-time contacts
      try {
        console.log(`🤖 Sending welcome message to new contact: ${from}`);
        await sendWelcomeMessage(conversation, firstUser._id, io);
      } catch (welcomeError) {
        console.error('❌ Failed to send welcome message:', welcomeError);
        // Don't block the webhook if welcome message fails
      }
    }

    // Determine message type and content
    let type = 'text';
    let content = {
      text: ''
    };

    if (message.type === 'text') {
      type = 'text';
      content.text = message.text.body;
    } else if (message.type === 'reaction') {
      // Handle emoji reactions - ALWAYS return, never create a message
      console.log(`👍 Reaction webhook received on message: ${message.reaction.message_id}`);
      console.log(`   Emoji: "${message.reaction.emoji}" (empty = removed)`);
      
      // Find the message being reacted to
      const originalMessage = conversation.messages.find(
        m => m.whatsappMessageId === message.reaction.message_id
      );
      
      if (!originalMessage) {
        console.log(`⚠️ Original message not found for reaction: ${message.reaction.message_id}`);
        console.log(`   This might be a campaign message or very old message`);
        return; // STOP - don't create a message for reactions
      }
      
      // Initialize reactions array if it doesn't exist
      if (!originalMessage.reactions) {
        originalMessage.reactions = [];
      }
      
      // Remove existing reaction from this user (if any)
      const previousReaction = originalMessage.reactions.find(r => r.from === from);
      originalMessage.reactions = originalMessage.reactions.filter(
        r => r.from !== from
      );
      
      // Add new reaction only if emoji is not empty
      if (message.reaction.emoji && message.reaction.emoji.trim() !== '') {
        originalMessage.reactions.push({
          from: from,
          emoji: message.reaction.emoji,
          timestamp: timestamp
        });
        console.log(`✅ Added reaction: ${message.reaction.emoji}`);
      } else {
        console.log(`✅ Removed reaction from user ${from}`);
      }
      
      await conversation.save();
      
      // Emit reaction update event with full context
      io.to(`user:${conversation.userId}`).emit('message:reacted', {
        conversationId: conversation._id.toString(),
        messageId: originalMessage._id.toString(),
        whatsappMessageId: message.reaction.message_id,
        from: from,
        emoji: message.reaction.emoji || '', // Empty string for removed reactions
        timestamp: timestamp.toISOString(),
        // Add context about the message being reacted to
        reactedToMessage: {
          _id: originalMessage._id.toString(),
          text: originalMessage.content?.text || `[${originalMessage.type}]`,
          type: originalMessage.type,
          direction: originalMessage.direction,
          timestamp: originalMessage.timestamp
        }
      });
      
      console.log(`📡 Reaction event emitted to user:${conversation.userId}`);
      console.log(`   Reacted to message: ${originalMessage.content?.text?.substring(0, 50) || originalMessage.type}`);
      return; // CRITICAL: Always return for reactions, never create a message
    } else if (message.type === 'image') {
      type = 'image';
      content.mediaUrl = message.image.id;
      content.caption = message.image.caption || null;
    } else if (message.type === 'video') {
      type = 'video';
      content.mediaUrl = message.video.id;
      content.caption = message.video.caption || null;
    } else if (message.type === 'document') {
      type = 'document';
      content.mediaUrl = message.document.id;
      content.filename = message.document.filename || null;
    } else if (message.type === 'audio') {
      type = 'audio';
      content.mediaUrl = message.audio.id;
    } else if (message.type === 'location') {
      type = 'location';
      content.location = {
        latitude: message.location.latitude,
        longitude: message.location.longitude,
        name: message.location.name,
        address: message.location.address
      };
    } else if (message.type === 'contacts') {
      type = 'contacts';
      content.contacts = message.contacts;
      console.log('📇 Contact card received:', JSON.stringify(message.contacts, null, 2));
    }

    // ✅ Ensure conversation is active on new incoming message (auto-reopen)
    // Reopen only if previously closed or archived. Do NOT reopen if blocked.
    if (conversation.status === 'closed' || conversation.status === 'archived') {
      const previousStatus = conversation.status;
      conversation.status = 'active';
      await conversation.save();

      if (io) {
        io.to(`user:${conversation.userId}`).emit('conversation:statusChanged', {
          conversationId: conversation._id.toString(),
          status: 'active',
          previousStatus,
        });
      }
    }

    // ✅ FIXED: Add message to conversation (embedded, not separate model)
    const newMessage = await conversation.addMessage({
      whatsappMessageId: messageId,
      from: from,
      to: metadata.phone_number_id,
      direction: 'incoming',
      type,
      content,
      status: 'delivered',
      timestamp
    });
    
    // ✅ Message already added and conversation saved by addMessage() method
    // (includes unread count increment and metrics update)

    console.log(`📡 Emitting message:received to user:${conversation.userId}`);
    console.log(`   Conversation ID: ${conversation._id}`);
    console.log(`   Message ID: ${newMessage._id}`);
    console.log(`   Message content: ${content.text?.substring(0, 50)}`);
    console.log(`   Room name: user:${conversation.userId}`);

    // Emit message received event with correct format
    io.to(`user:${conversation.userId}`).emit('message:received', {
      messageId: newMessage._id.toString(),
      conversationId: conversation._id.toString(),
      from: from,
      text: content.text || `[${type}]`,
      timestamp: timestamp.toISOString(),
      hasMedia: type !== 'text',
      type: type,
      message: newMessage // Also include full message object for flexibility
    });

    console.log(`✅ Incoming message processed and emitted: ${messageId}`);
    
    // ✅ FEATURE: Template Analytics - Track reply if recent outgoing template message
    setImmediate(async () => {
      try {
        // Find most recent outgoing template message (within last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentTemplateMessage = conversation.messages
          .filter(m => 
            m.direction === 'outgoing' && 
            m.type === 'template' && 
            m.timestamp >= oneDayAgo &&
            m._id.toString() !== newMessage._id.toString()
          )
          .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (recentTemplateMessage && recentTemplateMessage.templateId) {
          // Track reply for template
          const analytics = await TemplateAnalytics.getOrCreateAnalytics(
            conversation.userId,
            recentTemplateMessage.templateId,
            recentTemplateMessage.templateName || 'Unknown Template'
          );
          
          await analytics.updateMetrics({ replied: 1 });
          console.log(`✅ Template reply tracked: ${recentTemplateMessage.templateName}`);
        }
      } catch (error) {
        console.error('Error tracking template reply:', error);
      }
    });
    
    // 🤖 Trigger automation rules
    setImmediate(async () => {
      try {
        // Check for new conversation trigger
        if (conversation.messages.length === 1) {
          await automationService.processTrigger(conversation.userId, 'new_conversation', {
            conversationId: conversation._id,
            contactPhone: from,
            triggerData: { messageId: newMessage._id, isFirstMessage: true }
          });
        }
        
        // Check for keyword triggers
        if (type === 'text' && content.text) {
          await automationService.processTrigger(conversation.userId, 'keyword', {
            conversationId: conversation._id,
            contactPhone: from,
            message: newMessage,
            triggerData: { messageId: newMessage._id, text: content.text }
          });
        }
        
        // Check for general message_received trigger
        await automationService.processTrigger(conversation.userId, 'message_received', {
          conversationId: conversation._id,
          contactPhone: from,
          message: newMessage,
          triggerData: { messageId: newMessage._id, messageType: type }
        });
        
        // Check for after_hours trigger
        await automationService.processTrigger(conversation.userId, 'after_hours', {
          conversationId: conversation._id,
          contactPhone: from,
          message: newMessage,
          triggerData: { messageId: newMessage._id, receivedAt: timestamp }
        });
      } catch (error) {
        console.error('Automation trigger error:', error);
      }
    });
  } catch (error) {
    console.error('Handle incoming message error:', error);
  }
}

// Handle message status updates
async function handleMessageStatus(status, io) {
  try {
    const messageId = status.id;
    const statusType = status.status; // sent, delivered, read, failed
    const timestamp = new Date(parseInt(status.timestamp) * 1000);

    // ✅ FEATURE: Message Errors - Handle failed message status with errors
    if (statusType === 'failed' && status.errors && status.errors.length > 0) {
      await handleMessageError(status, io);
      return;
    }

    // ✅ OPTIMIZATION: Check if this is a campaign message first (stored in Campaign, not Conversation)
    const campaign = await Campaign.findOne({
      'recipients.whatsappMessageId': messageId
    });

    if (campaign) {
      // Update campaign recipient status directly
      const recipient = campaign.recipients.find(r => r.whatsappMessageId === messageId);
      
      if (recipient) {
        recipient.status = statusType;
        if (statusType === 'delivered') recipient.deliveredAt = timestamp;
        if (statusType === 'read') recipient.readAt = timestamp;
        await campaign.save();

        // ✅ FEATURE: Template Analytics - Track status changes
        if (campaign.templateId) {
          await trackTemplateAnalytics(
            campaign.userId,
            campaign.templateId,
            campaign.templateName,
            statusType,
            {
              recipientPhone: recipient.phoneNumber,
              sentAt: recipient.sentAt,
              timestamp: timestamp
            }
          );
        }

        // Emit campaign progress update
        io.to(`user:${campaign.userId}`).emit('campaign:progress', {
          campaignId: campaign._id,
          recipientPhone: recipient.phoneNumber,
          status: statusType,
          progress: campaign.getProgress(),
          stats: campaign.stats
        });

        console.log(`✅ Campaign message status updated: ${messageId} -> ${statusType}`);
        return; // Exit early - no need to check conversation
      }
    }

    // If not a campaign message, check conversation (regular 1-on-1 messages)
    const conversation = await Conversation.findOne({
      'messages.whatsappMessageId': messageId
    });

    if (!conversation) {
      console.log(`Message ${messageId} not found in campaigns or conversations`);
      return;
    }

    // Find the specific message
    const messageDoc = conversation.messages.find(m => m.whatsappMessageId === messageId);
    if (!messageDoc) {
      console.log(`Message document not found for ${messageId}`);
      return;
    }

    // Update regular message status in conversation
    await conversation.updateMessageStatus(messageId, statusType, timestamp);

    // ✅ FEATURE: Read Receipts - Emit message status update with enhanced data
    io.to(`user:${conversation.userId}`).emit('message:status', {
      conversationId: conversation._id,
      messageId: messageDoc._id,
      whatsappMessageId: messageId,
      status: statusType,
      timestamp: timestamp,
      deliveredAt: statusType === 'delivered' ? timestamp : messageDoc.deliveredAt,
      readAt: statusType === 'read' ? timestamp : messageDoc.readAt
    });

    console.log(`✅ Message status updated: ${messageId} -> ${statusType}`);
  } catch (error) {
    console.error('Handle message status error:', error);
  }
}

// Handle template status updates
async function handleTemplateStatusUpdate(statusUpdate, io) {
  try {
    const templateId = statusUpdate.message_template_id;
    const status = statusUpdate.event; // APPROVED, REJECTED, PENDING

    // Find template by WhatsApp template ID
    const template = await Template.findOne({
      whatsappTemplateId: templateId
    });

    if (!template) {
      console.log(`Template not found: ${templateId}`);
      return;
    }

    // Update template status
    template.whatsappStatus = status;

    if (status === 'APPROVED') {
      template.status = 'approved';
    } else if (status === 'REJECTED') {
      template.status = 'rejected';
      template.rejectionReason = statusUpdate.reason || 'No reason provided';
    } else if (status === 'PENDING') {
      template.status = 'pending';
    }

    await template.save();

    // Emit template status update
    io.to(`user:${template.userId}`).emit('template:status', {
      templateId: template._id,
      status: template.status,
      whatsappStatus: status,
      rejectionReason: template.rejectionReason
    });

    console.log(`✅ Template status updated: ${templateId} -> ${status}`);
  } catch (error) {
    console.error('Handle template status error:', error);
  }
}

// Send automatic welcome message to first-time contacts
async function sendWelcomeMessage(conversation, userId, io) {
  try {
    const whatsappService = require('../services/whatsappService');
    const User = require('../models/User');
    
    // Get user-specific welcome message configuration
    const user = await User.findById(userId).populate('welcomeMessageConfig.templateId');
    
    if (!user || !user.welcomeMessageConfig) {
      console.log('⏭️ User has no welcome message configuration');
      return;
    }
    
    const config = user.welcomeMessageConfig;
    
    // Check if welcome messages are enabled
    if (!config.enabled) {
      console.log('⏭️ Welcome messages disabled for this user');
      return;
    }

    // Add delay if configured
    if (config.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    // Check business hours if enabled
    let messageText = config.textMessage;
    if (config.businessHoursEnabled && config.businessHours) {
      const isBusinessHours = checkBusinessHours({
        enabled: config.businessHoursEnabled,
        hours: config.businessHours
      });
      if (!isBusinessHours && config.outsideHoursMessage) {
        messageText = config.outsideHoursMessage;
      }
    }
    
    // Option 1: Use user's selected template (recommended for WhatsApp Business API)
    if (config.strategy === 'template' && config.templateId) {
      const welcomeTemplate = config.templateId;

      // Verify template is still approved
      if (welcomeTemplate.status !== 'approved') {
        console.log('⚠️ Selected welcome template is not approved, falling back to text message');
        // Fall through to text message option
      } else {
        console.log(`📤 Sending template welcome message: ${welcomeTemplate.name}`);
        
        // Send template message via WhatsApp
        const result = await whatsappService.sendTemplateMessage(
          conversation.contact.phoneNumber,
          welcomeTemplate.name,
          welcomeTemplate.language || 'en'
        );

        if (result.success) {
          // Add the welcome message to conversation
          await conversation.addMessage({
            whatsappMessageId: result.messageId,
            from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
            to: conversation.contact.phoneNumber,
            direction: 'outgoing',
            type: 'template',
            content: {
              text: welcomeTemplate.components?.find(c => c.type === 'BODY')?.text || 'Welcome message',
              templateName: welcomeTemplate.name
            },
            status: 'sent',
            timestamp: new Date()
          });

          console.log(`✅ Welcome template sent successfully: ${result.messageId}`);
          
          // Emit message sent event
          if (io) {
            io.to(`user:${userId}`).emit('message:sent', {
              conversationId: conversation._id.toString(),
              type: 'welcome',
              timestamp: new Date().toISOString()
            });
          }
          return;
        } else {
          console.error('❌ Failed to send welcome template:', result.error);
          // Fall through to text message
        }
      }
    }
    
    // Option 2: Send a simple text message (fallback or when strategy is 'text')
    console.log(`📤 Sending text welcome message`);
    
    const result = await whatsappService.sendTextMessage(
      conversation.contact.phoneNumber,
      messageText
    );

    if (result.success) {
      await conversation.addMessage({
        whatsappMessageId: result.messageId,
        from: process.env.WHATSAPP_PHONE_NUMBER_ID || 'system',
        to: conversation.contact.phoneNumber,
        direction: 'outgoing',
        type: 'text',
        content: {
          text: messageText
        },
        status: 'sent',
        timestamp: new Date()
      });

      console.log(`✅ Welcome text message sent: ${result.messageId}`);
    } else {
      console.error('❌ Failed to send welcome message:', result.error);
    }

    // Emit message sent event
    if (io) {
      io.to(`user:${userId}`).emit('message:sent', {
        conversationId: conversation._id.toString(),
        type: 'welcome',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error sending welcome message:', error);
    throw error;
  }
}

// Check if current time is within business hours
function checkBusinessHours(config) {
  if (!config.enabled) return true;
  
  try {
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const hours = config.hours[dayOfWeek];
    
    // If day is closed
    if (!hours) return false;
    
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return currentTime >= hours.start && currentTime <= hours.end;
  } catch (error) {
    console.error('Error checking business hours:', error);
    return true; // Default to true if error
  }
}

// ✅ FEATURE: Account Alerts - Handle account quality and status updates
async function handleAccountAlert(change, value, io) {
  try {
    console.log('🚨 Account alert received:');
    console.log('   Field:', change.field);
    console.log('   Value:', JSON.stringify(value, null, 2));

    const AlertLog = require('../models/AlertLog');
    
    // Get user ID (in production, you would identify user by phone number ID)
    const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '68f9490fef1e28c3cb8a9f8b';
    
    // Parse alert data
    const alertData = parseAccountAlert(change.field, value);
    
    if (!alertData) {
      console.log('⚠️  Could not parse account alert');
      return;
    }

    // Create alert log
    const alert = await AlertLog.create({
      userId: ADMIN_USER_ID,
      alertType: alertData.alertType,
      severity: alertData.severity,
      title: alertData.title,
      message: alertData.message,
      whatsappData: {
        phoneNumberId: value.phone_number_id,
        displayPhoneNumber: value.display_phone_number,
        currentRating: value.current_limit,
        previousRating: value.previous_limit,
        event: value.event,
        decision: value.decision,
        reasonCode: value.reason_code,
        rawData: value
      },
      firstOccurredAt: new Date(),
      lastOccurredAt: new Date()
    });

    console.log('✅ Alert log created:', alert._id);

    // Emit socket event for real-time notification
    if (io) {
      io.to(`user:${ADMIN_USER_ID}`).emit('alert:new', {
        alert: {
          _id: alert._id,
          alertType: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          status: alert.status,
          createdAt: alert.createdAt
        },
        needsAttention: alert.needsAttention
      });

      console.log('📡 Alert notification emitted to user');
    }

    // TODO: Send email/SMS notification for critical alerts
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      console.log('⚠️  CRITICAL/HIGH alert - Consider sending email/SMS notification');
      // await sendEmailNotification(alert);
    }

  } catch (error) {
    console.error('❌ Error handling account alert:', error);
    // Don't throw - we don't want to fail webhook processing
  }
}

// Parse account alert into structured data
function parseAccountAlert(field, value) {
  let alertType = 'UNKNOWN';
  let severity = 'MEDIUM';
  let title = 'WhatsApp Account Alert';
  let message = 'An alert was received from WhatsApp.';

  try {
    // Phone number quality update
    if (field === 'phone_number_quality_update') {
      alertType = 'PHONE_NUMBER_QUALITY_UPDATE';
      
      const currentRating = value.current_limit || 'UNKNOWN';
      const event = value.event || '';
      
      if (currentRating === 'RED' || event === 'FLAGGED') {
        severity = 'CRITICAL';
        title = '🚨 Critical: Account Quality Rating RED';
        message = `Your WhatsApp Business phone number (${value.display_phone_number || 'Unknown'}) has been flagged due to quality issues. ` +
                  `Your account may be restricted or suspended. ` +
                  `IMMEDIATE ACTION REQUIRED: Review your messaging practices and reduce spam reports.`;
      } else if (currentRating === 'YELLOW') {
        severity = 'HIGH';
        title = '⚠️ Warning: Account Quality Rating YELLOW';
        message = `Your WhatsApp Business phone number (${value.display_phone_number || 'Unknown'}) quality rating has decreased to YELLOW. ` +
                  `This is a warning that your messaging quality needs improvement. ` +
                  `Action required: Review recent campaigns, reduce message frequency, ensure opt-in compliance.`;
      } else if (event === 'REINSTATED') {
        severity = 'LOW';
        title = '✅ Account Reinstated';
        message = `Your WhatsApp Business phone number (${value.display_phone_number || 'Unknown'}) has been reinstated. ` +
                  `You can resume normal messaging operations.`;
      } else if (currentRating === 'GREEN') {
        severity = 'LOW';
        title = '✅ Account Quality: GREEN';
        message = `Your WhatsApp Business phone number (${value.display_phone_number || 'Unknown'}) has good quality rating. ` +
                  `Continue following best practices.`;
      }
    }
    
    // Account update
    else if (field === 'account_update') {
      alertType = 'ACCOUNT_UPDATE';
      severity = 'MEDIUM';
      title = 'Account Update';
      message = `WhatsApp Business account update received. ` +
                `Event: ${value.event || 'Unknown'}. ` +
                `Please review your account settings.`;
    }
    
    // Account alerts (generic)
    else if (field === 'account_alerts') {
      alertType = 'ACCOUNT_WARNING';
      
      if (value.severity === 'HIGH' || value.severity === 'CRITICAL') {
        severity = 'CRITICAL';
        title = '🚨 Critical Account Alert';
      } else {
        severity = 'HIGH';
        title = '⚠️ Account Alert';
      }
      
      message = value.message || 'An important account alert was received from WhatsApp.';
    }

    return { alertType, severity, title, message };
    
  } catch (error) {
    console.error('Error parsing account alert:', error);
    return null;
  }
}

// ✅ FEATURE: Contact Updates - Handle contact profile changes
async function handleContactUpdate(change, value, io) {
  try {
    console.log('👤 Contact update received:');
    console.log('   Change:', JSON.stringify(change, null, 2));
    console.log('   Value:', JSON.stringify(value, null, 2));

    const ContactHistory = require('../models/ContactHistory');
    const User = require('../models/User');

    // Find user by phone number ID
    const phoneNumberId = value.phone_number_id || value.metadata?.phone_number_id;
    if (!phoneNumberId) {
      console.log('⚠️  No phone number ID in contact update');
      return;
    }

    const user = await User.findOne({ 'whatsapp.phoneNumberId': phoneNumberId });
    if (!user) {
      console.log('⚠️  User not found for phone number ID:', phoneNumberId);
      return;
    }

    // Extract contact information
    const contacts = value.contacts || [];
    if (contacts.length === 0) {
      console.log('⚠️  No contacts in update');
      return;
    }

    // Process each contact update
    for (const contact of contacts) {
      const phoneNumber = contact.wa_id || contact.phone;
      if (!phoneNumber) continue;

      // Detect what changed
      const changes = detectContactChanges(contact);
      
      // Record each change
      for (const changeDetail of changes) {
        await ContactHistory.recordChange({
          userId: user._id,
          phoneNumber,
          eventType: changeDetail.eventType,
          changeDetails: changeDetail.details,
          metadata: {
            source: 'webhook',
            webhookId: change.id,
            timestamp: new Date(value.timestamp || Date.now())
          }
        });

        console.log('✅ Contact change recorded:', {
          phoneNumber,
          eventType: changeDetail.eventType,
          field: changeDetail.details?.field
        });

        // Emit socket event for real-time updates
        if (io) {
          io.to(`user:${user._id}`).emit('contact:update', {
            phoneNumber,
            eventType: changeDetail.eventType,
            changeDetails: changeDetail.details,
            timestamp: new Date()
          });
        }
      }

      // Update conversation with new contact info if exists
      await updateConversationContact(user._id, phoneNumber, contact);
    }

  } catch (error) {
    console.error('Error handling contact update:', error);
  }
}

// Helper function to detect what changed in contact
function detectContactChanges(contact) {
  const changes = [];

  // Profile update detected
  if (contact.profile) {
    const profile = contact.profile;

    // Name change
    if (profile.name) {
      changes.push({
        eventType: 'name_change',
        details: {
          field: 'name',
          newValue: profile.name,
          description: `Contact name updated to "${profile.name}"`
        }
      });
    }

    // Photo update
    if (profile.photo) {
      changes.push({
        eventType: 'photo_update',
        details: {
          field: 'photo',
          newValue: profile.photo,
          description: 'Contact profile photo updated'
        }
      });
    }

    // Status/About change
    if (profile.about !== undefined) {
      changes.push({
        eventType: 'about_change',
        details: {
          field: 'about',
          newValue: profile.about,
          description: `Contact about updated`
        }
      });
    }
  }

  // If no specific changes detected, record general profile update
  if (changes.length === 0) {
    changes.push({
      eventType: 'profile_update',
      details: {
        field: 'profile',
        description: 'Contact profile updated'
      }
    });
  }

  return changes;
}

// Helper function to update conversation contact info
async function updateConversationContact(userId, phoneNumber, contactData) {
  try {
    const Conversation = require('../models/Conversation');

    const updateData = {};
    
    if (contactData.profile?.name) {
      updateData['contact.name'] = contactData.profile.name;
    }

    if (contactData.profile?.photo) {
      updateData['contact.profilePicture'] = contactData.profile.photo;
    }

    if (Object.keys(updateData).length > 0) {
      await Conversation.updateMany(
        {
          userId,
          'contact.phoneNumber': phoneNumber
        },
        { $set: updateData }
      );

      console.log('✅ Conversation contact info updated for:', phoneNumber);
    }
  } catch (error) {
    console.error('Error updating conversation contact:', error);
  }
}

// ✅ FEATURE: Message Errors - Handle message failures
async function handleMessageError(status, io) {
  try {
    console.log('❌ Message error received:');
    console.log('   Status:', JSON.stringify(status, null, 2));

    const MessageError = require('../models/MessageError');
    const User = require('../models/User');
    const Conversation = require('../models/Conversation');

    const messageId = status.id;
    const recipientPhone = status.recipient_id;
    const errors = status.errors || [];

    if (errors.length === 0) {
      console.log('⚠️  No error details in failed status');
      return;
    }

    // Get the first error (usually only one)
    const error = errors[0];

    // Find conversation and message context
    let conversation = null;
    let messageContext = null;
    let userId = null;

    // Check if it's a campaign message
    const Campaign = require('../models/Campaign');
    const campaign = await Campaign.findOne({
      'recipients.whatsappMessageId': messageId
    });

    if (campaign) {
      userId = campaign.userId;
      const recipient = campaign.recipients.find(r => r.whatsappMessageId === messageId);
      
      if (recipient) {
        recipient.status = 'failed';
        recipient.errorMessage = error.message;
        await campaign.save();

        // Emit campaign error
        if (io) {
          io.to(`user:${userId}`).emit('campaign:error', {
            campaignId: campaign._id,
            recipientPhone: recipient.phoneNumber,
            error: error.message
          });
        }
      }

      messageContext = {
        type: 'template',
        direction: 'outgoing'
      };
    } else {
      // Check conversation messages
      conversation = await Conversation.findOne({
        'messages.whatsappMessageId': messageId
      });

      if (conversation) {
        userId = conversation.userId;
        const message = conversation.messages.find(m => m.whatsappMessageId === messageId);
        
        if (message) {
          message.status = 'failed';
          message.errorMessage = error.message;
          await conversation.save();

          messageContext = {
            type: message.type,
            content: message.content,
            direction: message.direction
          };

          // Emit message error
          if (io) {
            io.to(`user:${userId}`).emit('message:error', {
              conversationId: conversation._id,
              messageId: message._id,
              whatsappMessageId: messageId,
              error: error.message
            });
          }
        }
      }
    }

    if (!userId) {
      console.log('⚠️  Could not find user for error:', messageId);
      return;
    }

    // Record error in database
    await MessageError.recordError({
      userId,
      conversationId: conversation?._id,
      messageId: messageId,
      whatsappMessageId: messageId,
      recipientPhone,
      errorData: {
        code: error.code,
        title: error.title,
        message: error.message,
        type: error.error_data?.type,
        error_data: error.error_data,
        fbtrace_id: error.fbtrace_id
      },
      messageContext,
      webhookId: status.id
    });

    console.log('✅ Message error recorded successfully');

  } catch (error) {
    console.error('Error handling message error:', error);
  }
}

// ✅ FEATURE: Template Analytics - Track template performance
async function trackTemplateAnalytics(userId, templateId, templateName, statusType, data = {}) {
  try {
    // Get or create analytics
    const analytics = await TemplateAnalytics.getOrCreateAnalytics(
      userId,
      templateId,
      templateName
    );

    const updateData = {};

    // Track based on status type
    switch (statusType) {
      case 'sent':
        updateData.sent = 1;
        if (data.recipientPhone) {
          updateData.recipientPhone = data.recipientPhone;
        }
        break;

      case 'delivered':
        updateData.delivered = 1;
        // Calculate delivery time if sentAt is available
        if (data.sentAt && data.timestamp) {
          const deliveryTime = data.timestamp - data.sentAt;
          updateData.deliveryTime = deliveryTime;
        }
        break;

      case 'read':
        updateData.read = 1;
        break;

      case 'failed':
        updateData.failed = 1;
        break;
    }

    // Update metrics
    if (Object.keys(updateData).length > 0) {
      await analytics.updateMetrics(updateData);
      console.log(`✅ Template analytics tracked: ${templateName} - ${statusType}`);
    }
  } catch (error) {
    console.error('Error tracking template analytics:', error);
  }
}

// ✅ FEATURE 32: Handle Flow Response (NFM Reply)
async function handleFlowResponse(message, metadata, io) {
  try {
    console.log('📝 Processing flow response:', message.id);

    const from = message.from;
    const interactive = message.interactive;
    const nfmReply = interactive.nfm_reply;

    if (!nfmReply) {
      console.log('⚠️ No nfm_reply data in message');
      return;
    }

    const {
      name,           // Flow action name (e.g., "complete", "data_exchange")
      body,           // Flow response body (JSON string with form data)
      response_json   // Parsed response (may or may not be present)
    } = nfmReply;

    // Parse response data
    let responseData = {};
    try {
      responseData = response_json ? JSON.parse(response_json) : JSON.parse(body);
    } catch (e) {
      console.error('Error parsing flow response:', e);
      responseData = { raw_body: body };
    }

    // Extract flow token from response
    const flowToken = responseData.flow_token || 
                     interactive.flow_token || 
                     message.context?.flow_token;

    if (!flowToken) {
      console.log('⚠️ No flow token found in response');
      return;
    }

    // Find the flow response record
    const flowResponse = await FlowResponse.findByToken(flowToken);

    if (!flowResponse) {
      console.log(`⚠️ Flow response not found for token: ${flowToken}`);
      return;
    }

    console.log(`✅ Found flow response for flow: ${flowResponse.flow}`);

    // Update contact information
    const phoneNormalized = Conversation.normalizePhone(from);
    flowResponse.contact.phoneNumber = phoneNormalized;
    
    // Get contact name from conversation if available
    const conversation = await Conversation.findOne({
      'contact.phoneNumber': phoneNormalized
    });
    
    if (conversation) {
      flowResponse.contact.name = conversation.contact.name;
      flowResponse.contact.profilePic = conversation.contact.profilePic;
      flowResponse.conversationId = conversation._id;
    }

    // Store response data
    const formData = responseData.data || responseData.screen_0_TextInput_0 || responseData;
    
    // Convert form data to Map
    if (typeof formData === 'object') {
      Object.entries(formData).forEach(([key, value]) => {
        flowResponse.addResponse(key, value);
      });
    }

    // Update status based on action name
    if (name === 'complete' || name === 'COMPLETE') {
      await flowResponse.markCompleted();
      console.log(`✅ Flow completed: ${flowResponse._id}`);
    } else {
      flowResponse.status = 'in_progress';
      await flowResponse.save();
      console.log(`📝 Flow in progress: ${flowResponse._id}`);
    }

    // Store raw webhook data for debugging
    flowResponse.rawWebhookData = {
      messageId: message.id,
      timestamp: message.timestamp,
      interactive,
      nfmReply
    };
    await flowResponse.save();

    // Update conversation with flow response message
    if (conversation) {
      const responseMessage = {
        whatsappMessageId: message.id,
        type: 'flow_response',
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        from,
        direction: 'incoming',
        status: 'received',
        content: {
          flow_name: name,
          response_summary: Object.keys(formData).map(key => 
            `${key}: ${formData[key]}`
          ).join(', '),
          flow_token: flowToken
        }
      };

      conversation.messages.push(responseMessage);
      conversation.lastMessage = `Flow response: ${name}`;
      conversation.lastMessageAt = responseMessage.timestamp;
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      await conversation.save();

      // Emit real-time update
      if (io) {
        io.to(`conversation:${conversation._id}`).emit('newMessage', {
          conversationId: conversation._id,
          message: responseMessage
        });

        io.emit('conversationUpdate', {
          conversationId: conversation._id,
          lastMessage: conversation.lastMessage,
          unreadCount: conversation.unreadCount
        });
      }
    }

    // Emit flow response event
    if (io) {
      io.emit('flowResponse', {
        flowId: flowResponse.flow,
        responseId: flowResponse._id,
        contact: flowResponse.contact,
        status: flowResponse.status,
        data: formData
      });
    }

    console.log(`✅ Flow response processed successfully`);
  } catch (error) {
    console.error('Error handling flow response:', error);
  }
}

/**
 * ✅ FEATURE 33: Handle WhatsApp Channel Events
 * Processes channel-related webhook events (message views, reactions, etc.)
 */
async function handleChannelEvent(value, io) {
  try {
    console.log('📢 Processing channel event...');

    // Extract channel event data
    const metadata = value.metadata;
    const statuses = value.statuses || [];

    // Handle message status updates for channel messages
    for (const status of statuses) {
      const messageId = status.id;
      const statusType = status.status; // sent, delivered, read
      const timestamp = new Date(parseInt(status.timestamp) * 1000);

      // Find the channel message
      const channelMessage = await ChannelMessage.findOne({ messageId });

      if (!channelMessage) {
        console.log(`⚠️ Channel message not found: ${messageId}`);
        continue;
      }

      // Update delivery status
      if (statusType === 'delivered') {
        await channelMessage.updateDeliveryStatus('delivered');
        console.log(`✅ Channel message ${messageId} marked as delivered`);
      }

      // Handle views (read receipts)
      if (statusType === 'read') {
        await channelMessage.recordView();
        console.log(`👁️ Channel message ${messageId} view recorded`);
      }

      // Handle reactions if present
      if (status.reaction) {
        const emoji = status.reaction.emoji;
        await channelMessage.recordReaction(emoji);
        console.log(`❤️ Channel message ${messageId} received reaction: ${emoji}`);

        // Update channel analytics
        const channel = await Channel.findById(channelMessage.channelId);
        if (channel) {
          await channel.incrementReactions(1);
        }
      }

      // Emit real-time update
      if (io) {
        const channel = await Channel.findById(channelMessage.channelId);
        if (channel) {
          io.to(`user:${channel.createdBy}`).emit('channelMessageUpdate', {
            channelId: channel._id,
            messageId: channelMessage._id,
            status: channelMessage.status,
            views: channelMessage.views,
            reactions: channelMessage.reactions,
            engagementRate: channelMessage.calculateEngagementRate()
          });
        }
      }
    }

    // Handle follower updates if present
    if (value.follower_updates) {
      for (const followerUpdate of value.follower_updates) {
        const channelId = followerUpdate.channel_id;
        const followerCount = followerUpdate.follower_count;

        // Find channel by WhatsApp channel ID
        const channel = await Channel.findOne({ channelId });

        if (channel) {
          await channel.updateFollowerCount(followerCount);
          console.log(`✅ Channel ${channelId} follower count updated: ${followerCount}`);

          // Emit real-time update
          if (io) {
            io.to(`user:${channel.createdBy}`).emit('channelFollowerUpdate', {
              channelId: channel._id,
              followerCount
            });
          }
        }
      }
    }

    console.log('✅ Channel event processed successfully');
  } catch (error) {
    console.error('Error handling channel event:', error);
  }
}

/**
 * ✅ FEATURE 35: Handle Phone Number Name Update
 * Processes when business display name changes
 */
async function handlePhoneNameUpdate(value, io) {
  try {
    console.log('📱 Processing phone name update...');

    const phoneNumberId = value.phone_number_id;
    const displayPhoneNumber = value.display_phone_number;
    const oldName = value.old_name || 'Unknown';
    const newName = value.new_name || displayPhoneNumber;
    const decision = value.decision; // APPROVED, REJECTED
    const requestedName = value.requested_name;

    // Find user by phone number ID
    const User = require('../models/User');
    const user = await User.findOne({ whatsappPhoneNumberId: phoneNumberId });

    if (!user) {
      console.log(`⚠️ User not found for phone number ID: ${phoneNumberId}`);
      return;
    }

    // Create alert log
    const severity = decision === 'REJECTED' ? 'MEDIUM' : 'LOW';
    const title = decision === 'REJECTED' 
      ? 'Display Name Change Rejected' 
      : 'Display Name Updated';
    
    let message = '';
    if (decision === 'REJECTED') {
      message = `Your request to change the display name from "${oldName}" to "${requestedName}" was rejected by WhatsApp.`;
    } else if (decision === 'APPROVED') {
      message = `Your business display name has been updated from "${oldName}" to "${newName}".`;
    } else {
      message = `Your business display name change is pending review. Requested name: "${requestedName}"`;
    }

    await AlertLog.create({
      userId: user._id,
      alertType: 'PHONE_NUMBER_NAME_UPDATE',
      severity: severity,
      title: title,
      message: message,
      whatsappData: {
        phoneNumberId: phoneNumberId,
        displayPhoneNumber: displayPhoneNumber,
        decision: decision,
        event: 'NAME_UPDATE',
        rawData: value
      },
      status: 'UNREAD'
    });

    // Emit real-time notification
    if (io) {
      io.to(`user:${user._id}`).emit('phoneNameUpdate', {
        phoneNumberId,
        oldName,
        newName,
        decision,
        requestedName,
        message
      });
    }

    console.log(`✅ Phone name update processed: ${oldName} → ${newName}`);
  } catch (error) {
    console.error('Error handling phone name update:', error);
  }
}

/**
 * ✅ FEATURE 35: Handle Template Category Limit Update
 * Processes when template approval limits change
 */
async function handleTemplateLimitUpdate(value, io) {
  try {
    console.log('📋 Processing template limit update...');

    const phoneNumberId = value.phone_number_id;
    const displayPhoneNumber = value.display_phone_number;
    const category = value.category; // MARKETING, UTILITY, AUTHENTICATION
    const oldLimit = value.old_limit || 0;
    const newLimit = value.new_limit || 0;
    const reason = value.reason || 'No reason provided';

    // Find user by phone number ID
    const User = require('../models/User');
    const user = await User.findOne({ whatsappPhoneNumberId: phoneNumberId });

    if (!user) {
      console.log(`⚠️ User not found for phone number ID: ${phoneNumberId}`);
      return;
    }

    // Determine severity
    let severity = 'LOW';
    if (newLimit < oldLimit) {
      severity = 'MEDIUM'; // Limit decreased
    } else if (newLimit > oldLimit * 2) {
      severity = 'LOW'; // Significant increase
    }

    const title = newLimit > oldLimit 
      ? `Template Limit Increased - ${category}` 
      : newLimit < oldLimit 
      ? `Template Limit Decreased - ${category}`
      : `Template Limit Updated - ${category}`;
    
    const message = `Your ${category} template approval limit has changed from ${oldLimit} to ${newLimit} templates. Reason: ${reason}`;

    await AlertLog.create({
      userId: user._id,
      alertType: 'LIMIT_CHANGE',
      severity: severity,
      title: title,
      message: message,
      whatsappData: {
        phoneNumberId: phoneNumberId,
        displayPhoneNumber: displayPhoneNumber,
        templateCategory: category,
        event: 'LIMIT_UPDATE',
        rawData: {
          category,
          oldLimit,
          newLimit,
          reason
        }
      },
      status: 'UNREAD'
    });

    // Emit real-time notification
    if (io) {
      io.to(`user:${user._id}`).emit('templateLimitUpdate', {
        phoneNumberId,
        category,
        oldLimit,
        newLimit,
        reason,
        message
      });
    }

    console.log(`✅ Template limit update processed: ${category} ${oldLimit} → ${newLimit}`);
  } catch (error) {
    console.error('Error handling template limit update:', error);
  }
}

/**
 * ✅ FEATURE 35: Handle Security Event
 * Processes security notifications (account verification, suspension, etc.)
 */
async function handleSecurityEvent(value, io) {
  try {
    console.log('🔒 Processing security event...');

    const phoneNumberId = value.phone_number_id;
    const displayPhoneNumber = value.display_phone_number;
    const event = value.event; // DISABLED, VERIFIED, FLAGGED, REINSTATED
    const reason = value.reason || 'No reason provided';
    const decision = value.decision; // Can be DISABLE, REINSTATE

    // Find user by phone number ID
    const User = require('../models/User');
    const user = await User.findOne({ whatsappPhoneNumberId: phoneNumberId });

    if (!user) {
      console.log(`⚠️ User not found for phone number ID: ${phoneNumberId}`);
      return;
    }

    // Determine severity and message based on event
    let severity = 'LOW';
    let title = 'Security Notification';
    let message = '';
    let alertType = 'ACCOUNT_UPDATE';

    switch (event) {
      case 'DISABLED':
        severity = 'CRITICAL';
        title = '🚨 Account Disabled';
        message = `Your WhatsApp Business account (${displayPhoneNumber}) has been disabled. Reason: ${reason}. Please contact WhatsApp support immediately.`;
        alertType = 'POLICY_ENFORCEMENT';
        break;

      case 'VERIFIED':
        severity = 'LOW';
        title = '✅ Account Verified';
        message = `Your WhatsApp Business account (${displayPhoneNumber}) has been verified successfully.`;
        break;

      case 'FLAGGED':
        severity = 'HIGH';
        title = '⚠️ Account Flagged';
        message = `Your WhatsApp Business account (${displayPhoneNumber}) has been flagged for review. Reason: ${reason}. Please review your messaging practices.`;
        alertType = 'ACCOUNT_WARNING';
        break;

      case 'REINSTATED':
        severity = 'LOW';
        title = '✅ Account Reinstated';
        message = `Your WhatsApp Business account (${displayPhoneNumber}) has been reinstated. You can resume normal operations.`;
        break;

      default:
        severity = 'MEDIUM';
        title = 'Security Event';
        message = `A security event occurred on your WhatsApp Business account (${displayPhoneNumber}). Event: ${event}. ${reason}`;
    }

    await AlertLog.create({
      userId: user._id,
      alertType: alertType,
      severity: severity,
      title: title,
      message: message,
      whatsappData: {
        phoneNumberId: phoneNumberId,
        displayPhoneNumber: displayPhoneNumber,
        event: event,
        decision: decision,
        reasonCode: reason,
        rawData: value
      },
      status: 'UNREAD',
      impact: {
        affectedFeatures: event === 'DISABLED' ? ['messaging', 'campaigns', 'templates', 'automation'] : [],
        businessImpact: event === 'DISABLED' ? 'CRITICAL' : event === 'FLAGGED' ? 'HIGH' : 'LOW'
      }
    });

    // Emit real-time notification
    if (io) {
      io.to(`user:${user._id}`).emit('securityEvent', {
        phoneNumberId,
        event,
        decision,
        reason,
        severity,
        message
      });
    }

    // If critical, also emit urgent alert
    if (severity === 'CRITICAL') {
      io.to(`user:${user._id}`).emit('urgentAlert', {
        title,
        message,
        type: 'security',
        requiresAction: true
      });
    }

    console.log(`✅ Security event processed: ${event} for ${displayPhoneNumber}`);
  } catch (error) {
    console.error('Error handling security event:', error);
  }
}

module.exports = router;
