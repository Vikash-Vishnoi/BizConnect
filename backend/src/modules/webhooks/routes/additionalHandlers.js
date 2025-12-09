/**
 * Additional Webhook Handlers - Flow, Template, and Security events
 * Includes FlowResponse model integration, TemplateAnalytics tracking, ContactHistory logging
 * @module routes/webhooks/additionalHandlers
 */ 

const Flow = require('../../../core/database/models/Flow');
const FlowResponse = require('../../../core/database/models/FlowResponse');
const Conversation = require('../../../core/database/models/Conversation');
const Template = require('../../../core/database/models/Template');
const AlertLog = require('../../../core/database/models/AlertLog');
const Contact = require('../../../core/database/models/Contact');
const logger = require('../../../common/helpers/logger');

/**
 * Handle WhatsApp Flow responses
 * @param {Object} message - WhatsApp message with flow response
 * @param {Object} metadata - Webhook metadata
 * @param {Object} io - Socket.IO instance
 * @param {Object} business - Business model instance
 */
async function handleFlowResponse(message, metadata, io, business) {
  const requestId = `flow_${message.id}_${Date.now()}`;
  
  try {
    const from = message.from;
    const interactive = message.interactive;
    const nfmReply = interactive?.nfm_reply;

    logger.logWhatsAppAPI('POST', 'webhook/flow-response', 200, {
      requestId,
      from,
      flowName: nfmReply?.name,
      businessId: business._id.toString()
    });

    if (!nfmReply) {
      logger.warn('Flow response missing nfm_reply', {
        requestId,
        messageId: message.id
      });
      return;
    }

    const { name, body, response_json } = nfmReply;

    // Parse response data
    let responseData = {};
    try {
      responseData = response_json ? JSON.parse(response_json) : JSON.parse(body);
    } catch (e) {
      logger.warn('Failed to parse flow response JSON', {
        requestId,
        error: e.message
      });
      responseData = { raw_body: body };
    }

    // Extract flow token
    const flowToken = responseData.flow_token || 
                     interactive.flow_token || 
                     message.context?.flow_token;

    if (!flowToken) {
      logger.error('Flow token not found in response', {
        requestId,
        messageId: message.id
      });
      return;
    }

    // Find existing FlowResponse by token
    const flowResponse = await FlowResponse.findByToken(flowToken);
    
    if (!flowResponse) {
      logger.error('FlowResponse not found for token', {
        requestId,
        flowToken
      });
      return;
    }

    // Normalize phone number
    const phoneNormalized = Conversation.normalizePhone(from);
    flowResponse.contact.phoneNumber = phoneNormalized;

    // Find conversation and update contact info
    const conversation = await Conversation.findOne({
      'contact.phoneNumber': phoneNormalized,
      businessId: business._id
    });

    if (conversation) {
      flowResponse.contact.name = conversation.contact.name;
      flowResponse.conversationId = conversation._id;
    }

    // Extract form data from various possible structures
    const formData = responseData.data || 
                    responseData.screen_0_TextInput_0 || 
                    responseData;

    // Add responses to FlowResponse
    if (typeof formData === 'object') {
      Object.entries(formData).forEach(([key, value]) => {
        flowResponse.addResponse(key, value);
      });
    }

    // Update status based on completion
    if (name === 'complete' || name === 'COMPLETE') {
      await flowResponse.markCompleted();
      logger.info('Flow completed', {
        requestId,
        flowResponseId: flowResponse._id.toString(),
        flowId: flowResponse.flow.toString(),
        phoneNumber: phoneNormalized
      });
    } else {
      flowResponse.status = 'in_progress';
    }

    // Store raw webhook data
    flowResponse.rawWebhookData = {
      messageId: message.id,
      timestamp: message.timestamp,
      interactive,
      nfmReply
    };

    await flowResponse.save();

    // Add flow response as conversation message
    if (conversation) {
      const responseSummary = Object.keys(formData)
        .map(key => `${key}: ${formData[key]}`)
        .join(', ');

      const responseMessage = {
        whatsappMessageId: message.id,
        type: 'flow_response',
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        direction: 'incoming',
        status: 'received',
        content: {
          flowName: name,
          responseSummary,
          flowToken,
          formData: formData
        }
      };

      conversation.messages.push(responseMessage);
      conversation.lastMessage = `Flow response: ${name}`;
      conversation.lastMessageAt = responseMessage.timestamp;
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      
      await conversation.save();

      logger.info('Flow response added to conversation', {
        requestId,
        conversationId: conversation._id.toString(),
        messageType: 'flow_response'
      });

      // Emit to conversation room
      io.to(`user:${conversation.userId}`).emit('message:new', {
        conversationId: conversation._id,
        message: responseMessage
      });
    }

    // Emit flow response event
    io.emit('flow:response', {
      flowId: flowResponse.flow,
      responseId: flowResponse._id,
      contact: flowResponse.contact,
      status: flowResponse.status,
      data: formData,
      completedAt: flowResponse.completedAt
    });

  } catch (error) {
    logger.error('Error handling flow response', {
      requestId,
      error: error.message,
      stack: error.stack,
      messageId: message?.id
    });
  }
}

