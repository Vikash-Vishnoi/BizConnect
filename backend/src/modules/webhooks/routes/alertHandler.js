/**
 * Alert & Contact Handlers - Process account alerts and contact updates
 * ✅ OPTIMIZED: Removed PhoneNumberHealth, QualityRating, ContactHistory (consolidated into Business and Contact models)
 * @module routes/webhooks/alertHandler
 */

const AlertLog = require('../../../core/database/models/AlertLog');
const Contact = require('../../../core/database/models/Contact');
const Conversation = require('../../../core/database/models/Conversation');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../../../common/constants');
const config = require('../../../config/app.config');

/**
 * Alert Handler Constants
 */
const ALERT_DEDUPLICATION_MINUTES = parseInt(config.alerts?.deduplicationMinutes || process.env.ALERT_DEDUPLICATION_MINUTES || '5');

const ALERT_SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

const QUALITY_RATINGS = {
  RED: 'RED',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
  UNKNOWN: 'UNKNOWN'
};

const ALERT_TYPES = {
  PHONE_NUMBER_QUALITY_UPDATE: 'PHONE_NUMBER_QUALITY_UPDATE',
  QUALITY_RATING_RED: 'QUALITY_RATING_RED',
  QUALITY_RATING_YELLOW: 'QUALITY_RATING_YELLOW',
  QUALITY_RATING_GREEN: 'QUALITY_RATING_GREEN',
  ACCOUNT_REINSTATED: 'ACCOUNT_REINSTATED',
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',
  ACCOUNT_RESTRICTED: 'ACCOUNT_RESTRICTED',
  MESSAGING_LIMIT_REACHED: 'MESSAGING_LIMIT_REACHED',
  TEMPLATE_PAUSED: 'TEMPLATE_PAUSED',
  UNKNOWN: 'UNKNOWN'
};

const WEBHOOK_EVENTS = {
  FLAGGED: 'FLAGGED',
  REINSTATED: 'REINSTATED',
  BANNED: 'BANNED',
  RESTRICTED: 'RESTRICTED'
};

const ALERT_STATUS = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  RESOLVED: 'RESOLVED'
};
 
/**
 * Handle account quality and status alerts
 * @param {Object} change - Change object from webhook
 * @param {Object} value - Alert value data
 * @param {Object} io - Socket.IO instance
 * @param {Object} business - Business model instance
 */
