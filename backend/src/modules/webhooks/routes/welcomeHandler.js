/**
 * Welcome Message Handler - Send automatic welcome messages to new contacts
 * @module routes/webhooks/welcomeHandler
 */

const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../../../common/constants');

/**
 * Welcome Message Constants
 */
const WELCOME_MESSAGE_STRATEGY = {
  TEMPLATE: 'template',
  TEXT: 'text'
};

const TEMPLATE_STATUS = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected'
};

const MESSAGE_DIRECTION = {
  INCOMING: 'in',
  OUTGOING: 'out'
};

const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Send automatic welcome message to new contact
 */
async function sendWelcomeMessage(conversation, business, io) {
  const startTime = Date.now();
  
  try {
    // Validate inputs
    if (!conversation || !business) {
      logger.error('sendWelcomeMessage called with invalid parameters', {
        hasConversation: !!conversation,
        hasBusiness: !!business,
        code: ERROR_CODES.VALIDATION_ERROR
      });
      return;
    }

    const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
    
    const config = business.settings?.welcomeMessage;
    
    if (!config || !config.enabled) {
      logger.debug('Welcome messages disabled for this business', {
        businessId: business._id.toString(),
        conversationId: conversation._id.toString()
      });
      return;
    }
    
    const credentials = await business.getWhatsAppCredentials();
    if (!credentials) {
      logger.error('No WhatsApp credentials found for business', {
        businessId: business._id.toString(),
        code: ERROR_CODES.CONFIGURATION_ERROR
      });
      return;
    }

    const whatsappService = new WhatsAppService(credentials);

    // Add delay if configured
    if (config.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, config.delay * TIME_CONSTANTS.SECOND_MS));
    }

    // Check business hours
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
    
    if (config.strategy === WELCOME_MESSAGE_STRATEGY.TEMPLATE && config.templateId) {
      const welcomeTemplate = config.templateId;

      if (welcomeTemplate.status === TEMPLATE_STATUS.APPROVED) {
        logger.info('Sending template welcome message', {
          templateName: welcomeTemplate.name,
          businessId: business._id.toString(),
          conversationId: conversation._id.toString()
        });
        
        const result = await whatsappService.sendTemplateMessage(
          conversation.contact.phoneNumber,
          welcomeTemplate.name,
          welcomeTemplate.language || 'en'
        );

        if (result.success) {
          await conversation.addMessage({
            whatsappMessageId: result.messageId,
            from: business.whatsappConfig.phoneNumberId,
            to: conversation.contact.phoneNumber,
            direction: MESSAGE_DIRECTION.OUTGOING,
            type: 'template',
            content: {
              text: welcomeTemplate.components?.find(c => c.type === 'BODY')?.text || 'Welcome message',
              templateName: welcomeTemplate.name
            },
            status: MESSAGE_STATUS.SENT,
            timestamp: new Date()
          });

          logger.info('Welcome template sent successfully', {
            messageId: result.messageId,
            templateName: welcomeTemplate.name,
            conversationId: conversation._id.toString(),
            processingTime: `${Date.now() - startTime}ms`
          });
          
          if (io) {
            io.to(`user:${conversation.userId}`).emit('message:sent', {
              conversationId: conversation._id.toString(),
              type: 'welcome',
              timestamp: new Date().toISOString()
            });
          }
          return;
        }
      }
    }
    
    // Option 2: Send text message
    logger.info('Sending text welcome message', {
      businessId: business._id.toString(),
      conversationId: conversation._id.toString()
    });
    
    const result = await whatsappService.sendTextMessage(
      conversation.contact.phoneNumber,
      messageText
    );

    if (result.success) {
      await conversation.addMessage({
        whatsappMessageId: result.messageId,
        from: business.whatsappConfig?.phoneNumberId || 'system',
        to: conversation.contact.phoneNumber,
        direction: MESSAGE_DIRECTION.OUTGOING,
        type: 'text',
        content: {
          text: messageText
        },
        status: MESSAGE_STATUS.SENT,
        timestamp: new Date()
      });

      logger.info('Welcome text sent successfully', {
        messageId: result.messageId,
        conversationId: conversation._id.toString(),
        processingTime: `${Date.now() - startTime}ms`
      });
    }

    if (io) {
      io.to(`user:${conversation.userId}`).emit('message:sent', {
        conversationId: conversation._id.toString(),
        type: 'welcome',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Error sending welcome message', {
      error: error.message,
      stack: error.stack,
      businessId: business?._id?.toString(),
      conversationId: conversation?._id?.toString(),
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      processingTime: `${Date.now() - startTime}ms`
    });
    throw error;
  }
}

/**
 * Check if current time is within business hours
 */
function checkBusinessHours(config) {
  if (!config?.enabled) return true;
  
  try {
    const now = new Date();
    const dayOfWeek = DAYS_OF_WEEK[now.getDay()];
    const hours = config.hours?.[dayOfWeek];
    
    if (!hours || !hours.start || !hours.end) {
      logger.debug('Business hours not configured for day', { dayOfWeek });
      return false;
    }
    
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return currentTime >= hours.start && currentTime <= hours.end;
  } catch (error) {
    logger.error('Error checking business hours', {
      error: error.message,
      code: ERROR_CODES.INTERNAL_ERROR
    });
    return true; // Default to allowing messages if check fails
  }
}

module.exports = {
  sendWelcomeMessage,
  checkBusinessHours
};
