const mongoose = require('mongoose');
const { ERROR_CODES } = require('../../../common/constants');

/**
 * Alert Type Constants
 */
const ALERT_TYPES = {
  ACCOUNT_UPDATE: 'ACCOUNT_UPDATE',
  ACCOUNT_WARNING: 'ACCOUNT_WARNING',
  MESSAGE_TEMPLATE_QUALITY_UPDATE: 'MESSAGE_TEMPLATE_QUALITY_UPDATE',
  MESSAGE_TEMPLATE_STATUS_UPDATE: 'MESSAGE_TEMPLATE_STATUS_UPDATE',
  PHONE_NUMBER_QUALITY_UPDATE: 'PHONE_NUMBER_QUALITY_UPDATE',
  PHONE_NUMBER_NAME_UPDATE: 'PHONE_NUMBER_NAME_UPDATE',
  POLICY_ENFORCEMENT: 'POLICY_ENFORCEMENT',
  QUALITY_SCORE: 'QUALITY_SCORE',
  TIER_CHANGE: 'TIER_CHANGE',
  LIMIT_CHANGE: 'LIMIT_CHANGE',
  UNKNOWN: 'UNKNOWN'
};

const ALERT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

const ALERT_STATUS = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
  IGNORED: 'IGNORED'
};

const QUALITY_RATINGS = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED',
  UNKNOWN: 'UNKNOWN'
};

