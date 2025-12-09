const cron = require('node-cron');
const ScheduledMessage = require('../database/models/ScheduledMessage');
const Conversation = require('../database/models/Conversation');
const axios = require('axios');

let isProcessing = false;

/** 
 * Process scheduled messages
 * Runs every minute to check for messages that need to be sent
 */
const processScheduledMessages = async () => {
  // Prevent concurrent processing
  if (isProcessing) { 
    console.log('⏳ Scheduled message processor already running, skipping...');
    return;
  }

  isProcessing = true;

  try {
    const now = new Date();
    console.log(`🕐 [${now.toISOString()}] Processing scheduled messages...`);

    // Find pending messages that are due
    const messages = await ScheduledMessage.find({
      status: 'pending',
      scheduledTime: { $lte: now }
    })
      .populate('conversationId')
      .populate('templateId')
      .limit(100); // Process 100 messages at a time

    if (messages.length === 0) {
      console.log('✅ No scheduled messages to process');
      isProcessing = false;
      return;
    }

    console.log(`📨 Found ${messages.length} scheduled messages to send`);

    let successCount = 0;
    let failCount = 0;

    // Process each message
    for (const scheduledMsg of messages) {
      try {
        // Send message
        await sendScheduledMessage(scheduledMsg);

        // Update status to sent
        scheduledMsg.status = 'sent';
        scheduledMsg.sentAt = new Date();
        await scheduledMsg.save();

        successCount++;

        // Handle recurrence
        if (scheduledMsg.recurrence?.enabled) {
          await createNextOccurrence(scheduledMsg);
        }

      } catch (error) {
        console.error(`❌ Failed to send scheduled message ${scheduledMsg._id}:`, error.message);

        // Update status to failed
        scheduledMsg.status = 'failed';
        scheduledMsg.failureReason = error.message;
        scheduledMsg.failedAt = new Date();
        await scheduledMsg.save();

        failCount++;
      }
    }

    console.log(`✅ Processed ${messages.length} messages: ${successCount} sent, ${failCount} failed`);

  } catch (error) {
    console.error('❌ Error in scheduled message processor:', error);
  } finally {
    isProcessing = false;
  }
};

/**
 * Send a scheduled message
 */
const sendScheduledMessage = async (scheduledMsg) => {
  const conversation = scheduledMsg.conversationId;

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Build message payload
  const messagePayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: conversation.contact.phoneNumber
  };

  // Handle different message types
  switch (scheduledMsg.messageType) {
    case 'text':
      messagePayload.type = 'text';
      messagePayload.text = {
        body: scheduledMsg.content.text?.body || scheduledMsg.content.body
      };
      break;

    case 'template':
      messagePayload.type = 'template';
      messagePayload.template = {
        name: scheduledMsg.templateId?.name || scheduledMsg.content.template?.name,
        language: {
          code: scheduledMsg.templateId?.language || scheduledMsg.content.template?.language || 'en'
        }
      };
      if (scheduledMsg.content.template?.components) {
        messagePayload.template.components = scheduledMsg.content.template.components;
      }
      break;

    default:
      throw new Error(`Unsupported message type: ${scheduledMsg.messageType}`);
  }

  // ✅ MULTI-BUSINESS: Get business credentials
  const businessId = scheduledMsg.businessId || conversation.businessId;
  
  if (!businessId) {
    throw new Error('Business ID not found for scheduled message');
  }
  
  // Verify business exists and is active
  const Business = require('../database/models/Business');
  const business = await Business.findOne({ _id: businessId, status: 'active' });
  
  if (!business) {
    throw new Error('Business not found or inactive');
  }
  
  const { getWhatsAppService } = require('../utils/helpers/businessContext');
  const whatsappService = await getWhatsAppService(businessId);

  // Send via WhatsApp API
  const response = await axios.post(
    `${whatsappService.apiUrl}/${whatsappService.phoneNumberId}/messages`,
    messagePayload,
    {
      headers: {
        'Authorization': `Bearer ${whatsappService.accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Save message to conversation
  const messageDoc = {
    whatsappMessageId: response.data.messages[0].id,
    from: whatsappService.phoneNumberId,
    to: conversation.contact.phoneNumber,
    direction: 'outgoing',
    type: scheduledMsg.messageType,
    content: scheduledMsg.content,
    timestamp: new Date(),
    status: 'sent',
    scheduledMessageId: scheduledMsg._id
  };

  conversation.messages.push(messageDoc);
  conversation.lastMessage = {
    text: scheduledMsg.content.text?.body || `[${scheduledMsg.messageType}]`,
    type: scheduledMsg.messageType,
    direction: 'outgoing',
    timestamp: new Date(),
    status: 'sent'
  };
  conversation.lastMessageAt = new Date();

  await conversation.save();

  console.log(`✅ Sent scheduled message ${scheduledMsg._id} to ${conversation.contact.phoneNumber}`);
};

/**
 * Create next occurrence for recurring messages
 */
const createNextOccurrence = async (scheduledMsg) => {
  if (!scheduledMsg.recurrence?.enabled) {
    return;
  }

  const { frequency, interval, endDate } = scheduledMsg.recurrence;

  // Calculate next scheduled time
  const nextScheduledTime = new Date(scheduledMsg.scheduledTime);

  switch (frequency) {
    case 'daily':
      nextScheduledTime.setDate(nextScheduledTime.getDate() + interval);
      break;
    case 'weekly':
      nextScheduledTime.setDate(nextScheduledTime.getDate() + (7 * interval));
      break;
    case 'monthly':
      nextScheduledTime.setMonth(nextScheduledTime.getMonth() + interval);
      break;
    default:
      console.warn(`Unknown recurrence frequency: ${frequency}`);
      return;
  }

  // Check if we should create next occurrence
  if (endDate && nextScheduledTime > new Date(endDate)) {
    console.log(`⏹️ Recurrence ended for scheduled message ${scheduledMsg._id}`);
    return;
  }

  // Create next occurrence
  const nextMessage = new ScheduledMessage({
    businessId: scheduledMsg.businessId,
    userId: scheduledMsg.userId,
    conversationId: scheduledMsg.conversationId,
    scheduledTime: nextScheduledTime,
    messageType: scheduledMsg.messageType,
    content: scheduledMsg.content,
    templateId: scheduledMsg.templateId,
    recurrence: scheduledMsg.recurrence,
    status: 'pending'
  });

  await nextMessage.save();

  console.log(`🔁 Created next occurrence: ${nextMessage._id} scheduled for ${nextScheduledTime.toISOString()}`);
};

/**
 * Start the cron job
 */
const startScheduledMessageProcessor = () => {
  console.log('🚀 Starting scheduled message processor (runs every minute)...');

  // Run every minute: '* * * * *'
  cron.schedule('* * * * *', () => {
    processScheduledMessages();
  });

  console.log('✅ Scheduled message processor started');
};

module.exports = {
  startScheduledMessageProcessor,
  processScheduledMessages
};
