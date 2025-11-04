const express = require('express');
const router = express.Router();
// ✅ REMOVED: Message model no longer exists - using Conversation.messages
const Conversation = require('../models/Conversation');
const Template = require('../models/Template');
const Campaign = require('../models/Campaign');

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

    // Update regular message status in conversation
    await conversation.updateMessageStatus(messageId, statusType, timestamp);

    // Emit message status update
    io.to(`user:${message.userId}`).emit('message:status', {
      messageId: message._id,
      status: statusType,
      timestamp
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

module.exports = router;
