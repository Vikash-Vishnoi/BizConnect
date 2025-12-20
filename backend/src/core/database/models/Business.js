const mongoose = require('mongoose');
const { sanitizePhoneNumber, isValidPhoneNumber: validatePhoneNumber } = require('../../../common/helpers/phoneValidator');
 
/**
 * Business Model - Multi-Business Support
 * 
 * Each business has its own WhatsApp Business Account with separate:
 * - API credentials (access token, phone number ID, WABA ID)
 * - Business profile (name, description, contact info)
 * - Team members (users with different roles)
 * - Settings and configurations
 * - Webhook verification token
 */

const businessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [200, 'Business name cannot exceed 200 characters']
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [200, 'Display name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  industry: {
    type: String,
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters']
  },
  website: {
    type: String,
    trim: true,
    maxlength: [500, 'Website URL cannot exceed 500 characters']
  },
  
  // WhatsApp Business API Credentials
  whatsappConfig: {
    // Phone Number ID (From WhatsApp Business Account)
    phoneNumberId: {
      type: String,
      required: [true, 'WhatsApp Phone Number ID is required'],
      trim: true
    },
    // Display Phone Number (e.g., +91 9876543210)
    phoneNumber: {
      type: String,
      required: false,
      trim: true,
      default: '',
      validate: {
        validator: function(v) {
          if (!v || v === '') return true;
          return validatePhoneNumber(v);
        },
        message: 'Invalid phone number format. Use E.164 format (e.g., +919876543210)'
      },
      set: function(v) {
        if (!v || v === '') return v;
        return sanitizePhoneNumber(v);
      }
    },
    // WhatsApp Business Account ID (WABA ID)
    wabaId: {
      type: String,
      required: [true, 'WhatsApp Business Account ID is required'],
      trim: true
    },
    accessToken: {
      type: String,
      required: [true, 'WhatsApp Access Token is required'],
      select: false // Don't include in queries by default for security
    },
    appSecret: {
      type: String,
      required: [true, 'WhatsApp App Secret is required'],
      select: false
    },
    verifyToken: {
      type: String,
      required: [true, 'Webhook Verify Token is required'],
      default: function() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex'); // 64 characters (32 bytes in hex)
      }
    },
    // Webhook Configuration Status
    webhookConfigured: {
      type: Boolean,
      default: false
    },
    webhookConfiguredAt: {
      type: Date,
      default: null
    },
    // API Version
    apiVersion: {
      type: String,
      default: 'v17.0'
    },
    // Business Timezone
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  
  // Setup Progress Tracking
  // 1 = Part 1 (Basic Info), 2 = Part 2 (API Credentials), 3 = Part 3 (Webhook), 4 = Complete
  setupStep: {
    type: Number,
    enum: [1, 2, 3, 4],
    default: 1,
    index: true
  },
  
  // Business Profile (WhatsApp Business Profile Info)
  profile: {
    // Profile Picture (URL to uploaded photo, 640x640px max)
    profilePicture: {
      type: String,
      default: null
    },
    // Display Name (requires Meta approval)
    displayName: {
      type: String,
      trim: true,
      maxlength: [200, 'Display name cannot exceed 200 characters']
    },
    about: {
      type: String,
      maxlength: [256, 'About cannot exceed 256 characters']
    },
    address: {
      type: String,
      maxlength: [256, 'Address cannot exceed 256 characters']
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    website: {
      type: String,
      trim: true,
      maxlength: [500, 'Website URL cannot exceed 500 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters']
    },
    vertical: {
      type: String,
      enum: [
        'UNDEFINED', 'OTHER', 'AUTO', 'BEAUTY', 'APPAREL', 'EDU', 'ENTERTAIN',
        'EVENT_PLAN', 'FINANCE', 'GROCERY', 'GOVT', 'HOTEL', 'HEALTH', 'NONPROFIT',
        'PROF_SERVICES', 'RETAIL', 'TRAVEL', 'RESTAURANT', 'NOT_A_BIZ'
      ],
      default: 'OTHER'
    },
    websites: [{
      type: String,
      trim: true
    }]
  },
  // Team & Access Control
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'agent', 'viewer'],
      default: 'agent'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Settings
  settings: {
    // Welcome Message
    welcomeMessage: {
      enabled: {
        type: Boolean,
        default: true
      },
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template'
      },
      delay: {
        type: Number,
        default: 2000,
        min: 0,
        max: 60000
      }
    },
    
    // Rate Limiting
    rateLimits: {
      messagesPerSecond: {
        type: Number,
        default: 40,
        min: 1,
        max: 80
      },
      dailyLimit: {
        type: Number,
        default: 1000,
        min: 1,
        max: 100000
      },
      hourlyLimit: {
        type: Number,
        default: 100,
        min: 1,
        max: 10000
      }
    },
    
    // Notifications
    notifications: {
      email: {
        enabled: {
          type: Boolean,
          default: true
        },
        recipients: [String]
      },
      webhook: {
        enabled: {
          type: Boolean,
          default: false
        },
        url: String,
        events: [String]
      }
    },
    
    // Working Hours (simplified)
    workingHours: {
      enabled: {
        type: Boolean,
        default: false
      },
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template'
      }
    }
  },
  
  // Status & Health (simplified)
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  health: {
    apiStatus: {
      type: String,
      enum: ['healthy', 'degraded', 'down'],
      default: 'healthy'
    },
    lastError: {
      message: String,
      timestamp: Date
    }
  },
  
  // WhatsApp Business Account Capabilities (consolidated from BusinessCapability model)
  capabilities: {
    messaging: {
      type: String,
      enum: ['ENABLED', 'DISABLED', 'RESTRICTED'],
      default: 'ENABLED'
    },
    payment: {
      type: String,
      enum: ['ENABLED', 'DISABLED', 'RESTRICTED'],
      default: 'DISABLED'
    },
    businessManagement: {
      type: String,
      enum: ['ENABLED', 'DISABLED', 'RESTRICTED'],
      default: 'ENABLED'
    },
    lastUpdated: Date
  },
  
  // Phone Number Quality & Status (updated by phone_number_quality_update webhook)
  phoneNumberQuality: {
    qualityScore: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
      default: 'UNKNOWN'
    },
    qualityRating: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
      default: 'UNKNOWN'
    },
    messagingLimitTier: {
      type: String,
      enum: ['TIER_50', 'TIER_250', 'TIER_1K', 'TIER_10K', 'TIER_100K', 'TIER_UNLIMITED'],
      default: 'TIER_1K'
    },
    nameStatus: {
      type: String,
      enum: ['APPROVED', 'AVAILABLE_WITHOUT_REVIEW', 'DECLINED', 'EXPIRED', 'PENDING_REVIEW', 'NONE'],
      default: 'NONE'
    },
    qualityHistory: [{
      score: String,
      rating: String,
      tier: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      reason: String
    }],
    lastQualityUpdate: Date
  },
  
  // Business Verification & Display Name
  verification: {
    displayName: {
      type: String,
      trim: true
    },
    displayNameCertification: {
      type: String,
      enum: ['APPROVED', 'DECLINED', 'EXPIRED', 'NONE', 'PENDING'],
      default: 'NONE'
    },
    businessVerificationStatus: {
      type: String,
      enum: ['VERIFIED', 'UNVERIFIED', 'PENDING'],
      default: 'UNVERIFIED'
    },
    verifiedName: String,
    certificationDate: Date
  },
  
  // Template Health Summary (updated by template webhooks)
  templateHealth: {
    totalTemplates: {
      type: Number,
      default: 0
    },
    approvedTemplates: {
      type: Number,
      default: 0
    },
    rejectedTemplates: {
      type: Number,
      default: 0
    },
    pausedTemplates: {
      type: Number,
      default: 0
    },
    lastTemplateUpdate: Date
  },
  
  // Account Alerts (updated by account_alerts webhook)
  alerts: [{
    alertType: {
      type: String,
      enum: [
        'TEMPLATE_QUALITY_UPDATE',
        'PHONE_NUMBER_QUALITY_UPDATE',
        'MESSAGING_LIMIT_UPDATE',
        'ACCOUNT_WARNING',
        'ACCOUNT_VIOLATION',
        'BUSINESS_CAPABILITY_UPDATE',
        'DISPLAY_NAME_UPDATE',
        'TEMPLATE_STATUS_UPDATE'
      ],
      required: true
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'INFO'
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    metadata: mongoose.Schema.Types.Mixed,
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date
  }],
  
  // Message Echo Settings (for sent message tracking)
  messageEchoes: {
    enabled: {
      type: Boolean,
      default: true
    },
    lastEchoTimestamp: Date
  },
  
  // Analytics & Tracking (for tracking_events webhook)
  analytics: {
    pixelId: String,
    conversionTracking: {
      enabled: {
        type: Boolean,
        default: false
      },
      events: [{
        eventName: String,
        eventId: String
      }]
    },
    lastTrackingUpdate: Date
  },
  
  // Usage & Limits (simplified for small scale)
  usage: {
    totalMessagesSent: {
      type: Number,
      default: 0
    },
    totalConversations: {
      type: Number,
      default: 0
    }
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
businessSchema.index({ owner: 1, status: 1 });
businessSchema.index({ 'whatsappConfig.phoneNumberId': 1 }, { unique: true });
businessSchema.index({ 'whatsappConfig.wabaId': 1 });
businessSchema.index({ 'team.user': 1 });

// Virtual: Team member count
businessSchema.virtual('teamCount').get(function() {
  return this.team ? this.team.length : 0;
});

// Post-save hook to create default templates and link them
businessSchema.post('save', async function(doc, next) {
  // Only run on new business creation
  if (this.isNew) {
    try {
      const Template = mongoose.model('Template');
      const templates = await Template.createDefaultTemplates(this._id, this.owner);
      
      // Find welcome and out of hours templates
      const welcomeTemplate = templates.find(t => t.name === 'welcome_message');
      const outOfHoursTemplate = templates.find(t => t.name === 'out_of_hours');
      
      // Update business with template IDs
      if (welcomeTemplate) {
        this.settings.welcomeMessage.templateId = welcomeTemplate._id;
      }
      if (outOfHoursTemplate) {
        this.settings.workingHours.templateId = outOfHoursTemplate._id;
      }
      
      // Save without triggering hooks again
      await this.constructor.findByIdAndUpdate(this._id, {
        'settings.welcomeMessage.templateId': welcomeTemplate?._id,
        'settings.workingHours.templateId': outOfHoursTemplate?._id
      });
    } catch (error) {
      logger.error('Error creating default templates', {
        businessId: this._id,
        error: error.message
      });
    }
  }
  next();
});

// Instance Methods

/**
 * Check if user is part of this business
 */
businessSchema.methods.hasUser = function(userId) {
  const userIdStr = userId.toString();
  // Handle both populated and unpopulated owner field
  const ownerId = this.owner?._id || this.owner;
  if (ownerId && ownerId.toString() === userIdStr) return true;
  
  // Check team members (handle both populated and unpopulated user field)
  return this.team.some(member => {
    const memberId = member.user?._id || member.user;
    return memberId && memberId.toString() === userIdStr;
  });
};

/**
 * Get user's role in this business
 */
businessSchema.methods.getUserRole = function(userId) {
  const userIdStr = userId.toString();
  // Handle both populated and unpopulated owner field
  const ownerId = this.owner?._id || this.owner;
  if (ownerId && ownerId.toString() === userIdStr) return 'owner';
  
  // Check team members (handle both populated and unpopulated user field)
  const member = this.team.find(m => {
    const memberId = m.user?._id || m.user;
    return memberId && memberId.toString() === userIdStr;
  });
  return member ? member.role : null;
};

/**
 * Check if user has specific permission (simplified)
 */
businessSchema.methods.hasPermission = function(userId, permission) {
  const userIdStr = userId.toString();
  
  // Handle both populated and unpopulated owner field
  const ownerId = this.owner?._id || this.owner;
  
  // Owner has all permissions
  if (ownerId && ownerId.toString() === userIdStr) return true;
  
  const member = this.team.find(m => m.user.toString() === userIdStr);
  if (!member) return false;
  
  // Admin has most permissions
  if (member.role === 'admin') return true;
  
  // Agents have basic permissions
  if (member.role === 'agent') {
    return ['view', 'read', 'send_message'].includes(permission);
  }
  
  // Viewers can only view
  return permission === 'view' || permission === 'read';
};

/**
 * Add team member (simplified)
 */
businessSchema.methods.addTeamMember = async function(userId, role) {
  // Check if user already exists
  if (this.hasUser(userId)) {
    throw new Error('User is already a team member');
  }
  
  this.team.push({
    user: userId,
    role: role || 'agent',
    addedAt: new Date()
  });
  
  await this.save();
};

/**
 * Remove team member
 */
businessSchema.methods.removeTeamMember = async function(userId) {
  this.team = this.team.filter(m => m.user.toString() !== userId.toString());
  await this.save();
};

/**
 * Update team member role (simplified)
 */
businessSchema.methods.updateTeamMemberRole = async function(userId, newRole) {
  const member = this.team.find(m => m.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User is not a team member');
  }
  
  member.role = newRole;
  await this.save();
};

/**
 * Get WhatsApp API credentials
 */
businessSchema.methods.getWhatsAppCredentials = async function() {
  // Re-query with password fields included
  const business = await this.constructor
    .findById(this._id)
    .select('+whatsappConfig.accessToken +whatsappConfig.appSecret');
  
  return {
    phoneNumberId: business.whatsappConfig.phoneNumberId,
    accessToken: business.whatsappConfig.accessToken,
    appSecret: business.whatsappConfig.appSecret,
    wabaId: business.whatsappConfig.wabaId,
    apiVersion: business.whatsappConfig.apiVersion || 'v22.0'
  };
};

/**
 * Update API health status (simplified)
 */
businessSchema.methods.updateHealth = async function(healthData) {
  if (healthData.apiStatus) this.health.apiStatus = healthData.apiStatus;
  await this.save();
};

/**
 * Record error (simplified)
 */
businessSchema.methods.recordError = async function(error) {
  this.health.lastError = {
    message: error.message || error,
    timestamp: new Date()
  };
  this.health.apiStatus = 'degraded';
  await this.save();
};

/**
 * Increment usage counters
 */
businessSchema.methods.incrementUsage = async function(type, count = 1) {
  if (type === 'messages') {
    this.usage.totalMessagesSent += count;
  } else if (type === 'conversations') {
    this.usage.totalConversations += count;
  }
  
  await this.save();
};

/**
 * Check if usage limit exceeded (simplified)
 */
businessSchema.methods.checkUsageLimits = function() {
  const limits = this.settings.rateLimits;
  
  return {
    dailyLimitExceeded: false, // Simplified - can add basic daily tracking if needed
    hourlyLimitExceeded: false
  };
};

/**
 * Add alert notification
 */
businessSchema.methods.addAlert = async function(alertData) {
  this.alerts.push({
    alertType: alertData.alertType,
    severity: alertData.severity || 'INFO',
    title: alertData.title,
    description: alertData.description,
    metadata: alertData.metadata,
    expiresAt: alertData.expiresAt
  });
  
  // Keep only last 100 alerts
  if (this.alerts.length > 100) {
    this.alerts = this.alerts.slice(-100);
  }
  
  await this.save();
};

/**
 * Update phone number quality (called by webhook)
 */
businessSchema.methods.updatePhoneQuality = async function(qualityData) {
  // Add to history
  this.phoneNumberQuality.qualityHistory.push({
    score: qualityData.score || this.phoneNumberQuality.qualityScore,
    rating: qualityData.rating || this.phoneNumberQuality.qualityRating,
    tier: qualityData.tier || this.phoneNumberQuality.messagingLimitTier,
    timestamp: new Date(),
    reason: qualityData.reason
  });
  
  // Update current values
  if (qualityData.score) this.phoneNumberQuality.qualityScore = qualityData.score;
  if (qualityData.rating) this.phoneNumberQuality.qualityRating = qualityData.rating;
  if (qualityData.tier) this.phoneNumberQuality.messagingLimitTier = qualityData.tier;
  if (qualityData.nameStatus) this.phoneNumberQuality.nameStatus = qualityData.nameStatus;
  
  this.phoneNumberQuality.lastQualityUpdate = new Date();
  
  // Keep only last 50 history entries
  if (this.phoneNumberQuality.qualityHistory.length > 50) {
    this.phoneNumberQuality.qualityHistory = this.phoneNumberQuality.qualityHistory.slice(-50);
  }
  
  await this.save();
};

/**
 * Update template health stats (called by webhook)
 */
businessSchema.methods.updateTemplateHealth = async function(stats) {
  if (stats.total !== undefined) this.templateHealth.totalTemplates = stats.total;
  if (stats.approved !== undefined) this.templateHealth.approvedTemplates = stats.approved;
  if (stats.rejected !== undefined) this.templateHealth.rejectedTemplates = stats.rejected;
  if (stats.paused !== undefined) this.templateHealth.pausedTemplates = stats.paused;
  
  this.templateHealth.lastTemplateUpdate = new Date();
  await this.save();
};

// Static Methods

/**
 * Find business by phone number ID
 */
businessSchema.statics.findByPhoneNumberId = async function(phoneNumberId) {
  return await this.findOne({
    'whatsappConfig.phoneNumberId': phoneNumberId,
    status: 'active'
  });
};

/**
 * Find businesses where user is a member
 */
businessSchema.statics.findByUser = async function(userId) {
  return await this.find({
    $or: [
      { owner: userId },
      { 'team.user': userId }
    ],
    status: 'active'
  }).sort({ createdAt: -1 });
};

/**
 * Verify webhook token
 */
businessSchema.statics.verifyWebhookToken = async function(phoneNumberId, token) {
  const business = await this.findOne({
    'whatsappConfig.phoneNumberId': phoneNumberId,
    'whatsappConfig.verifyToken': token,
    status: 'active'
  });
  
  return !!business;
};

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