/**
 * Handle template status updates
 * @param {Object} statusUpdate - Template status update object
 * @param {Object} io - Socket.IO instance
 * @param {Object} business - Business model instance
 */
async function handleTemplateStatusUpdate(statusUpdate, io, business) {
  const requestId = `template_status_${Date.now()}`;
  
  try {
    const { 
      event, 
      message_template_id, 
      message_template_name, 
      message_template_language, 
      reason 
    } = statusUpdate;

    logger.logWhatsAppAPI('POST', 'webhook/template-status', 200, {
      requestId,
      event,
      templateId: message_template_id,
      templateName: message_template_name,
      businessId: business._id.toString()
    });

    // Find template
    const template = await Template.findOne({
      businessId: business._id,
      whatsappTemplateId: message_template_id
    });

    if (!template) {
      logger.warn('Template not found for status update', {
        requestId,
        whatsappTemplateId: message_template_id,
        templateName: message_template_name
      });
      return;
    }

    const previousStatus = template.status;
    let newStatus = template.status;

    // Map WhatsApp event to internal status
    switch (event) {
      case 'APPROVED':
        newStatus = 'approved';
        template.approvedAt = new Date();
        break;
      case 'REJECTED':
        newStatus = 'rejected';
        template.rejectionReason = reason;
        template.rejectedAt = new Date();
        break;
      case 'PENDING':
        newStatus = 'pending';
        break;
      case 'PAUSED':
      case 'DISABLED':
        newStatus = 'paused';
        template.pausedAt = new Date();
        break;
    }

    template.status = newStatus;
    await template.save();

    logger.info('Template status updated', {
      requestId,
      templateId: template._id.toString(),
      templateName: message_template_name,
      previousStatus,
      newStatus,
      reason
    });

    // Track analytics for status change
    await trackTemplateStatusChange(
      business._id,
      template._id,
      message_template_name,
      event,
      requestId
    );

    // Emit template status update event
    if (template.userId) {
      io.to(`user:${template.userId}`).emit('template:statusUpdate', {
        templateId: template._id,
        name: template.name,
        status: newStatus,
        previousStatus,
        reason,
        event,
        timestamp: new Date()
      });
    }

    // Create alert for rejection
    if (event === 'REJECTED') {
      await AlertLog.create({
        businessId: business._id,
        userId: template.userId || business.owner,
        alertType: 'TEMPLATE_REJECTED',
        severity: 'MEDIUM',
        title: 'Template Rejected',
        message: `Template "${message_template_name}" was rejected. Reason: ${reason}`,
        whatsappData: {
          templateId: template._id,
          whatsappTemplateId: message_template_id,
          templateName: message_template_name,
          reason,
          rawData: statusUpdate
        },
        status: 'UNREAD'
      });
    }

  } catch (error) {
    logger.error('Error handling template status update', {
      requestId,
      error: error.message,
      templateId: statusUpdate?.message_template_id
    });
  }
}