const MESSAGING_TIERS = {
  TIER_1K: 'TIER_1K',
  TIER_10K: 'TIER_10K',
  TIER_100K: 'TIER_100K',
  TIER_UNLIMITED: 'TIER_UNLIMITED',
  UNKNOWN: 'UNKNOWN'
};

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
    required: [true, 'User ID is required'],
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business ID is required'],
    index: true
  },
  alertType: {
    type: String,
    enum: {
      values: Object.values(ALERT_TYPES),
      message: 'Invalid alert type: {VALUE}'
    },
    required: [true, 'Alert type is required'],
    index: true
  },
  severity: {
    type: String,
    enum: {
      values: Object.values(ALERT_SEVERITY),
      message: 'Invalid severity: {VALUE}'
    },
    required: [true, 'Severity is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  whatsappData: {
    phoneNumberId: {
      type: String,
      trim: true
    },
    currentRating: {
      type: String,
      enum: Object.values(QUALITY_RATINGS)
    },
    previousRating: {
      type: String,
      enum: Object.values(QUALITY_RATINGS)
    },
    qualityScore: {
      type: Number,
      min: [0, 'Quality score cannot be negative'],
      max: [100, 'Quality score cannot exceed 100']
    },
    messagingLimitTier: {
      type: String,
      enum: Object.values(MESSAGING_TIERS)
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
    enum: {
      values: Object.values(ALERT_STATUS),
      message: 'Invalid status: {VALUE}'
    },
    default: ALERT_STATUS.UNREAD,
    index: true
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common query patterns
alertLogSchema.index({ businessId: 1, createdAt: -1 });
alertLogSchema.index({ businessId: 1, status: 1, severity: 1 });
alertLogSchema.index({ businessId: 1, alertType: 1, createdAt: -1 });
alertLogSchema.index({ userId: 1, createdAt: -1 });
alertLogSchema.index({ userId: 1, status: 1, severity: 1 });
alertLogSchema.index({ alertType: 1, createdAt: -1 });
alertLogSchema.index({ 'whatsappData.phoneNumberId': 1, createdAt: -1 });
alertLogSchema.index({ severity: 1, status: 1, createdAt: -1 });

// TTL index to automatically delete old resolved alerts after 90 days
alertLogSchema.index(
  { resolvedAt: 1 },
  { 
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { status: ALERT_STATUS.RESOLVED }
  }
);

/**
 * Mark alert as read
 * @param {String} userId - User marking as read
 */
alertLogSchema.methods.markAsRead = async function(userId = null) {
  if (this.status === ALERT_STATUS.UNREAD) {
    this.status = ALERT_STATUS.READ;
    if (userId) {
      this.resolvedBy = userId;
    }
    await this.save();
  }
  return this;
};

/**
 * Mark alert as acknowledged
 * @param {String} userId - User acknowledging the alert
 */
alertLogSchema.methods.acknowledge = async function(userId = null) {
  this.status = ALERT_STATUS.ACKNOWLEDGED;
  if (userId) {
    this.resolvedBy = userId;
  }
  await this.save();
  return this;
};

/**
 * Mark alert as resolved
 * @param {String} userId - User resolving the alert
 * @param {String} notes - Optional resolution notes
 */
alertLogSchema.methods.resolve = async function(userId = null, notes = null) {
  this.status = ALERT_STATUS.RESOLVED;
  this.resolvedAt = new Date();
  if (userId) {
    this.resolvedBy = userId;
  }
  if (notes) {
    this.notes = notes;
  }
  await this.save();
  return this;
};

/**
 * Mark alert as ignored
 * @param {String} userId - User ignoring the alert
 */
alertLogSchema.methods.ignore = async function(userId = null) {
  this.status = ALERT_STATUS.IGNORED;
  if (userId) {
    this.resolvedBy = userId;
  }
  await this.save();
  return this;
};

/**
 * Create alert from WhatsApp webhook
 * @param {Object} webhookData - Webhook data from WhatsApp
 * @param {String} userId - User ID
 * @param {String} businessId - Business ID
 */
alertLogSchema.statics.createFromWebhook = async function(webhookData, userId, businessId) {
  const { alertType, severity, title, message, whatsappData } = parseWebhookAlert(webhookData);
  
  const alert = await this.create({
    userId,
    businessId,
    alertType,
    severity,
    title,
    message,
    whatsappData
  });
  
  return alert;
};

/**
 * Get unresolved critical alerts for a business
 * @param {String} businessId - Business ID
 * @param {Object} options - Query options
 */
alertLogSchema.statics.getUnresolvedCritical = async function(businessId, options = {}) {
  const query = {
    businessId,
    severity: { $in: [ALERT_SEVERITY.CRITICAL, ALERT_SEVERITY.HIGH] },
    status: { $in: [ALERT_STATUS.UNREAD, ALERT_STATUS.READ, ALERT_STATUS.ACKNOWLEDGED] }
  };

  if (options.userId) {
    query.userId = options.userId;
  }

  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .lean();
};

/**
 * Get alert statistics
 * @param {String} businessId - Business ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {String} userId - Optional user ID filter
 */
alertLogSchema.statics.getStats = async function(businessId, startDate, endDate, userId = null) {
  const match = { businessId };
  
  if (userId) {
    match.userId = userId;
  }
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  const [total, bySeverity, byStatus, byType] = await Promise.all([
    this.countDocuments(match),
    this.aggregate([
      { $match: match },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: match },
      { $group: { _id: '$alertType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])
  ]);

  const unresolved = await this.countDocuments({
    ...match,
    status: { $in: [ALERT_STATUS.UNREAD, ALERT_STATUS.READ, ALERT_STATUS.ACKNOWLEDGED] }
  });
  
  return {
    total,
    unresolved,
    bySeverity: bySeverity.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byStatus: byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    topTypes: byType
  };
};

/**
 * Parse webhook data into alert format
 * @private
 */
function parseWebhookAlert(webhookData) {
  let alertType = webhookData.field || ALERT_TYPES.UNKNOWN;
  let severity = ALERT_SEVERITY.MEDIUM;
  let title = 'WhatsApp Account Alert';
  let message = 'An alert was received from WhatsApp.';
  let whatsappData = {};
  
  try {
    if (webhookData.value) {
      const value = webhookData.value;
      
      // Phone number quality updates
      if (value.current_limit || value.event === 'FLAGGED' || value.event === 'REINSTATED') {
        alertType = ALERT_TYPES.PHONE_NUMBER_QUALITY_UPDATE;
        
        const currentRating = value.current_limit || QUALITY_RATINGS.UNKNOWN;
        whatsappData = {
          currentRating,
          phoneNumberId: value.phone_number_id,
          event: value.event,
          decision: value.decision,
          previousRating: value.previous_limit
        };
        
        if (currentRating === QUALITY_RATINGS.RED || value.event === 'FLAGGED') {
          severity = ALERT_SEVERITY.CRITICAL;
          title = '🚨 Critical: Account Quality Rating RED';
          message = 'Your WhatsApp Business phone number has been flagged due to quality issues. Immediate action required to prevent account suspension.';
        } else if (currentRating === QUALITY_RATINGS.YELLOW) {
          severity = ALERT_SEVERITY.HIGH;
          title = '⚠️ Warning: Account Quality Rating YELLOW';
          message = 'Your WhatsApp Business phone number quality rating has decreased. Please review your messaging practices.';
        } else if (value.event === 'REINSTATED') {
          severity = ALERT_SEVERITY.LOW;
          title = '✅ Account Reinstated';
          message = 'Your WhatsApp Business phone number has been reinstated. You can resume normal operations.';
        }
      }
      
      // Template status updates
      if (value.message_template_id) {
        alertType = ALERT_TYPES.MESSAGE_TEMPLATE_STATUS_UPDATE;
        whatsappData = {
          templateId: value.message_template_id,
          templateName: value.message_template_name,
          templateLanguage: value.message_template_language,
          templateCategory: value.message_template_category,
          event: value.event,
          reasonCode: value.reason
        };
        
        if (value.event === 'REJECTED') {
          severity = ALERT_SEVERITY.MEDIUM;
          title = 'Template Rejected';
          message = `Template "${value.message_template_name || 'Unknown'}" was rejected by WhatsApp. Reason: ${value.reason || 'Not specified'}`;
        } else if (value.event === 'APPROVED') {
          severity = ALERT_SEVERITY.LOW;
          title = 'Template Approved';
          message = `Template "${value.message_template_name || 'Unknown'}" was approved by WhatsApp.`;
        } else if (value.event === 'PAUSED') {
          severity = ALERT_SEVERITY.HIGH;
          title = 'Template Paused';
          message = `Template "${value.message_template_name || 'Unknown'}" was paused due to quality issues.`;
        }
      }

      // Messaging limit tier changes
      if (value.messaging_limit_tier) {
        alertType = ALERT_TYPES.TIER_CHANGE;
        whatsappData = {
          messagingLimitTier: value.messaging_limit_tier,
          phoneNumberId: value.phone_number_id,
          event: value.event
        };
        severity = ALERT_SEVERITY.LOW;
        title = 'Messaging Limit Tier Updated';
        message = `Your messaging limit tier has been updated to ${value.messaging_limit_tier}.`;
      }
    }
  } catch (error) {
    console.error('Error parsing webhook alert:', error);
    // Return default values if parsing fails
  }
  
  return { alertType, severity, title, message, whatsappData };
}

const AlertLog = mongoose.model('AlertLog', alertLogSchema);

// Export model and constants
module.exports = AlertLog;
module.exports.ALERT_TYPES = ALERT_TYPES;
module.exports.ALERT_SEVERITY = ALERT_SEVERITY;
module.exports.ALERT_STATUS = ALERT_STATUS;
module.exports.QUALITY_RATINGS = QUALITY_RATINGS;
module.exports.MESSAGING_TIERS = MESSAGING_TIERS;
