/**
 * Status Handler - Process message status updates from WhatsApp
 * Includes proper logging, TemplateAnalytics tracking, MessageError logging
 * @module routes/webhooks/statusHandler
 */

const Conversation = require('../../../core/database/models/Conversation');
const Campaign = require('../../../core/database/models/Campaign');
const CampaignRecipient = require('../../../core/database/models/CampaignRecipient');
const Template = require('../../../core/database/models/Template');
const AlertLog = require('../../../core/database/models/AlertLog');
const campaignService = require('../../campaigns/services/campaignService');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../../../common/constants');

/**
 * Message Status Constants
 */
const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

const ERROR_SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};
 
/**
 * Handle message status updates (sent, delivered, read, failed)
 * @param {Object} status - WhatsApp status object
 * @param {Object} io - Socket.IO instance
 * @param {Object} business - Business model instance
 */
async function handleMessageStatus(status, io, business) {
  const startTime = Date.now();
  const requestId = `status_${status?.id}_${Date.now()}`;
  
  try {
    // Validate inputs
    if (!status || !business) {
      logger.error('handleMessageStatus called with invalid parameters', {
        requestId,
        hasStatus: !!status,
        hasBusiness: !!business,
        code: ERROR_CODES.VALIDATION_ERROR
      });
      return;
    }

    const messageId = status.id;
    const recipientId = status.recipient_id;
    const statusType = status.status;
    const timestamp = new Date(parseInt(status.timestamp) * TIME_CONSTANTS.SECOND_MS);

    logger.logWhatsAppAPI('POST', 'webhook/status', 200, {
      requestId,
      messageId,
      recipientId,
      status: statusType,
      businessId: business._id.toString(),
      hasError: !!status.errors
    });

    // Validate required fields
    if (!messageId || !recipientId || !statusType) {
      logger.error('Invalid status data in webhook', {
        requestId,
        businessId: business._id.toString(),
        hasMessageId: !!messageId,
        hasRecipientId: !!recipientId,
        hasStatus: !!statusType,
        code: ERROR_CODES.VALIDATION_ERROR
      });
      return;
    }

    // Normalize phone number
    const phoneNormalized = Conversation.normalizePhone(recipientId);

    // Update conversation message status
    await updateConversationMessageStatus(
      messageId,
      phoneNormalized,
      statusType,
      timestamp,
      status,
      io,
      business,
      requestId
    );

    // Update campaign recipient status
    await updateCampaignRecipientStatus(
      messageId,
      statusType,
      timestamp,
      status,
      io,
      business,
      requestId
    );

    // Track template analytics
    await trackTemplateAnalytics(
      business._id,
      null,
      null,
      statusType,
      {
        conversationId: status.conversation?.id,
        messageId: messageId,
        timestamp: timestamp,
        requestId: requestId
      }
    );

    // Handle failed status
    if (statusType === MESSAGE_STATUS.FAILED) {
      await handleMessageError(status, io, business, requestId);
      await updatePhoneHealthOnError(status, business, requestId);
    }

    // Log completion time
    const processingTime = Date.now() - startTime;
    logger.info('Status update processed', {
      requestId,
      messageId,
      status: statusType,
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    logger.error('Error handling message status', {
      requestId,
      error: error.message,
      stack: error.stack,
      messageId: status?.id,
      businessId: business?._id?.toString(),
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      processingTime: `${Date.now() - startTime}ms`
    });
    throw error;
  }
}

/**
 * Update message status in conversation
 */
async function updateConversationMessageStatus(
  messageId,
  phoneNormalized,
  statusType,
  timestamp,
  status,
  io,
  business,
  requestId
) {
  try {
    const conversation = await Conversation.findOne({
      'contact.phoneNumber': phoneNormalized,
      businessId: business._id,
      'messages.whatsappMessageId': messageId
    });

    if (!conversation) {
      logger.debug('Conversation not found for status update', {
        requestId,
        messageId,
        phoneNumber: phoneNormalized
      });
      return;
    }

    const message = conversation.messages.find(
      m => m.whatsappMessageId === messageId
    );

    if (!message) {
      logger.warn('Message not found in conversation for status update', {
        requestId,
        messageId,
        conversationId: conversation._id.toString()
      });
      return;
    }

    // Update message status
    const previousStatus = message.status;
    message.status = statusType;

    // Update timestamps based on status
    switch (statusType) {
      case 'sent':
        message.sentAt = timestamp;
        break;
      case 'delivered':
        message.deliveredAt = timestamp;
        break;
      case 'read':
        message.readAt = timestamp;
        if (message.direction === 'out' && !message.wasRead) {
          message.wasRead = true;
        }
        break;
      case 'failed':
        message.failedAt = timestamp;
        message.error = status.errors?.[0];
        break;
    }

    await conversation.save();

    logger.info('Conversation message status updated', {
      requestId,
      messageId,
      conversationId: conversation._id.toString(),
      previousStatus,
      newStatus: statusType
    });

    // Emit status update event
    io.to(`user:${conversation.userId}`).emit('message:status', {
      conversationId: conversation._id,
      messageId: message._id,
      whatsappMessageId: messageId,
      status: statusType,
      timestamp: timestamp,
      error: message.error
    });

  } catch (error) {
    logger.error('Error updating conversation message status', {
      requestId,
      error: error.message,
      messageId
    });
  }
}

/**
 * Update campaign recipient status
 */
async function updateCampaignRecipientStatus(
  messageId,
  statusType,
  timestamp,
  status,
  io,
  business,
  requestId
) {
  try {
    const recipient = await CampaignRecipient.findOne({
      whatsappMessageId: messageId,
      businessId: business._id
    });

    if (!recipient) {
      logger.debug('Campaign recipient not found for message', {
        requestId,
        messageId
      });
      return;
    }

    // Update recipient status
    const previousStatus = recipient.status;
    recipient.status = statusType;

    switch (statusType) {
      case 'sent':
        recipient.sentAt = timestamp;
        break;
      case 'delivered':
        recipient.deliveredAt = timestamp;
        break;
      case 'read':
        recipient.readAt = timestamp;
        break;
      case 'failed':
        recipient.failedAt = timestamp;
        recipient.errorCode = status.errors?.[0]?.code;
        recipient.errorMessage = status.errors?.[0]?.message || status.errors?.[0]?.title;
        break;
    }

    await recipient.save();

    logger.info('Campaign recipient status updated', {
      requestId,
      recipientId: recipient._id.toString(),
      campaignId: recipient.campaignId.toString(),
      phoneNumber: recipient.phoneNumber,
      previousStatus,
      newStatus: statusType
    });

    // Update campaign stats
    const campaign = await Campaign.findById(recipient.campaignId);
    
    if (campaign) {
      // Recalculate campaign stats
      const stats = await campaignService.getCampaignStats(campaign._id);
      
      // Update campaign status based on stats
      if (stats.sent === campaign.recipientCount && campaign.status === 'sending') {
        campaign.status = 'completed';
        campaign.completedAt = new Date();
        await campaign.save();
        
        logger.info('Campaign completed', {
          requestId,
          campaignId: campaign._id.toString(),
          totalRecipients: campaign.recipientCount,
          delivered: stats.delivered,
          failed: stats.failed
        });
      }

      // Emit campaign progress update
      if (campaign.userId) {
        io.to(`user:${campaign.userId}`).emit('campaign:progress', {
          campaignId: campaign._id,
          stats,
          recipientUpdate: {
            recipientId: recipient._id,
            phoneNumber: recipient.phoneNumber,
            status: statusType,
            timestamp
          }
        });
      }
    }

  } catch (error) {
    logger.error('Error updating campaign recipient status', {
      requestId,
      error: error.message,
      messageId
    });
  }
}

/**
 * Handle message errors - log to AlertLog instead of non-existent MessageError model
 */
async function handleMessageError(status, io, business, requestId) {
  try {
    const error = status.errors?.[0];
    if (!error) {
      logger.warn('Message failed status without error details', {
        requestId,
        messageId: status.id
      });
      return;
    }

    // Determine severity based on error code
    let severity = 'error';
    if (error.code >= 400 && error.code < 500) {
      severity = 'warning';
    } else if (error.code >= 500) {
      severity = 'critical';
    }

    // Log error to AlertLog model instead of non-existent MessageError model
    const alertLog = await AlertLog.create({
      businessId: business._id,
      type: 'message_error',
      severity: severity,
      message: `WhatsApp message failed: ${error.title || 'Unknown error'}`,
      details: {
        whatsappMessageId: status.id,
        recipientId: status.recipient_id,
        errorCode: error.code,
        errorTitle: error.title,
        errorMessage: error.message || error.details,
        timestamp: new Date(parseInt(status.timestamp) * 1000),
        rawData: status
      }
    });

    logger.error('Message error logged to AlertLog', {
      requestId,
      alertLogId: alertLog._id.toString(),
      errorCode: error.code,
      errorTitle: error.title,
      severity,
      recipientId: status.recipient_id
    });

    // Emit message error event
    io.to(`business:${business._id}`).emit('message:error', {
      alertLogId: alertLog._id,
      whatsappMessageId: status.id,
      recipientId: status.recipient_id,
      errorCode: error.code,
      errorTitle: error.title,
      errorMessage: error.message || error.details,
      severity,
      timestamp: new Date(parseInt(status.timestamp) * 1000)
    });

  } catch (error) {
    logger.error('Error creating alert log for message error', {
      requestId,
      error: error.message,
      messageId: status?.id
    });
  }
}

/**
 * Update phone number health on message failure
 */
async function updatePhoneHealthOnError(status, business, requestId) {
  try {
    const phoneNumberId = business.whatsappConfig?.phoneNumberId;
    if (!phoneNumberId) {
      logger.warn('Phone number ID not found for business', {
        requestId,
        businessId: business._id.toString()
      });
      return;
    }

    // Update phone quality metrics after error
    if (!business.phoneNumberQuality) {
      business.phoneNumberQuality = {
        currentRating: 'GREEN',
        messagingLimitTier: 1,
        currentLimit: 1000,
        qualityHistory: [],
        lastCheckedAt: new Date()
      };
    }

    // Increment error count in analytics
    if (!business.analytics) business.analytics = {};
    business.analytics.messageErrors = (business.analytics.messageErrors || 0) + 1;
    business.analytics.lastErrorAt = new Date(parseInt(status.timestamp) * 1000);
    
    await business.save();

    logger.info('Phone health updated after error', {
      requestId,
      businessId: business._id.toString(),
      totalErrors: business.analytics.messageErrors
    });

  } catch (error) {
    logger.error('Error updating phone health', {
      requestId,
      error: error.message
    });
  }
}

/**
 * Track template analytics - use Template model's usage field instead of non-existent TemplateAnalytics model
 */
async function trackTemplateAnalytics(
  businessId,
  templateId,
  templateName,
  statusType,
  data = {}
) {
  try {
    // If we have a specific templateId, update that template's usage stats
    if (templateId) {
      const template = await Template.findById(templateId);
      
      if (template) {
        // Increment appropriate counter in template's usage field
        switch (statusType) {
          case 'sent':
            template.usage.sent = (template.usage.sent || 0) + 1;
            template.usage.lastSentAt = new Date();
            break;
          case 'delivered':
            template.usage.delivered = (template.usage.delivered || 0) + 1;
            break;
          case 'read':
            template.usage.read = (template.usage.read || 0) + 1;
            break;
          case 'failed':
            template.usage.failed = (template.usage.failed || 0) + 1;
            break;
        }

        await template.save();

        logger.debug('Template usage stats updated', {
          requestId: data.requestId,
          templateId: templateId.toString(),
          statusType,
          sent: template.usage.sent,
          delivered: template.usage.delivered
        });
      }
    } else {
      // No specific template - just log it
      logger.debug('Template analytics tracked without templateId', {
        requestId: data.requestId,
        businessId: businessId.toString(),
        statusType
      });
    }

  } catch (error) {
    logger.error('Error tracking template analytics', {
      requestId: data.requestId,
      error: error.message,
      businessId: businessId?.toString(),
      templateId: templateId?.toString()
    });
  }
}

module.exports = {
  handleMessageStatus,
  handleMessageError,
  trackTemplateAnalytics
};