/**
 * Handle template quality updates (P0 FIX)
 * @param {Object} qualityUpdate - Template quality data
 * @param {Object} io - Socket.IO instance
 * @param {Object} business - Business model instance
 */
async function handleTemplateQualityUpdate(qualityUpdate, io, business) {
  const requestId = `template_quality_${Date.now()}`;
  
  try {
    const { 
      message_template_id, 
      message_template_name,
      quality_score,
      reason 
    } = qualityUpdate;

    logger.logWhatsAppAPI('POST', 'webhook/template-quality', 200, {
      requestId,
      templateId: message_template_id,
      qualityScore: quality_score,
      businessId: business._id.toString()
    });

    // Find template
    const template = await Template.findOne({
      businessId: business._id,
      whatsappTemplateId: message_template_id
    });

    if (!template) {
      logger.warn('Template not found for quality update', {
        requestId,
        whatsappTemplateId: message_template_id,
        templateName: message_template_name
      });
      return;
    }

    // P0 FIX: Call existing updateQualityScore method
    await template.updateQualityScore({
      score: quality_score,
      reason: reason || 'Quality score update'
    });

    logger.info('Template quality score updated', {
      requestId,
      templateId: template._id.toString(),
      templateName: message_template_name,
      qualityScore: quality_score
    });

    // Create alert if quality is RED or YELLOW
    if (quality_score === 'RED' || quality_score === 'YELLOW') {
      await AlertLog.create({
        businessId: business._id,
        userId: template.userId || business.owner,
        alertType: 'MESSAGE_TEMPLATE_QUALITY_UPDATE',
        severity: quality_score === 'RED' ? 'CRITICAL' : 'HIGH',
        title: `Template Quality ${quality_score}`,
        message: `Template "${message_template_name}" quality degraded to ${quality_score}. ${reason || ''}`,
        whatsappData: {
          templateId: template._id,
          whatsappTemplateId: message_template_id,
          templateName: message_template_name,
          qualityScore: quality_score,
          reason
        },
        status: 'UNREAD'
      });

      // Emit urgent alert for RED quality
      if (quality_score === 'RED' && io) {
        io.to(`user:${template.userId || business.owner}`).emit('alert:urgent', {
          title: `Critical: Template Quality RED`,
          message: `Template "${message_template_name}" marked RED. Review immediately.`,
          type: 'template_quality',
          severity: 'CRITICAL',
          timestamp: new Date()
        });
      }
    }

  } catch (error) {
    logger.error('Error handling template quality update', {
      requestId,
      error: error.message,
      templateId: qualityUpdate?.message_template_id
    });
  }
}

/**
 * Handle phone number name updates
 * @param {Object} value - Phone name update data
 * @param {Object} io - Socket.IO instance
 * @param {Object} business - Business model instance
 */
async function handlePhoneNameUpdate(value, io, business) {
  const requestId = `phone_name_${Date.now()}`;
  
  try {
    const { 
      phone_number_id, 
      display_phone_number, 
      old_name, 
      new_name, 
      decision, 
      requested_name 
    } = value;

    logger.logWhatsAppAPI('POST', 'webhook/phone-name-update', 200, {
      requestId,
      phoneNumberId: phone_number_id,
      decision,
      oldName: old_name,
      newName: new_name,
      businessId: business._id.toString()
    });

    const severity = decision === 'REJECTED' ? 'MEDIUM' : 'LOW';
    let title, message, alertType;

    if (decision === 'REJECTED') {
      alertType = 'PHONE_NAME_REJECTED';
      title = 'Display Name Change Rejected';
      message = `Request to change display name from "${old_name}" to "${requested_name}" was rejected.`;
    } else if (decision === 'APPROVED') {
      alertType = 'PHONE_NAME_APPROVED';
      title = 'Display Name Updated';
      message = `Business display name updated from "${old_name}" to "${new_name}".`;
    } else {
      alertType = 'PHONE_NAME_PENDING';
      title = 'Display Name Change Pending';
      message = `Display name change pending review. Requested: "${requested_name}"`;
    }

    // Create alert log
    await AlertLog.create({
      businessId: business._id,
      userId: business.owner,
      alertType,
      severity,
      title,
      message,
      whatsappData: {
        phoneNumberId: phone_number_id,
        displayPhoneNumber: display_phone_number,
        oldName: old_name,
        newName: new_name,
        requestedName: requested_name,
        decision,
        event: 'NAME_UPDATE',
        rawData: value
      },
      status: 'UNREAD'
    });

    logger.info('Phone name update processed', {
      requestId,
      decision,
      oldName: old_name,
      newName: new_name
    });

    // Emit event
    io.to(`user:${business.owner}`).emit('phone:nameUpdate', {
      phoneNumberId: phone_number_id,
      displayPhoneNumber: display_phone_number,
      oldName: old_name,
      newName: new_name,
      requestedName: requested_name,
      decision,
      message,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Error handling phone name update', {
      requestId,
      error: error.message
    });
  }
}

