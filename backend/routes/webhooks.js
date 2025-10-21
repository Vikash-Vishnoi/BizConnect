const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
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
    // Always respond with 200 OK quickly
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

    // Get or create conversation
    let conversation = await Conversation.findOne({
      phoneNumber: from
    });

    if (!conversation) {
      // Create new conversation (assign to first user - in production, implement routing logic)
      const User = require('../models/User');
      const firstUser = await User.findOne({ role: 'admin' });
      
      if (!firstUser) {
        console.error('No admin user found to assign conversation');
        return;
      }

      conversation = await Conversation.create({
        phoneNumber: from,
        name: message.profile?.name || from,
        userId: firstUser._id,
        metadata: { source: 'webhook' }
      });

      // Emit new conversation event
      io.to(`user:${firstUser._id}`).emit('conversation:new', {
        conversation
      });
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

    // Create message record
    const newMessage = await Message.create({
      conversationId: conversation._id,
      whatsappMessageId: messageId,
      from: from,
      to: metadata.phone_number_id,
      direction: 'incoming',
      type,
      content,
      status: 'delivered',
      timestamp,
      userId: conversation.userId
    });

    // Update conversation
    await conversation.incrementUnread();

    // Emit message received event
    io.to(`user:${conversation.userId}`).emit('message:received', {
      conversationId: conversation._id,
      message: newMessage
    });

    console.log(`✅ Incoming message processed: ${messageId}`);
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

    // Find message by WhatsApp message ID
    const message = await Message.findOne({
      whatsappMessageId: messageId
    });

    if (!message) {
      console.log(`Message not found: ${messageId}`);
      return;
    }

    // Update message status
    message.status = statusType;

    if (statusType === 'delivered') {
      message.deliveredAt = timestamp;
    } else if (statusType === 'read') {
      message.readAt = timestamp;
    } else if (statusType === 'failed') {
      message.error = {
        code: status.errors?.[0]?.code || 'unknown',
        message: status.errors?.[0]?.title || 'Unknown error'
      };
    }

    await message.save();

    // Update campaign stats if message is part of a campaign
    if (message.campaignId) {
      const campaign = await Campaign.findById(message.campaignId);
      if (campaign) {
        const recipient = campaign.recipients.find(
          r => r.whatsappMessageId === messageId
        );
        
        if (recipient) {
          recipient.status = statusType;
          if (statusType === 'delivered') recipient.deliveredAt = timestamp;
          if (statusType === 'read') recipient.readAt = timestamp;
          await campaign.save();

          // Emit campaign progress update
          io.to(`user:${campaign.userId}`).emit('campaign:progress', {
            campaignId: campaign._id,
            progress: campaign.getProgress(),
            stats: campaign.stats
          });
        }
      }
    }

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

module.exports = router;
