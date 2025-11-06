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
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Alert Identification
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
  
  // Severity Level
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
    index: true
  },
  
  // Alert Content
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
  
  // WhatsApp Specific Fields
  whatsappData: {
    // Phone number ID
    phoneNumberId: String,
    
    // Display phone number
    displayPhoneNumber: String,
    
    // Quality rating (GREEN, YELLOW, RED)
    currentRating: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN']
    },
    
    previousRating: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN']
    },
    
    // Quality score (0-100)
    qualityScore: {
      type: Number,
      min: 0,
      max: 100
    },
    
    // Messaging limits tier
    messagingLimitTier: {
      type: String,
      enum: ['TIER_1K', 'TIER_10K', 'TIER_100K', 'TIER_UNLIMITED', 'UNKNOWN']
    },
    
    // Decision (DISABLE, REINSTATE, etc.)
    decision: String,
    
    // Event type from webhook
    event: String,
    
    // Template info (if template-related alert)
    templateId: String,
    templateName: String,
    templateLanguage: String,
    templateCategory: String,
    
    // Reason code
    reasonCode: String,
    
    // Raw webhook data
    rawData: mongoose.Schema.Types.Mixed
  },
  
  // Resolution Status
  status: {
    type: String,
    enum: ['UNREAD', 'READ', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED'],
    default: 'UNREAD',
    index: true
  },
  
  // Resolution Details
  resolvedAt: Date,
  
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  resolutionNotes: String,
  
  // Actions Taken
  actionsTaken: [{
    action: String,
    takenAt: Date,
    takenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  
  // Notification Status
  notificationSent: {
    type: Boolean,
    default: false
  },
  
  notificationSentAt: Date,
  
  notificationMethod: {
    type: String,
    enum: ['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK']
  },
  
  // Recurrence Tracking
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurrenceCount: {
    type: Number,
    default: 1
  },
  
  firstOccurredAt: Date,
  
  lastOccurredAt: {
    type: Date,
    default: Date.now
  },
  
  // Impact Assessment
  impact: {
    affectedFeatures: [String], // ['messaging', 'campaigns', 'templates']
    estimatedAffectedUsers: Number,
    businessImpact: {
      type: String,
      enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    }
  },
  
  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  deletedAt: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for Performance
alertLogSchema.index({ userId: 1, createdAt: -1 });
alertLogSchema.index({ userId: 1, status: 1, severity: 1 });
alertLogSchema.index({ alertType: 1, createdAt: -1 });
alertLogSchema.index({ 'whatsappData.phoneNumberId': 1 });
alertLogSchema.index({ severity: 1, status: 1 });

// Virtual: Age of alert
alertLogSchema.virtual('ageInHours').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
});

// Virtual: Is alert critical and unresolved
alertLogSchema.virtual('needsAttention').get(function() {
  return (this.severity === 'CRITICAL' || this.severity === 'HIGH') && 
         (this.status === 'UNREAD' || this.status === 'READ');
});

// Instance Methods

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
alertLogSchema.methods.acknowledge = async function(userId, notes) {
  this.status = 'ACKNOWLEDGED';
  this.actionsTaken.push({
    action: 'ACKNOWLEDGED',
    takenAt: new Date(),
    takenBy: userId,
    notes: notes || 'Alert acknowledged'
  });
  await this.save();
};

/**
 * Mark alert as resolved
 */
alertLogSchema.methods.resolve = async function(userId, resolutionNotes) {
  this.status = 'RESOLVED';
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  this.resolutionNotes = resolutionNotes;
  this.actionsTaken.push({
    action: 'RESOLVED',
    takenAt: new Date(),
    takenBy: userId,
    notes: resolutionNotes
  });
  await this.save();
};

/**
 * Add action to alert
 */
alertLogSchema.methods.addAction = async function(action, userId, notes) {
  this.actionsTaken.push({
    action: action,
    takenAt: new Date(),
    takenBy: userId,
    notes: notes
  });
  await this.save();
};

// Static Methods

/**
 * Create alert from WhatsApp webhook
 */
alertLogSchema.statics.createFromWebhook = async function(webhookData, userId) {
  const {alertType, severity, title, message, whatsappData} = parseWebhookAlert(webhookData);
  
  // Check if similar alert exists recently (within 1 hour)
  const recentAlert = await this.findOne({
    userId: userId,
    alertType: alertType,
    'whatsappData.phoneNumberId': whatsappData?.phoneNumberId,
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    isDeleted: false
  });
  
  if (recentAlert) {
    // Update recurring alert
    recentAlert.recurrenceCount += 1;
    recentAlert.lastOccurredAt = new Date();
    recentAlert.isRecurring = true;
    await recentAlert.save();
    return recentAlert;
  }
  
  // Create new alert
  const alert = await this.create({
    userId: userId,
    alertType: alertType,
    severity: severity,
    title: title,
    message: message,
    whatsappData: whatsappData,
    firstOccurredAt: new Date(),
    lastOccurredAt: new Date()
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
    status: { $in: ['UNREAD', 'READ', 'ACKNOWLEDGED'] },
    isDeleted: false
  }).sort({ createdAt: -1 });
};

/**
 * Get alert statistics
 */
alertLogSchema.statics.getStats = async function(userId, startDate, endDate) {
  const match = {
    userId: userId,
    isDeleted: false
  };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        critical: {
          $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] }
        },
        high: {
          $sum: { $cond: [{ $eq: ['$severity', 'HIGH'] }, 1, 0] }
        },
        medium: {
          $sum: { $cond: [{ $eq: ['$severity', 'MEDIUM'] }, 1, 0] }
        },
        low: {
          $sum: { $cond: [{ $eq: ['$severity', 'LOW'] }, 1, 0] }
        },
        unresolved: {
          $sum: { 
            $cond: [
              { $in: ['$status', ['UNREAD', 'READ', 'ACKNOWLEDGED']] },
              1,
              0
            ]
          }
        },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unresolved: 0,
    resolved: 0
  };
};