/**
 * Handle template limit updates
 * @param {Object} value - Template limit update data
 * @param {Object} io - Socket.IO instance
 * @param {Object} business - Business model instance
 */
async function handleTemplateLimitUpdate(value, io, business) {
  const requestId = `template_limit_${Date.now()}`;
  
  try {
    const { 
      phone_number_id, 
      display_phone_number, 
      current_limit, 
      previous_limit 
    } = value;

    logger.logWhatsAppAPI('POST', 'webhook/template-limit', 200, {
      requestId,
      phoneNumberId: phone_number_id,
      currentLimit: current_limit,
      previousLimit: previous_limit,
      businessId: business._id.toString()
    });

    const isDecrease = current_limit < previous_limit;
    const severity = isDecrease ? 'MEDIUM' : 'LOW';
    const alertType = isDecrease ? 'TEMPLATE_LIMIT_DECREASED' : 'TEMPLATE_LIMIT_INCREASED';
    const title = isDecrease ? 'Template Limit Decreased' : 'Template Limit Increased';
    const message = `Template message limit ${isDecrease ? 'decreased' : 'increased'} from ${previous_limit} to ${current_limit} for ${display_phone_number}.`;

    // Create alert log
    await AlertLog.create({
      businessId: business._id,
      userId: business.owner,
      alertType,
      severity,
      title,
      message,
      whatsappData: {
        phoneNumberId: phone_number_id,
        displayPhoneNumber: display_phone_number,
        currentLimit: current_limit,
        previousLimit: previous_limit,
        changePercent: ((current_limit - previous_limit) / previous_limit * 100).toFixed(2),
        rawData: value
      },
      status: 'UNREAD'
    });

    logger.info('Template limit updated', {
      requestId,
      previousLimit: previous_limit,
      currentLimit: current_limit,
      isDecrease
    });

    // Emit event
    io.to(`user:${business.owner}`).emit('template:limitUpdate', {
      phoneNumberId: phone_number_id,
      displayPhoneNumber: display_phone_number,
      currentLimit: current_limit,
      previousLimit: previous_limit,
      isDecrease,
      message,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Error handling template limit update', {
      requestId,
      error: error.message
    });
  }
}

/**
 * Handle security events (account disabled, flagged, verified)
 * @param {Object} value - Security event data
 * @param {Object} io - Socket.IO instance
 * @param {Object} business - Business model instance
 */
