const mongoose = require('mongoose');

/** 
 * AlertLog Model - WhatsApp Account Alerts
 * 
 * Stores account quality, policy, and tier alerts from WhatsApp Business API.
 * Critical for monitoring account health and preventing bans.
 * 
 * WhatsApp Alert Types:
 * - ACCOUNT_UPDATE: Business verification status changes
 * - ACCOUNT_WARNING: Quality rating warnings
 * - MESSAGE_TEMPLATE_QUALITY_UPDATE: Template quality issues
 * - MESSAGE_TEMPLATE_STATUS_UPDATE: Template approval status
 * - PHONE_NUMBER_QUALITY_UPDATE: Phone number quality rating
 * - PHONE_NUMBER_NAME_UPDATE: Display name changes
 */

const alertLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  alertType: {
    type: String,
    enum: [
      'ACCOUNT_UPDATE',
      'ACCOUNT_WARNING',
      'MESSAGE_TEMPLATE_QUALITY_UPDATE',
      'MESSAGE_TEMPLATE_STATUS_UPDATE',
      'PHONE_NUMBER_QUALITY_UPDATE',
      'PHONE_NUMBER_NAME_UPDATE',
      'POLICY_ENFORCEMENT',
      'QUALITY_SCORE',
      'TIER_CHANGE',
      'LIMIT_CHANGE',
      'UNKNOWN'
    ],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  whatsappData: {
    phoneNumberId: String,
    currentRating: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN']
    },
    
    previousRating: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN']
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100
    },
    messagingLimitTier: {
      type: String,
      enum: ['TIER_1K', 'TIER_10K', 'TIER_100K', 'TIER_UNLIMITED', 'UNKNOWN']
    },
    decision: String,
    event: String,
    templateId: String,
    templateName: String,
    templateLanguage: String,
    templateCategory: String,
    reasonCode: String
  },
  status: {
    type: String,
    enum: ['UNREAD', 'READ', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED'],
    default: 'UNREAD',
    index: true
  },
  resolvedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

alertLogSchema.index({ userId: 1, createdAt: -1 });
alertLogSchema.index({ userId: 1, status: 1, severity: 1 });
alertLogSchema.index({ alertType: 1, createdAt: -1 });
alertLogSchema.index({ 'whatsappData.phoneNumberId': 1 });
alertLogSchema.index({ severity: 1, status: 1 });

/**
 * Mark alert as read
 */
alertLogSchema.methods.markAsRead = async function() {
  if (this.status === 'UNREAD') {
    this.status = 'READ';
    await this.save();
  }
};

/**
 * Mark alert as acknowledged
 */
alertLogSchema.methods.acknowledge = async function() {
  this.status = 'ACKNOWLEDGED';
  await this.save();
};

/**
 * Mark alert as resolved
 */
alertLogSchema.methods.resolve = async function() {
  this.status = 'RESOLVED';
  this.resolvedAt = new Date();
  await this.save();
};

/**
 * Create alert from WhatsApp webhook
 */
alertLogSchema.statics.createFromWebhook = async function(webhookData, userId) {
  const {alertType, severity, title, message, whatsappData} = parseWebhookAlert(webhookData);
  
  const alert = await this.create({
    userId: userId,
    alertType: alertType,
    severity: severity,
    title: title,
    message: message,
    whatsappData: whatsappData
  });
  
  return alert;
};

/**
 * Get unresolved critical alerts
 */
alertLogSchema.statics.getUnresolvedCritical = async function(userId) {
  return await this.find({
    userId: userId,
    severity: { $in: ['CRITICAL', 'HIGH'] },
    status: { $in: ['UNREAD', 'READ', 'ACKNOWLEDGED'] }
  }).sort({ createdAt: -1 });
};

/**
 * Get alert statistics (simplified)
 */
alertLogSchema.statics.getStats = async function(userId, startDate, endDate) {
  const match = {
    userId: userId
  };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  const total = await this.countDocuments(match);
  const unresolved = await this.countDocuments({ ...match, status: { $in: ['UNREAD', 'READ', 'ACKNOWLEDGED'] } });
  
  return { total, unresolved };
};

function parseWebhookAlert(webhookData) {
  const alertType = webhookData.field || 'UNKNOWN';
  let severity = 'MEDIUM';
  let title = 'WhatsApp Account Alert';
  let message = 'An alert was received from WhatsApp.';
  let whatsappData = {};
  
  if (webhookData.value) {
    const value = webhookData.value;
    
    if (value.current_limit || value.event === 'FLAGGED' || value.event === 'REINSTATED') {
      alertType = 'PHONE_NUMBER_QUALITY_UPDATE';
      
      const currentRating = value.current_limit || 'UNKNOWN';
      whatsappData.currentRating = currentRating;
      whatsappData.phoneNumberId = value.phone_number_id;
      whatsappData.event = value.event;
      whatsappData.decision = value.decision;
      
      if (currentRating === 'RED' || value.event === 'FLAGGED') {
        severity = 'CRITICAL';
        title = '🚨 Critical: Account Quality Rating RED';
        message = 'Your WhatsApp Business phone number has been flagged due to quality issues. Immediate action required to prevent account suspension.';
      } else if (currentRating === 'YELLOW') {
        severity = 'HIGH';
        title = '⚠️ Warning: Account Quality Rating YELLOW';
        message = 'Your WhatsApp Business phone number quality rating has decreased. Please review your messaging practices.';
      } else if (value.event === 'REINSTATED') {
        severity = 'LOW';
        title = '✅ Account Reinstated';
        message = 'Your WhatsApp Business phone number has been reinstated. You can resume normal operations.';
      }
    }
    
    if (value.message_template_id) {
      alertType = 'MESSAGE_TEMPLATE_STATUS_UPDATE';
      whatsappData.templateId = value.message_template_id;
      whatsappData.templateName = value.message_template_name;
      whatsappData.templateLanguage = value.message_template_language;
      whatsappData.event = value.event;
      
      if (value.event === 'REJECTED') {
        severity = 'MEDIUM';
        title = 'Template Rejected';
        message = `Template "${value.message_template_name}" was rejected by WhatsApp. Reason: ${value.reason || 'Not specified'}`;
      } else if (value.event === 'APPROVED') {
        severity = 'LOW';
        title = 'Template Approved';
        message = `Template "${value.message_template_name}" was approved by WhatsApp.`;
      }
    }
  }
  
  return { alertType, severity, title, message, whatsappData };
}

const AlertLog = mongoose.model('AlertLog', alertLogSchema);

module.exports = AlertLog;