async function handleAccountAlert(change, value, io, business) {
  const requestId = `alert_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    // Validate inputs
    if (!change || !value || !business) {
      logger.error('handleAccountAlert called with invalid parameters', {
        requestId,
        hasChange: !!change,
        hasValue: !!value,
        hasBusiness: !!business,
        code: ERROR_CODES.VALIDATION_ERROR
      });
      return;
    }

    logger.logWhatsAppAPI('POST', 'webhook/account-alert', 200, {
      requestId,
      field: change.field,
      event: value.event,
      businessId: business._id.toString(),
      businessName: business.name
    });

    const ownerId = business.owner;
    const alertData = parseAccountAlert(change.field, value, requestId);

    if (!alertData) {
      logger.warn('Unable to parse account alert', {
        requestId,
        field: change.field,
        event: value.event,
        code: ERROR_CODES.VALIDATION_ERROR
      });
      return;
    }

    // Check for duplicate alert (deduplication)
    const deduplicationTime = new Date(Date.now() - ALERT_DEDUPLICATION_MINUTES * TIME_CONSTANTS.MINUTE_MS);
    const existingAlert = await AlertLog.findOne({
      businessId: business._id,
      alertType: alertData.alertType,
      'whatsappData.event': value.event,
      createdAt: { $gte: deduplicationTime }
    }).sort({ createdAt: -1 });

    if (existingAlert) {
      // Update existing alert instead of creating duplicate
      existingAlert.lastOccurredAt = new Date();
      existingAlert.occurrenceCount = (existingAlert.occurrenceCount || 1) + 1;
      await existingAlert.save();

      logger.info('Alert deduplicated (updated existing)', {
        requestId,
        alertId: existingAlert._id.toString(),
        occurrenceCount: existingAlert.occurrenceCount,
        alertType: alertData.alertType
      });

      return; // Skip creating duplicate alert
    }

    // Create new alert log
    const alert = await AlertLog.create({
      businessId: business._id,
      userId: ownerId,
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
      status: ALERT_STATUS.UNREAD,
      requiresAction: alertData.severity === ALERT_SEVERITY.CRITICAL || alertData.severity === ALERT_SEVERITY.HIGH,
      firstOccurredAt: new Date(),
      lastOccurredAt: new Date(),
      occurrenceCount: 1
    });

    logger.error('Account alert created', {
      requestId,
      alertId: alert._id.toString(),
      alertType: alertData.alertType,
      severity: alertData.severity,
      businessId: business._id.toString()
    });

    // ✅ OPTIMIZED: Removed PhoneNumberHealth tracking - using Business.health instead
    // Update business health metrics directly
    await updateBusinessHealth(business, alertData, value);

    // Emit alert event
    if (io) {
      io.to(`user:${ownerId}`).emit('alert:new', {
        alert: {
          _id: alert._id,
          alertType: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          status: alert.status,
          requiresAction: alert.requiresAction,
          createdAt: alert.createdAt
        },
        needsAttention: alert.requiresAction
      });

      // Emit urgent alert for critical severity
      if (alertData.severity === ALERT_SEVERITY.CRITICAL) {
        io.to(`user:${ownerId}`).emit('alert:urgent', {
          title: alertData.title,
          message: alertData.message,
          type: 'account_health',
          severity: ALERT_SEVERITY.CRITICAL,
          requiresAction: true,
          timestamp: new Date()
        });
      }
    }

    logger.info('Account alert processing completed', {
      requestId,
      alertId: alert._id.toString(),
      processingTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    logger.error('Error handling account alert', {
      requestId,
      businessId: business?._id?.toString(),
      error: error.message,
      stack: error.stack,
      field: change?.field,
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      processingTime: `${Date.now() - startTime}ms`
    });
  }
}

/**
 * Parse account alert data with comprehensive categorization
 */
function parseAccountAlert(field, value, requestId) {
  let alertType = ALERT_TYPES.UNKNOWN;
  let severity = ALERT_SEVERITY.MEDIUM;
  let title = 'WhatsApp Account Alert';
  let message = 'An alert was received from WhatsApp.';
  let affectedFeatures = [];
  let businessImpact = 'MEDIUM';

  try {
    if (field === 'phone_number_quality_update') {
      alertType = ALERT_TYPES.PHONE_NUMBER_QUALITY_UPDATE;
      const currentRating = value.current_limit || QUALITY_RATINGS.UNKNOWN;
      const previousRating = value.previous_limit;
      const event = value.event || '';

      if (currentRating === QUALITY_RATINGS.RED || event === WEBHOOK_EVENTS.FLAGGED) {
        severity = ALERT_SEVERITY.CRITICAL;
        alertType = ALERT_TYPES.QUALITY_RATING_RED;
        title = '🚨 CRITICAL: Account Quality Rating RED';
        message = `Phone number ${value.display_phone_number} has been flagged with RED quality rating. Messaging limits severely restricted. IMMEDIATE ACTION REQUIRED to review messaging practices.`;
        affectedFeatures = ['messaging', 'campaigns', 'templates', 'automation'];
        businessImpact = 'CRITICAL';
      } else if (currentRating === QUALITY_RATINGS.YELLOW) {
        severity = ALERT_SEVERITY.HIGH;
        alertType = ALERT_TYPES.QUALITY_RATING_YELLOW;
        title = '⚠️ WARNING: Account Quality Rating YELLOW';
        message = `Phone number ${value.display_phone_number} quality rating decreased to YELLOW. Review messaging practices to prevent further degradation.`;
        affectedFeatures = ['messaging_limits', 'template_approval'];
        businessImpact = 'HIGH';
      } else if (event === WEBHOOK_EVENTS.REINSTATED) {
        severity = ALERT_SEVERITY.LOW;
        alertType = ALERT_TYPES.ACCOUNT_REINSTATED;
        title = '✅ Account Reinstated';
        message = `Phone number ${value.display_phone_number} has been reinstated. Normal operations resumed.`;
        businessImpact = 'POSITIVE';
      } else if (currentRating === QUALITY_RATINGS.GREEN) {
        severity = ALERT_SEVERITY.LOW;
        alertType = ALERT_TYPES.QUALITY_RATING_GREEN;
        title = '✅ Account Quality: GREEN';
        message = `Phone number ${value.display_phone_number} has good quality rating (GREEN).`;
        businessImpact = 'POSITIVE';
      }

      logger.info('Quality rating alert parsed', {
        requestId,
        currentRating,
        previousRating,
        event,
        severity
      });

    } else if (field === 'account_update') {
      alertType = 'ACCOUNT_UPDATE';
      const event = value.event || 'UNKNOWN';

      if (event === 'DISABLED') {
        severity = 'CRITICAL';
        alertType = 'ACCOUNT_DISABLED';
        title = '🚨 CRITICAL: Account Disabled';
        message = `WhatsApp Business account ${value.display_phone_number} has been DISABLED. All messaging stopped.`;
        affectedFeatures = ['all'];
        businessImpact = 'CRITICAL';
      } else if (event === 'RESTRICTED') {
        severity = 'HIGH';
        alertType = 'ACCOUNT_RESTRICTED';
        title = '⚠️ Account Restricted';
        message = `Account ${value.display_phone_number} has restrictions applied.`;
        affectedFeatures = ['messaging_limits'];
        businessImpact = 'HIGH';
      } else {
        severity = 'MEDIUM';
        title = 'Account Update';
        message = `Account update event: ${event}`;
      }

    } else if (field === 'account_alerts') {
      alertType = 'ACCOUNT_WARNING';
      const eventSeverity = value.severity;

      if (eventSeverity === 'HIGH' || eventSeverity === 'CRITICAL') {
        severity = 'CRITICAL';
        title = '🚨 Critical Account Alert';
      } else {
        severity = 'HIGH';
        title = '⚠️ Account Alert';
      }

      message = value.message || value.title || 'Important account alert received from WhatsApp.';
      affectedFeatures = value.affected_features || [];
      businessImpact = eventSeverity || 'HIGH';

    } else if (field === 'message_template_quality_update') {
      alertType = 'TEMPLATE_QUALITY_UPDATE';
      severity = 'MEDIUM';
      title = 'Template Quality Update';
      message = `Template quality metrics updated for ${value.display_phone_number}.`;

    // P0 FIX: Handle policy enforcement alerts
    } else if (field === 'account_restriction') {
      alertType = 'POLICY_ENFORCEMENT';
      const decision = value.decision || 'UNKNOWN';
      
      if (decision === 'BAN') {
        severity = 'CRITICAL';
        title = '🚨 CRITICAL: Account Banned';
        message = `WhatsApp Business account has been BANNED due to policy violation: ${value.violation_type || 'Unknown'}. All services suspended.`;
        affectedFeatures = ['all'];
        businessImpact = 'CRITICAL';
      } else if (decision === 'RESTRICTION') {
        severity = 'CRITICAL';
        title = '🚨 Account Restricted - Policy Violation';
        message = `Account restricted due to policy violation: ${value.violation_type || 'Unknown'}. Review required.`;
        affectedFeatures = ['messaging', 'templates'];
        businessImpact = 'HIGH';
      } else if (decision === 'WARNING') {
        severity = 'HIGH';
        title = '⚠️ Policy Violation Warning';
        message = `Warning issued for policy violation: ${value.violation_type || 'Unknown'}.`;
        businessImpact = 'MEDIUM';
      }

    // P0 FIX: Handle tier change alerts
    } else if (field === 'messaging_limit_tier_update') {
      alertType = 'TIER_CHANGE';
      const previousTier = value.previous_tier || business.phoneNumberQuality?.messagingLimitTier;
      const newTier = value.new_tier || value.messaging_limit_tier;
      
      // Determine if upgrade or downgrade
      const tierLevels = { 'TIER_50': 1, 'TIER_250': 2, 'TIER_1K': 3, 'TIER_10K': 4, 'TIER_100K': 5, 'TIER_UNLIMITED': 6 };
      const isUpgrade = tierLevels[newTier] > tierLevels[previousTier];
      
      severity = isUpgrade ? 'LOW' : 'MEDIUM';
      alertType = isUpgrade ? 'TIER_UPGRADE' : 'TIER_DOWNGRADE';
      title = isUpgrade ? '✅ Messaging Tier Upgraded' : '⚠️ Messaging Tier Downgraded';
      message = `Messaging limit tier changed from ${previousTier} to ${newTier}.`;
      businessImpact = isUpgrade ? 'POSITIVE' : 'MEDIUM';
      affectedFeatures = ['messaging_limits'];

    // P0 FIX: Handle limit change alerts
    } else if (field === 'rate_limit_update') {
      alertType = 'LIMIT_CHANGE';
      const limitType = value.limit_type || 'messaging';
      const previousLimit = value.previous_limit;
      const newLimit = value.new_limit;
      
      severity = newLimit < previousLimit ? 'MEDIUM' : 'LOW';
      title = newLimit < previousLimit ? '⚠️ Rate Limit Decreased' : 'ℹ️ Rate Limit Updated';
      message = `${limitType} rate limit changed from ${previousLimit} to ${newLimit}.`;
      businessImpact = newLimit < previousLimit ? 'MEDIUM' : 'LOW';

    } else {
      logger.warn('Unknown alert field type', {
        requestId,
        field,
        event: value.event
      });
    }

    return {
      alertType,
      severity,
      title,
      message,
      whatsappData: {
        currentRating: value.current_limit,
        previousRating: value.previous_limit,
        event: value.event
      },
      impact: {
        affectedFeatures,
        businessImpact
      }
    };

  } catch (error) {
    logger.error('Error parsing account alert', {
      requestId,
      error: error.message,
      field
    });
    return null;
  }
}

/**
 * Update business health metrics
 */
async function updateBusinessHealth(business, alertData, value) {
  try {
    // P0 FIX: Suspend business if banned or restricted
    if (alertData.alertType === 'POLICY_ENFORCEMENT') {
      const decision = value.decision;
      if (decision === 'BAN' || decision === 'RESTRICTION') {
        business.status = 'suspended';
        logger.error('Business suspended due to policy violation', {
          businessId: business._id.toString(),
          decision,
          violationType: value.violation_type
        });
      }
    }

    // P0 FIX: Update messaging tier
    if (alertData.alertType === 'TIER_CHANGE' || alertData.alertType === 'TIER_UPGRADE' || alertData.alertType === 'TIER_DOWNGRADE') {
      const newTier = value.new_tier || value.messaging_limit_tier;
      if (newTier) {
        if (!business.phoneNumberQuality) {
          business.phoneNumberQuality = {};
        }
        business.phoneNumberQuality.messagingLimitTier = newTier;
      }
    }

    // Update phone quality from alert
    const qualityScore = value.current_limit || business.phoneNumberQuality?.qualityScore;
    if (qualityScore && qualityScore !== business.phoneNumberQuality?.qualityScore) {
      await business.updatePhoneQuality({
        score: qualityScore,
        rating: value.quality_rating,
        tier: value.messaging_limit_tier,
        reason: alertData.message
      });
    }

    // Update health status
    if (!business.health) {
      business.health = {};
    }
    business.health.lastChecked = new Date();

    if (alertData.severity === 'CRITICAL') {
      business.health.lastError = {
        message: alertData.message,
        timestamp: new Date()
      };
    }

    if (value.event === 'DISABLED') {
      business.health.isActive = false;
    } else if (value.event === 'REINSTATED') {
      business.health.isActive = true;
    }

    await business.save();

  } catch (error) {
    logger.error('Error updating business health', {
      error: error.message,
      businessId: business._id.toString()
    });
  }
}

/**
 * Handle contact profile changes
 * @param {Object} change - Change object from webhook
 * @param {Object} value - Contact value data
 * @param {Object} io - Socket.IO instance
 * @param {Object} business - Business model instance
 */
async function handleContactUpdate(change, value, io, business) {
  const requestId = `contact_update_${Date.now()}`;
  
  try {
    logger.logWhatsAppAPI('POST', 'webhook/contact-update', 200, {
      requestId,
      businessId: business._id.toString(),
      contactsCount: value.contacts?.length || 0
    });

    const contacts = value.contacts || [];

    for (const contact of contacts) {
      const phoneNumber = contact.wa_id || contact.phone;
      if (!phoneNumber) {
        logger.warn('Contact missing phone number', { requestId });
        continue;
      }

      const phoneNormalized = Conversation.normalizePhone(phoneNumber);

      // Detect changes
      const changes = detectContactChanges(contact, requestId);

      // ❌ REMOVED: ContactHistory recording - ContactHistory model doesn't exist
      // Contact changes should be tracked in Contact model's embedded history arrays
      logger.debug('Contact changes detected (ContactHistory tracking disabled)', {
        requestId,
        phoneNumber: phoneNormalized,
        changesCount: changes.length
      });

      // Emit contact update events
      for (const changeDetail of changes) {
        logger.info('Contact change detected', {
          requestId,
          phoneNumber: phoneNormalized,
          eventType: changeDetail.eventType
        });

        // Emit contact update event
        if (io) {
          io.to(`business:${business._id}`).emit('contact:update', {
            phoneNumber: phoneNormalized,
            eventType: changeDetail.eventType,
            changeDetails: changeDetail.details,
            timestamp: new Date()
          });
        }
      }

      // Update Contact model
      await updateContactModel(business._id, phoneNormalized, contact, requestId);

      // Update conversation contact info
      await updateConversationContact(business._id, phoneNormalized, contact, requestId);
    }

    logger.info('Contact updates processed', {
      requestId,
      contactsProcessed: contacts.length
    });

  } catch (error) {
    logger.error('Error handling contact update', {
      requestId,
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Detect contact changes
 */
function detectContactChanges(contact, requestId) {
  const changes = [];

  try {
    if (contact.profile) {
      if (contact.profile.name) {
        changes.push({
          eventType: 'name_change',
          details: {
            field: 'name',
            newValue: contact.profile.name,
            description: `Name updated to "${contact.profile.name}"`
          }
        });
      }

      if (contact.profile.photo) {
        changes.push({
          eventType: 'photo_update',
          details: {
            field: 'photo',
            newValue: contact.profile.photo,
            description: 'Profile photo updated'
          }
        });
      }

      if (contact.profile.status) {
        changes.push({
          eventType: 'status_change',
          details: {
            field: 'status',
            newValue: contact.profile.status,
            description: `Status updated to "${contact.profile.status}"`
          }
        });
      }
    }

    logger.debug('Contact changes detected', {
      requestId,
      changesCount: changes.length
    });

  } catch (error) {
    logger.error('Error detecting contact changes', {
      requestId,
      error: error.message
    });
  }

  return changes;
}

/**
 * Update Contact model with new information
 */
async function updateContactModel(businessId, phoneNumber, contactData, requestId) {
  try {
    let contact = await Contact.findOne({
      businessId,
      phoneNumber
    });

    if (!contact) {
      logger.debug('Contact not found, skipping update', {
        requestId,
        phoneNumber
      });
      return;
    }

    let updated = false;

    if (contactData.profile?.name && contact.name !== contactData.profile.name) {
      contact.name = contactData.profile.name;
      updated = true;
    }

    if (contactData.profile?.photo) {
      contact.profilePicture = contactData.profile.photo;
      updated = true;
    }

    if (updated) {
      contact.lastUpdatedAt = new Date();
      await contact.save();

      logger.info('Contact model updated', {
        requestId,
        contactId: contact._id.toString(),
        phoneNumber
      });
    }

  } catch (error) {
    logger.error('Error updating contact model', {
      requestId,
      error: error.message,
      phoneNumber
    });
  }
}

/**
 * Update conversation with new contact info
 */
async function updateConversationContact(businessId, phoneNumber, contactData, requestId) {
  try {
    const conversations = await Conversation.find({
      businessId,
      'contact.phoneNumber': phoneNumber
    });

    for (const conversation of conversations) {
      let updated = false;

      if (contactData.profile?.name && conversation.contact.name !== contactData.profile.name) {
        conversation.contact.name = contactData.profile.name;
        updated = true;
      }

      if (contactData.profile?.photo && conversation.contact.profilePicture !== contactData.profile.photo) {
        conversation.contact.profilePicture = contactData.profile.photo;
        updated = true;
      }

      if (updated) {
        await conversation.save();

        logger.info('Conversation contact updated', {
          requestId,
          conversationId: conversation._id.toString(),
          phoneNumber
        });
      }
    }

  } catch (error) {
    logger.error('Error updating conversation contact', {
      requestId,
      error: error.message,
      phoneNumber
    });
  }
}

module.exports = {
  handleAccountAlert,
  parseAccountAlert,
  handleContactUpdate,
  detectContactChanges,
  updateConversationContact
};