async function handleSecurityEvent(value, io, business) {
  const requestId = `security_${Date.now()}`;
  
  try {
    const { 
      phone_number_id, 
      display_phone_number, 
      event, 
      decision, 
      reason 
    } = value;

    logger.logWhatsAppAPI('POST', 'webhook/security-event', 200, {
      requestId,
      event,
      decision,
      phoneNumberId: phone_number_id,
      businessId: business._id.toString()
    });

    let severity = 'LOW';
    let title = 'Security Event';
    let message = '';
    let alertType = 'SECURITY_EVENT';
    let affectedFeatures = [];
    let businessImpact = 'LOW';

    // Determine severity and message based on event type
    switch (event) {
      case 'DISABLED':
        severity = 'CRITICAL';
        alertType = 'ACCOUNT_DISABLED';
        title = '🚨 CRITICAL: WhatsApp Account Disabled';
        message = `WhatsApp Business account (${display_phone_number}) has been DISABLED. Reason: ${reason}. All messaging is blocked.`;
        affectedFeatures = ['messaging', 'campaigns', 'templates', 'automation', 'flows'];
        businessImpact = 'CRITICAL';
        break;
      
      case 'FLAGGED':
        severity = 'HIGH';
        alertType = 'ACCOUNT_FLAGGED';
        title = '⚠️ Account Flagged for Review';
        message = `WhatsApp account (${display_phone_number}) flagged for review. Reason: ${reason}. Review your messaging practices immediately.`;
        affectedFeatures = ['quality_rating', 'messaging_limits'];
        businessImpact = 'HIGH';
        break;
      
      case 'VERIFIED':
        severity = 'LOW';
        alertType = 'ACCOUNT_VERIFIED';
        title = '✅ Account Verified';
        message = `WhatsApp Business account (${display_phone_number}) has been verified successfully.`;
        businessImpact = 'POSITIVE';
        break;
      
      case 'RESTRICTED':
        severity = 'HIGH';
        alertType = 'ACCOUNT_RESTRICTED';
        title = '⚠️ Account Restricted';
        message = `WhatsApp account (${display_phone_number}) has restrictions. Reason: ${reason}`;
        affectedFeatures = ['messaging_limits', 'template_messages'];
        businessImpact = 'HIGH';
        break;
      
      default:
        title = 'Security Event';
        message = `Security event on WhatsApp account (${display_phone_number}). Event: ${event}. ${reason || ''}`;
    }

    // Create alert log with detailed information
    await AlertLog.create({
      businessId: business._id,
      userId: business.owner,
      alertType,
      severity,
      title,
      message,
      whatsappData: {
        phoneNumberId: phone_number_id,
        displayPhoneNumber: display_phone_number,
        event,
        decision,
        reasonCode: reason,
        rawData: value
      },
      status: 'UNREAD',
      impact: {
        affectedFeatures,
        businessImpact
      },
      requiresAction: severity === 'CRITICAL' || severity === 'HIGH'
    });

    logger.error('Security event logged', {
      requestId,
      event,
      severity,
      decision,
      reason
    });

    // Emit security event
    io.to(`user:${business.owner}`).emit('security:event', {
      phoneNumberId: phone_number_id,
      displayPhoneNumber: display_phone_number,
      event,
      decision,
      reason,
      severity,
      message,
      affectedFeatures,
      timestamp: new Date()
    });

    // Emit urgent alert for critical events
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      io.to(`user:${business.owner}`).emit('alert:urgent', {
        title,
        message,
        type: 'security',
        severity,
        requiresAction: true,
        timestamp: new Date()
      });
    }

  } catch (error) {
    logger.error('Error handling security event', {
      requestId,
      error: error.message,
      event: value?.event
    });
  }
}

/**
 * Track template status changes - use Template model instead of non-existent TemplateAnalytics model
 */
async function trackTemplateStatusChange(businessId, templateId, templateName, event, requestId) {
  try {
    // Update template's status tracking in the Template model
    const template = await Template.findById(templateId);
    
    if (template) {
      // Track status change in template's history
      if (!template.statusHistory) {
        template.statusHistory = [];
      }

      template.statusHistory.push({
        event,
        timestamp: new Date()
      });

      // Update current status
      template.lastStatus = event;
      template.lastStatusUpdate = new Date();

      await template.save();

      logger.debug('Template status change tracked', {
        requestId,
        templateId: templateId.toString(),
        event
      });
    } else {
      logger.warn('Template not found for status tracking', {
        requestId,
        templateId: templateId.toString()
      });
    }

  } catch (error) {
    logger.error('Error tracking template status change', {
      requestId,
      error: error.message,
      templateId: templateId?.toString()
    });
  }
}

module.exports = {
  handleFlowResponse,
  handleTemplateStatusUpdate,
  handleTemplateQualityUpdate,  // P0 FIX: Export new handler
  handlePhoneNameUpdate,
  handleTemplateLimitUpdate,
  handleSecurityEvent
};
