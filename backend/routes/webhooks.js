const express = require('express');
const router = express.Router();
// ✅ REMOVED: Message model no longer exists - using Conversation.messages
const Conversation = require('../models/Conversation');
const Template = require('../models/Template');
const Campaign = require('../models/Campaign');
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

module.exports = router;
