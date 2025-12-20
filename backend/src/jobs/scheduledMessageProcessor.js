const cron = require('node-cron');
const logger = require('../common/helpers/logger');
const ScheduledMessage = require('../core/database/models/ScheduledMessage');
const Conversation = require('../core/database/models/Conversation');
const axios = require('axios');

// Constants for scheduled message processing
const CRON_SCHEDULE_EVERY_MINUTE = '* * * * *'; // Run every minute
const CRON_TIMEZONE = 'UTC'; // Timezone for cron jobs
const MESSAGE_STATUS_PENDING = 'pending'; // Pending message status
const MESSAGE_STATUS_SENT = 'sent'; // Sent message status
const MESSAGE_STATUS_FAILED = 'failed'; // Failed message status
const MESSAGE_TYPE_TEXT = 'text'; // Text message type
const MESSAGE_TYPE_TEMPLATE = 'template'; // Template message type
const MESSAGE_DIRECTION_OUTGOING = 'out'; // Outgoing message direction
const DEFAULT_MESSAGE_BATCH_SIZE = 100; // Default batch size for processing messages
const BUSINESS_STATUS_ACTIVE = 'active'; // Active business status
const RECURRENCE_FREQUENCY_DAILY = 'daily'; // Daily recurrence
const RECURRENCE_FREQUENCY_WEEKLY = 'weekly'; // Weekly recurrence
const RECURRENCE_FREQUENCY_MONTHLY = 'monthly'; // Monthly recurrence
const DAYS_IN_WEEK = 7; // Days in a week
const MESSAGING_PRODUCT_WHATSAPP = 'whatsapp'; // WhatsApp messaging product
const RECIPIENT_TYPE_INDIVIDUAL = 'individual'; // Individual recipient type
const DEFAULT_TEMPLATE_LANGUAGE = 'en'; // Default template language

let isProcessing = false;

/** 
 * Process scheduled messages
 * Runs every minute to check for messages that need to be sent
 */
