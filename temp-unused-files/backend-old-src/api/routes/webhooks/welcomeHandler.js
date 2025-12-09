/**
 * Welcome Message Handler - Send automatic welcome messages to new contacts
 * @module routes/webhooks/welcomeHandler
 */

/**
 * Send automatic welcome message to new contact
 */
async function sendWelcomeMessage(conversation, business, io) {
  try { 
    const WhatsAppService = require('../../../services/whatsapp/whatsappService');
    
    const config = business.settings?.welcomeMessage;
    
    if (!config || !config.enabled) {
      console.log('⏭️ Welcome messages disabled for this business');
      return;
    }
    
    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Add delay if configured
    if (config.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
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
    
    // Option 1: Use template
    if (config.strategy === 'template' && config.templateId) {
      const welcomeTemplate = config.templateId;

      if (welcomeTemplate.status === 'approved') {
        console.log(`📤 Sending template welcome message: ${welcomeTemplate.name}`);
        
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
            direction: 'outgoing',
            type: 'template',
            content: {
              text: welcomeTemplate.components?.find(c => c.type === 'BODY')?.text || 'Welcome message',
              templateName: welcomeTemplate.name
            },
            status: 'sent',
            timestamp: new Date()
          });

          console.log(`✅ Welcome template sent: ${result.messageId}`);
          
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
    console.log(`📤 Sending text welcome message`);
    
    const result = await whatsappService.sendTextMessage(
      conversation.contact.phoneNumber,
      messageText
    );

    if (result.success) {
      await conversation.addMessage({
        whatsappMessageId: result.messageId,
        from: business.whatsappConfig?.phoneNumberId || 'system',
        to: conversation.contact.phoneNumber,
        direction: 'outgoing',
        type: 'text',
        content: {
          text: messageText
        },
        status: 'sent',
        timestamp: new Date()
      });

      console.log(`✅ Welcome text sent: ${result.messageId}`);
    }

    if (io) {
      io.to(`user:${conversation.userId}`).emit('message:sent', {
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

/**
 * Check if current time is within business hours
 */
function checkBusinessHours(config) {
  if (!config.enabled) return true;
  
  try {
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const hours = config.hours[dayOfWeek];
    
    if (!hours) return false;
    
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return currentTime >= hours.start && currentTime <= hours.end;
  } catch (error) {
    console.error('Error checking business hours:', error);
    return true;
  }
}

module.exports = {
  sendWelcomeMessage,
  checkBusinessHours
};