// Helper function to parse webhook data
function parseWebhookAlert(webhookData) {
  const alertType = webhookData.field || 'UNKNOWN';
  let severity = 'MEDIUM';
  let title = 'WhatsApp Account Alert';
  let message = 'An alert was received from WhatsApp.';
  let whatsappData = { rawData: webhookData };
  
  // Parse based on alert type
  if (webhookData.value) {
    const value = webhookData.value;
    
    // Phone number quality update
    if (value.current_limit || value.event === 'FLAGGED' || value.event === 'REINSTATED') {
      alertType = 'PHONE_NUMBER_QUALITY_UPDATE';
      
      const currentRating = value.current_limit || 'UNKNOWN';
      whatsappData.currentRating = currentRating;
      whatsappData.phoneNumberId = value.phone_number_id;
      whatsappData.displayPhoneNumber = value.display_phone_number;
      whatsappData.event = value.event;
      whatsappData.decision = value.decision;
      
      if (currentRating === 'RED' || value.event === 'FLAGGED') {
        severity = 'CRITICAL';
        title = '🚨 Critical: Account Quality Rating RED';
        message = `Your WhatsApp Business phone number (${value.display_phone_number}) has been flagged due to quality issues. Immediate action required to prevent account suspension.`;
      } else if (currentRating === 'YELLOW') {
        severity = 'HIGH';
        title = '⚠️ Warning: Account Quality Rating YELLOW';
        message = `Your WhatsApp Business phone number (${value.display_phone_number}) quality rating has decreased. Please review your messaging practices.`;
      } else if (value.event === 'REINSTATED') {
        severity = 'LOW';
        title = '✅ Account Reinstated';
        message = `Your WhatsApp Business phone number (${value.display_phone_number}) has been reinstated. You can resume normal operations.`;
      }
    }
    
    // Message template status
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
