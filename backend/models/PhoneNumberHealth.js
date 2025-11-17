const mongoose = require('mongoose');

/**
 * PhoneNumberHealth Model
 * 
 * Tracks WhatsApp phone number health status and quality metrics
 * Monitors quality ratings, messaging limits, and account status
 * 
 * WhatsApp Business API: GET /{phone-number-id}
 * Fields: quality_rating, messaging_limit_tier, verified_name, etc.
 */

const phoneNumberHealthSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  phoneNumberId: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  
  // Quality metrics from WhatsApp API
  qualityRating: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  messagingLimitTier: {
    type: String,
    enum: ['TIER_50', 'TIER_250', 'TIER_1K', 'TIER_10K', 'TIER_100K', 'TIER_UNLIMITED', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  
  // Account status
  verifiedName: {
    type: String,
    default: ''
  },
  displayPhoneNumber: {
    type: String,
    default: ''
  },
  codeVerificationStatus: {
    type: String,
    enum: ['VERIFIED', 'NOT_VERIFIED', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  
  // Health score (calculated)
  healthScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  
  // Status flags
  isHealthy: {
    type: Boolean,
    default: true
  },
  needsAttention: {
    type: Boolean,
    default: false
  },
  isCritical: {
    type: Boolean,
    default: false
  },
  
  // Historical data
  previousQualityRating: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  previousTier: {
    type: String,
    default: 'UNKNOWN'
  },
  qualityChangedAt: {
    type: Date,
    default: null
  },
  tierChangedAt: {
    type: Date,
    default: null
  },
  
  // Recommendations
  recommendations: [{
    type: {
      type: String,
      enum: ['quality_improvement', 'limit_upgrade', 'verification', 'general']
    },
    message: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Alerts
  alerts: [{
    type: {
      type: String,
      enum: ['quality_downgrade', 'tier_downgrade', 'verification_issue', 'suspension_risk']
    },
    message: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical']
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metrics
  metrics: {
    totalMessagesSent: {
      type: Number,
      default: 0
    },
    messagesDelivered: {
      type: Number,
      default: 0
    },
    messagesFailed: {
      type: Number,
      default: 0
    },
    blockedMessages: {
      type: Number,
      default: 0
    },
    deliveryRate: {
      type: Number,
      default: 100
    },
    failureRate: {
      type: Number,
      default: 0
    },
    blockRate: {
      type: Number,
      default: 0
    }
  },
  
  // Last check info
  lastCheckedAt: {
    type: Date,
    default: Date.now
  },
  checkCount: {
    type: Number,
    default: 0
  },
  
  // API response (for debugging)
  rawApiResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
phoneNumberHealthSchema.index({ userId: 1, createdAt: -1 });
phoneNumberHealthSchema.index({ phoneNumberId: 1 }, { unique: true });
phoneNumberHealthSchema.index({ qualityRating: 1, createdAt: -1 });
phoneNumberHealthSchema.index({ isHealthy: 1, needsAttention: 1 });

// Virtual: Time since last check
phoneNumberHealthSchema.virtual('timeSinceLastCheck').get(function() {
  if (!this.lastCheckedAt) return null;
  return Date.now() - this.lastCheckedAt.getTime();
});

// Virtual: Health status
phoneNumberHealthSchema.virtual('status').get(function() {
  if (this.isCritical) return 'critical';
  if (this.needsAttention) return 'warning';
  if (this.isHealthy) return 'healthy';
  return 'unknown';
});

/**
 * Calculate health score based on quality rating and metrics
 */
phoneNumberHealthSchema.methods.calculateHealthScore = function() {
  let score = 100;
  
  // Quality rating impact (40 points)
  if (this.qualityRating === 'GREEN') {
    score += 0; // No penalty
  } else if (this.qualityRating === 'YELLOW') {
    score -= 20;
  } else if (this.qualityRating === 'RED') {
    score -= 40;
  } else {
    score -= 10; // Unknown
  }
  
  // Delivery rate impact (30 points)
  const deliveryRate = this.metrics.deliveryRate || 100;
  if (deliveryRate < 95) {
    score -= (100 - deliveryRate) * 0.6;
  }
  
  // Failure rate impact (20 points)
  const failureRate = this.metrics.failureRate || 0;
  if (failureRate > 5) {
    score -= failureRate * 0.4;
  }
  
  // Block rate impact (10 points)
  const blockRate = this.metrics.blockRate || 0;
  if (blockRate > 1) {
    score -= blockRate * 1;
  }
  
  // Ensure score is between 0 and 100
  this.healthScore = Math.max(0, Math.min(100, score));
  
  // Update status flags
  this.isHealthy = this.healthScore >= 80;
  this.needsAttention = this.healthScore >= 50 && this.healthScore < 80;
  this.isCritical = this.healthScore < 50;
  
  return this.healthScore;
};

/**
 * Update health data from WhatsApp API response
 */
phoneNumberHealthSchema.methods.updateFromApi = function(apiData) {
  // Store previous values
  if (this.qualityRating !== apiData.quality_rating) {
    this.previousQualityRating = this.qualityRating;
    this.qualityChangedAt = new Date();
  }
  
  if (this.messagingLimitTier !== apiData.messaging_limit_tier) {
    this.previousTier = this.messagingLimitTier;
    this.tierChangedAt = new Date();
  }
  
  // Update current values
  this.qualityRating = apiData.quality_rating || 'UNKNOWN';
  this.messagingLimitTier = apiData.messaging_limit_tier || 'UNKNOWN';
  this.verifiedName = apiData.verified_name || '';
  this.displayPhoneNumber = apiData.display_phone_number || '';
  this.codeVerificationStatus = apiData.code_verification_status || 'UNKNOWN';
  
  // Store raw response
  this.rawApiResponse = apiData;
  
  // Update check info
  this.lastCheckedAt = new Date();
  this.checkCount += 1;
  
  // Calculate health score
  this.calculateHealthScore();
  
  // Generate recommendations and alerts
  this.generateRecommendations();
  this.checkForAlerts();
};

/**
 * Generate recommendations based on health status
 */
phoneNumberHealthSchema.methods.generateRecommendations = function() {
  this.recommendations = [];
  
  // Quality rating recommendations
  if (this.qualityRating === 'YELLOW') {
    this.recommendations.push({
      type: 'quality_improvement',
      message: 'Your quality rating is YELLOW. Review your messaging practices to improve quality. Avoid sending spam or unsolicited messages.',
      priority: 'high',
      createdAt: new Date()
    });
  } else if (this.qualityRating === 'RED') {
    this.recommendations.push({
      type: 'quality_improvement',
      message: 'CRITICAL: Your quality rating is RED. Immediate action required. Review WhatsApp Business Policy and reduce spam reports.',
      priority: 'critical',
      createdAt: new Date()
    });
  }
  
  // Messaging limit recommendations
  if (this.messagingLimitTier === 'TIER_50') {
    this.recommendations.push({
      type: 'limit_upgrade',
      message: 'You are on the starter tier (50 messages/day). Maintain good quality rating for 7 days to upgrade to 250/day.',
      priority: 'medium',
      createdAt: new Date()
    });
  }
  
  // Verification recommendations
  if (this.codeVerificationStatus !== 'VERIFIED') {
    this.recommendations.push({
      type: 'verification',
      message: 'Your phone number is not verified. Complete verification to improve trust and deliverability.',
      priority: 'high',
      createdAt: new Date()
    });
  }
  
  // Delivery rate recommendations
  if (this.metrics.deliveryRate < 90) {
    this.recommendations.push({
      type: 'general',
      message: 'Your delivery rate is below 90%. Check for invalid phone numbers and improve message quality.',
      priority: 'medium',
      createdAt: new Date()
    });
  }
};

/**
 * Check for alerts based on changes
 */
phoneNumberHealthSchema.methods.checkForAlerts = function() {
  // Quality downgrade alert
  if (this.previousQualityRating === 'GREEN' && this.qualityRating === 'YELLOW') {
    this.alerts.push({
      type: 'quality_downgrade',
      message: 'Quality rating downgraded from GREEN to YELLOW',
      severity: 'warning',
      createdAt: new Date()
    });
  } else if (this.previousQualityRating === 'YELLOW' && this.qualityRating === 'RED') {
    this.alerts.push({
      type: 'quality_downgrade',
      message: 'Quality rating downgraded from YELLOW to RED - Risk of suspension',
      severity: 'critical',
      createdAt: new Date()
    });
  } else if (this.previousQualityRating === 'GREEN' && this.qualityRating === 'RED') {
    this.alerts.push({
      type: 'quality_downgrade',
      message: 'Quality rating dropped from GREEN to RED - Immediate action required',
      severity: 'critical',
      createdAt: new Date()
    });
  }
  
  // Tier downgrade alert
  if (this.previousTier && this.previousTier !== this.messagingLimitTier) {
    const tierValues = { TIER_50: 50, TIER_250: 250, TIER_1K: 1000, TIER_10K: 10000, TIER_100K: 100000 };
    const prevValue = tierValues[this.previousTier] || 0;
    const currentValue = tierValues[this.messagingLimitTier] || 0;
    
    if (currentValue < prevValue) {
      this.alerts.push({
        type: 'tier_downgrade',
        message: `Messaging limit downgraded from ${this.previousTier} to ${this.messagingLimitTier}`,
        severity: 'error',
        createdAt: new Date()
      });
    }
  }
  
  // Critical health score alert
  if (this.healthScore < 50) {
    this.alerts.push({
      type: 'suspension_risk',
      message: 'Health score is critically low. Account suspension risk is high.',
      severity: 'critical',
      createdAt: new Date()
    });
  }
};

/**
 * Acknowledge an alert
 */
phoneNumberHealthSchema.methods.acknowledgeAlert = function(alertId) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
  }
  return alert;
};

/**
 * Update metrics from conversation data
 */
phoneNumberHealthSchema.methods.updateMetrics = async function() {
  const Conversation = require('./Conversation');
  
  // Get message stats from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const conversations = await Conversation.find({
    userId: this.userId,
    createdAt: { $gte: thirtyDaysAgo }
  });
  
  let totalSent = 0;
  let delivered = 0;
  let failed = 0;
  let blocked = 0;
  
  conversations.forEach(conv => {
    conv.messages.forEach(msg => {
      if (msg.direction === 'outgoing') {
        totalSent++;
        
        if (msg.status === 'delivered' || msg.status === 'read') {
          delivered++;
        } else if (msg.status === 'failed') {
          failed++;
          
          // Check if it was blocked
          if (msg.error && (msg.error.toLowerCase().includes('block') || msg.error.toLowerCase().includes('spam'))) {
            blocked++;
          }
        }
      }
    });
  });
  
  this.metrics.totalMessagesSent = totalSent;
  this.metrics.messagesDelivered = delivered;
  this.metrics.messagesFailed = failed;
  this.metrics.blockedMessages = blocked;
  
  // Calculate rates
  if (totalSent > 0) {
    this.metrics.deliveryRate = (delivered / totalSent) * 100;
    this.metrics.failureRate = (failed / totalSent) * 100;
    this.metrics.blockRate = (blocked / totalSent) * 100;
  }
  
  // Recalculate health score
  this.calculateHealthScore();
};

/**
 * Get health history for user
 * @param {ObjectId} userId - User ID
 * @param {Number} days - Number of days to look back
 * @returns {Promise<Array>} - Array of health records
 */
phoneNumberHealthSchema.statics.getHealthHistory = async function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    userId: userId,
    createdAt: { $gte: startDate }
  })
  .sort({ createdAt: -1 })
  .select('qualityRating messagingLimitTier healthScore isHealthy createdAt');
};

/**
 * Get current health for user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} - Current health record
 */
phoneNumberHealthSchema.statics.getCurrentHealth = async function(userId) {
  return this.findOne({ userId: userId })
    .sort({ createdAt: -1 });
};

/**
 * Check if health check is needed (last check > 6 hours ago)
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Boolean>} - True if check is needed
 */
phoneNumberHealthSchema.statics.needsCheck = async function(userId) {
  const health = await this.getCurrentHealth(userId);
  
  if (!health) return true;
  
  const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
  return health.lastCheckedAt < sixHoursAgo;
};

module.exports = mongoose.model('PhoneNumberHealth', phoneNumberHealthSchema);