const processScheduledMessages = async () => {
  // Prevent concurrent processing
  if (isProcessing) { 
    logger.debug('Scheduled message processor already running, skipping');
    return;
  }

  isProcessing = true;
  const startTime = Date.now();

  try {
    const now = new Date();
    logger.info('Processing scheduled messages', { timestamp: now.toISOString() });

    // Find pending messages that are due
    const messages = await ScheduledMessage.find({
      status: MESSAGE_STATUS_PENDING,
      scheduledTime: { $lte: now }
    })
      .populate('conversationId')
      .populate('templateId')
      .limit(DEFAULT_MESSAGE_BATCH_SIZE);

    if (messages.length === 0) {
      logger.debug('No scheduled messages to process');
      isProcessing = false;
      return;
    }

    logger.info('Found scheduled messages to send', { count: messages.length });

    let successCount = 0;
    let failCount = 0;

    // Process each message
    for (const scheduledMsg of messages) {
      try {
        // Send message
        await sendScheduledMessage(scheduledMsg);

        // Update status to sent
        scheduledMsg.status = MESSAGE_STATUS_SENT;
        scheduledMsg.sentAt = new Date();
        await scheduledMsg.save();

        successCount++;

        // Handle recurrence
        if (scheduledMsg.recurrence?.enabled) {
          await createNextOccurrence(scheduledMsg);
        }

      } catch (error) {
        logger.error('Failed to send scheduled message', {
          messageId: scheduledMsg._id,
          businessId: scheduledMsg.businessId?.toString(),
          error: error.message
        });

        // Update status to failed
        scheduledMsg.status = MESSAGE_STATUS_FAILED;
        scheduledMsg.failureReason = error.message;
        scheduledMsg.failedAt = new Date();
        await scheduledMsg.save();

        failCount++;
      }
    }

    const processingTime = Date.now() - startTime;

    logger.info('Processed scheduled messages', {
      total: messages.length,
      sent: successCount,
      failed: failCount,
      processingTime: processingTime + 'ms'
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error in scheduled message processor', { 
      error: error.message,
      processingTime: processingTime + 'ms'
    });
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
    messaging_product: MESSAGING_PRODUCT_WHATSAPP,
    recipient_type: RECIPIENT_TYPE_INDIVIDUAL,
    to: conversation.contact.phoneNumber
  };

  // Handle different message types
  switch (scheduledMsg.messageType) {
    case MESSAGE_TYPE_TEXT:
      messagePayload.type = MESSAGE_TYPE_TEXT;
      messagePayload.text = {
        body: scheduledMsg.content.text?.body || scheduledMsg.content.body
      };
      break;

    case MESSAGE_TYPE_TEMPLATE:
      messagePayload.type = MESSAGE_TYPE_TEMPLATE;
      messagePayload.template = {
        name: scheduledMsg.templateId?.name || scheduledMsg.content.template?.name,
        language: {
          code: scheduledMsg.templateId?.language || scheduledMsg.content.template?.language || DEFAULT_TEMPLATE_LANGUAGE
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
  const Business = require('../core/database/models/Business');
  const business = await Business.findOne({ _id: businessId, status: BUSINESS_STATUS_ACTIVE });
  
  if (!business) {
    throw new Error('Business not found or inactive');
  }
  
  const { getWhatsAppService } = require('../common/helpers/businessContext');
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
    direction: MESSAGE_DIRECTION_OUTGOING,
    type: scheduledMsg.messageType,
    content: scheduledMsg.content,
    timestamp: new Date(),
    status: MESSAGE_STATUS_SENT,
    scheduledMessageId: scheduledMsg._id
  };

  conversation.messages.push(messageDoc);
  conversation.lastMessage = {
    text: scheduledMsg.content.text?.body || `[${scheduledMsg.messageType}]`,
    type: scheduledMsg.messageType,
    direction: MESSAGE_DIRECTION_OUTGOING,
    timestamp: new Date(),
    status: MESSAGE_STATUS_SENT
  };
  conversation.lastMessageAt = new Date();

  await conversation.save();

  logger.info('Sent scheduled message', {
    messageId: scheduledMsg._id,
    phoneNumber: conversation.contact.phoneNumber,
    businessId: businessId.toString()
  });
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
    case RECURRENCE_FREQUENCY_DAILY:
      nextScheduledTime.setDate(nextScheduledTime.getDate() + interval);
      break;
    case RECURRENCE_FREQUENCY_WEEKLY:
      nextScheduledTime.setDate(nextScheduledTime.getDate() + (DAYS_IN_WEEK * interval));
      break;
    case RECURRENCE_FREQUENCY_MONTHLY:
      nextScheduledTime.setMonth(nextScheduledTime.getMonth() + interval);
      break;
    default:
      logger.warn('Unknown recurrence frequency', { frequency });
      return;
  }

  // Check if we should create next occurrence
  if (endDate && nextScheduledTime > new Date(endDate)) {
    logger.info('Recurrence ended for scheduled message', {
      messageId: scheduledMsg._id
    });
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
    status: MESSAGE_STATUS_PENDING
  });

  await nextMessage.save();

  logger.info('Created next occurrence', {
    messageId: nextMessage._id,
    scheduledTime: nextScheduledTime.toISOString()
  });
};

/**
 * Start the cron job
 */
const startScheduledMessageProcessor = () => {
  logger.info('Starting scheduled message processor', {
    schedule: CRON_SCHEDULE_EVERY_MINUTE,
    timezone: CRON_TIMEZONE
  });

  // Run every minute
  cron.schedule(CRON_SCHEDULE_EVERY_MINUTE, () => {
    processScheduledMessages();
  }, {
    timezone: CRON_TIMEZONE
  });

  logger.info('Scheduled message processor started successfully');
};

module.exports = {
  startScheduledMessageProcessor,
  processScheduledMessages
};
