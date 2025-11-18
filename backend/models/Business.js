const mongoose = require('mongoose');

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
  // Basic Information
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
  logo: {
    type: String,
    default: null
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
      required: [true, 'WhatsApp Phone Number is required'],
      trim: true
    },
    // WhatsApp Business Account ID (WABA ID)
    wabaId: {
      type: String,
      required: [true, 'WhatsApp Business Account ID is required'],
      trim: true
    },
    // Access Token (Can be temporary or system user token)
    accessToken: {
      type: String,
      required: [true, 'WhatsApp Access Token is required'],
      select: false // Don't include in queries by default for security
    },
    // System User Token (Permanent token - doesn't expire)
    systemUserToken: {
      type: String,
      default: null,
      select: false
    },
    // App Secret (For webhook signature verification)
    appSecret: {
      type: String,
      required: [true, 'WhatsApp App Secret is required'],
      select: false
    },
    // Webhook Verify Token (Must match Meta App Webhook Configuration)
    verifyToken: {
      type: String,
      required: [true, 'Webhook Verify Token is required'],
      default: function() {
        return `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    },
    // API Version
    apiVersion: {
      type: String,
      default: 'v22.0'
    },
    // Token Expiry (for temporary tokens)
    tokenExpiresAt: {
      type: Date,
      default: null
    },
    // Last Token Refresh
    tokenLastRefreshedAt: {
      type: Date,
      default: null
    }
  },
  
  // Business Profile (WhatsApp Business Profile Info)
  profile: {
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
    }],
    // Business Hours
    businessHours: {
      timezone: {
        type: String,
        default: 'Asia/Kolkata'
      },
      schedule: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
      }
    }
  },
  // Business Location (optional)
  businessLocation: {
    enabled: {
      type: Boolean,
      default: false
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters']
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    description: {
      type: String,
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    updatedAt: Date
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
    permissions: [{
      type: String,
      enum: [
        'manage_campaigns', 'manage_templates', 'manage_conversations',
        'manage_analytics', 'manage_settings', 'manage_team',
        'manage_webhooks', 'manage_automations', 'view_only'
      ]
    }],
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
      strategy: {
        type: String,
        enum: ['template', 'text'],
        default: 'text'
      },
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template'
      },
      textMessage: {
        type: String,
        default: 'Hello! 👋 Thank you for contacting us. We\'ve received your message and will respond shortly.'
      },
      delay: {
        type: Number,
        default: 2000,
        min: 0,
        max: 60000
      }
    },
    
    // Auto-Reply
    autoReply: {
      enabled: {
        type: Boolean,
        default: false
      },
      message: String,
      keywords: [{
        keyword: String,
        response: String
      }]
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
    
    // Working Hours
    workingHours: {
      enabled: {
        type: Boolean,
        default: false
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata'
      },
      schedule: {
        monday: { start: String, end: String },
        tuesday: { start: String, end: String },
        wednesday: { start: String, end: String },
        thursday: { start: String, end: String },
        friday: { start: String, end: String },
        saturday: { start: String, end: String },
        sunday: { start: String, end: String }
      },
      outsideHoursMessage: {
        type: String,
        default: 'Hello! 👋 We\'re currently outside business hours. We\'ll respond when we\'re back.'
      }
    }
  },
  
  // Status & Health
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
    index: true
  },
  health: {
    lastChecked: Date,
    apiStatus: {
      type: String,
      enum: ['healthy', 'degraded', 'down', 'unknown'],
      default: 'unknown'
    },
    phoneNumberStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'flagged', 'unknown'],
      default: 'unknown'
    },
    qualityRating: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
      default: 'UNKNOWN'
    },
    messagingLimit: {
      type: String,
      enum: ['TIER_1K', 'TIER_10K', 'TIER_100K', 'TIER_UNLIMITED', 'UNKNOWN'],
      default: 'UNKNOWN'
    },
    lastError: {
      message: String,
      timestamp: Date,
      code: String
    }
  },
  
  // Usage & Limits
  usage: {
    // Current period stats
    currentPeriod: {
      start: Date,
      end: Date,
      messagesSent: {
        type: Number,
        default: 0
      },
      conversationsOpened: {
        type: Number,
        default: 0
      },
      apiCalls: {
        type: Number,
        default: 0
      }
    },
    // Limits
    limits: {
      maxUsers: {
        type: Number,
        default: 10
      },
      maxTemplates: {
        type: Number,
        default: 100
      },
      maxConversations: {
        type: Number,
        default: 10000
      }
    },
    // Historical
    totalMessagesSent: {
      type: Number,
      default: 0
    },
    totalConversations: {
      type: Number,
      default: 0
    }
  },
  
  // Billing & Subscription (for future use)
  billing: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'suspended', 'cancelled'],
      default: 'trial'
    },
    trialEndsAt: Date,
    nextBillingDate: Date,
    subscriptionId: String
  },
  
  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
businessSchema.index({ status: 1, isDeleted: 1 });

// Virtual: Team member count
businessSchema.virtual('teamCount').get(function() {
  return this.team ? this.team.length : 0;
});

// Virtual: Is trial expired
businessSchema.virtual('isTrialExpired').get(function() {
  if (this.billing.plan !== 'free' || !this.billing.trialEndsAt) return false;
  return new Date() > this.billing.trialEndsAt;
});

// Instance Methods

/**
 * Check if user is part of this business
 */
businessSchema.methods.hasUser = function(userId) {
  const userIdStr = userId.toString();
  if (this.owner.toString() === userIdStr) return true;
  return this.team.some(member => member.user.toString() === userIdStr);
};

/**
 * Get user's role in this business
 */
businessSchema.methods.getUserRole = function(userId) {
  const userIdStr = userId.toString();
  if (this.owner.toString() === userIdStr) return 'owner';
  
  const member = this.team.find(m => m.user.toString() === userIdStr);
  return member ? member.role : null;
};

/**
 * Check if user has specific permission
 */
businessSchema.methods.hasPermission = function(userId, permission) {
  const userIdStr = userId.toString();
  
  // Owner has all permissions
  if (this.owner.toString() === userIdStr) return true;
  
  const member = this.team.find(m => m.user.toString() === userIdStr);
  if (!member) return false;
  
  // Admin has all permissions except owner-level actions
  if (member.role === 'admin') {
    return !['manage_billing', 'delete_business'].includes(permission);
  }
  
  // Check specific permissions
  return member.permissions && member.permissions.includes(permission);
};

/**
 * Add team member
 */
businessSchema.methods.addTeamMember = async function(userId, role, permissions, addedBy) {
  // Check if user already exists
  if (this.hasUser(userId)) {
    throw new Error('User is already a team member');
  }
  
  this.team.push({
    user: userId,
    role: role || 'agent',
    permissions: permissions || [],
    addedBy: addedBy,
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
 * Update team member role
 */
businessSchema.methods.updateTeamMemberRole = async function(userId, newRole, newPermissions) {
  const member = this.team.find(m => m.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User is not a team member');
  }
  
  member.role = newRole;
  if (newPermissions) {
    member.permissions = newPermissions;
  }
  
  await this.save();
};

/**
 * Get WhatsApp API credentials
 */
businessSchema.methods.getWhatsAppCredentials = async function() {
  // Re-query with password fields included
  const business = await this.constructor
    .findById(this._id)
    .select('+whatsappConfig.accessToken +whatsappConfig.systemUserToken +whatsappConfig.appSecret');
  
  return {
    phoneNumberId: business.whatsappConfig.phoneNumberId,
    accessToken: business.whatsappConfig.systemUserToken || business.whatsappConfig.accessToken,
    appSecret: business.whatsappConfig.appSecret,
    wabaId: business.whatsappConfig.wabaId,
    apiVersion: business.whatsappConfig.apiVersion || 'v22.0'
  };
};

/**
 * Update API health status
 */
businessSchema.methods.updateHealth = async function(healthData) {
  this.health.lastChecked = new Date();
  
  if (healthData.apiStatus) this.health.apiStatus = healthData.apiStatus;
  if (healthData.phoneNumberStatus) this.health.phoneNumberStatus = healthData.phoneNumberStatus;
  if (healthData.qualityRating) this.health.qualityRating = healthData.qualityRating;
  if (healthData.messagingLimit) this.health.messagingLimit = healthData.messagingLimit;
  
  await this.save();
};

/**
 * Record error
 */
businessSchema.methods.recordError = async function(error) {
  this.health.lastError = {
    message: error.message || error,
    timestamp: new Date(),
    code: error.code || 'UNKNOWN'
  };
  this.health.apiStatus = 'degraded';
  await this.save();
};

/**
 * Increment usage counters
 */
businessSchema.methods.incrementUsage = async function(type, count = 1) {
  if (!this.usage.currentPeriod.start) {
    // Initialize current period (monthly)
    const now = new Date();
    this.usage.currentPeriod.start = new Date(now.getFullYear(), now.getMonth(), 1);
    this.usage.currentPeriod.end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  
  // Reset if period expired
  if (new Date() > this.usage.currentPeriod.end) {
    this.usage.currentPeriod = {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      messagesSent: 0,
      conversationsOpened: 0,
      apiCalls: 0
    };
  }
  
  if (type === 'messages') {
    this.usage.currentPeriod.messagesSent += count;
    this.usage.totalMessagesSent += count;
  } else if (type === 'conversations') {
    this.usage.currentPeriod.conversationsOpened += count;
    this.usage.totalConversations += count;
  } else if (type === 'api') {
    this.usage.currentPeriod.apiCalls += count;
  }
  
  await this.save();
};

/**
 * Check if usage limit exceeded
 */
businessSchema.methods.checkUsageLimits = function() {
  const limits = this.settings.rateLimits;
  const usage = this.usage.currentPeriod;
  
  return {
    dailyLimitExceeded: usage.messagesSent >= limits.dailyLimit,
    hourlyLimitExceeded: false, // Would need time-based tracking
    remaining: {
      daily: Math.max(0, limits.dailyLimit - usage.messagesSent)
    }
  };
};

// Static Methods

/**
 * Find business by phone number ID
 */
businessSchema.statics.findByPhoneNumberId = async function(phoneNumberId) {
  return await this.findOne({
    'whatsappConfig.phoneNumberId': phoneNumberId,
    status: 'active',
    isDeleted: false
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
    status: 'active',
    isDeleted: false
  }).sort({ createdAt: -1 });
};

/**
 * Verify webhook token
 */
businessSchema.statics.verifyWebhookToken = async function(phoneNumberId, token) {
  const business = await this.findOne({
    'whatsappConfig.phoneNumberId': phoneNumberId,
    'whatsappConfig.verifyToken': token,
    status: 'active',
    isDeleted: false
  });
  
  return !!business;
};

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
