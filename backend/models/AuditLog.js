/**
 * ✅ FEATURE 36: Audit Log Model
 * Comprehensive activity logging for compliance and security
 * Tracks all user actions, API calls, and system events
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  userName: {
    type: String,
    required: true
  },

  userEmail: {
    type: String,
    required: true
  },

  userRole: {
    type: String,
    required: true
  },

  // Action Details
  action: {
    type: String,
    required: true,
    index: true,
    enum: [
      // Authentication
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
      
      // User Management
      'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ROLE_CHANGE',
      
      // Message Operations
      'MESSAGE_SEND', 'MESSAGE_DELETE', 'MESSAGE_FORWARD', 'MESSAGE_REPLY',
      'MESSAGE_REACT', 'MESSAGE_ERROR',
      
      // Template Operations
      'TEMPLATE_CREATE', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE',
      'TEMPLATE_SUBMIT', 'TEMPLATE_APPROVE', 'TEMPLATE_REJECT',
      
      // Campaign Operations
      'CAMPAIGN_CREATE', 'CAMPAIGN_UPDATE', 'CAMPAIGN_DELETE',
      'CAMPAIGN_START', 'CAMPAIGN_PAUSE', 'CAMPAIGN_STOP',
      'CAMPAIGN_DUPLICATE',
      
      // Conversation Operations
      'CONVERSATION_OPEN', 'CONVERSATION_CLOSE', 'CONVERSATION_ASSIGN',
      'CONVERSATION_TAG', 'CONVERSATION_ARCHIVE',
      
      // RBAC Operations
      'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE',
      'PERMISSION_GRANT', 'PERMISSION_REVOKE',
      
      // Automation Operations
      'AUTOMATION_CREATE', 'AUTOMATION_UPDATE', 'AUTOMATION_DELETE',
      'AUTOMATION_ENABLE', 'AUTOMATION_DISABLE',
      
      // Settings Changes
      'SETTINGS_UPDATE', 'WEBHOOK_CONFIG', 'API_KEY_CREATE', 'API_KEY_REVOKE',
      'WELCOME_MESSAGE_UPDATE',
      
      // Group Operations
      'GROUP_MESSAGE_SEND', 'GROUP_LEAVE', 'GROUP_INFO_UPDATE',
      
      // Flow Operations
      'FLOW_CREATE', 'FLOW_UPDATE', 'FLOW_DELETE', 'FLOW_PUBLISH',
      'FLOW_DEPRECATE', 'FLOW_SEND',
      
      // Channel Operations
      'CHANNEL_CREATE', 'CHANNEL_UPDATE', 'CHANNEL_DELETE',
      'CHANNEL_BROADCAST', 'CHANNEL_SYNC',
      
      // Data Operations
      'DATA_EXPORT', 'DATA_DELETE', 'DATA_IMPORT',
      
      // System Events
      'SYSTEM_ERROR', 'SYSTEM_WARNING', 'SYSTEM_INFO'
    ]
  },

  // Resource Details
  resourceType: {
    type: String,
    required: true,
    enum: [
      'USER', 'MESSAGE', 'TEMPLATE', 'CAMPAIGN', 'CONVERSATION',
      'ROLE', 'PERMISSION', 'AUTOMATION', 'SETTINGS', 'GROUP',
      'FLOW', 'CHANNEL', 'CONTACT', 'MEDIA', 'WEBHOOK', 'SYSTEM'
    ]
  },

  resourceId: {
    type: String,
    index: true
  },

  resourceName: {
    type: String
  },

  // Action Context
  description: {
    type: String,
    required: true,
    maxlength: 500
  },

  // Result
  status: {
    type: String,
    required: true,
    enum: ['SUCCESS', 'FAILURE', 'PARTIAL', 'PENDING'],
    index: true
  },

  // Error Details (if failed)
  errorMessage: {
    type: String
  },

  errorCode: {
    type: String
  },

  // Request Details
  requestData: {
    method: String, // GET, POST, PUT, DELETE
    endpoint: String,
    params: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed
  },

  // Response Details
  responseData: {
    statusCode: Number,
    data: mongoose.Schema.Types.Mixed,
    duration: Number // Request duration in ms
  },

  // Network/Device Information
  ipAddress: {
    type: String,
    index: true
  },

  userAgent: {
    type: String
  },

  deviceInfo: {
    type: String
  },

  location: {
    country: String,
    city: String,
    region: String
  },

  // Changes Made (for update operations)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    fields: [String] // List of changed fields
  },

  // Impact Assessment
  impact: {
    level: {
      type: String,
      enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    },
    affectedUsers: Number,
    affectedResources: [String]
  },

  // Compliance Tags
  complianceTags: [{
    type: String,
    enum: ['GDPR', 'SOC2', 'HIPAA', 'PCI_DSS', 'ISO27001']
  }],

  // Retention
  retentionPeriod: {
    type: Number, // Days
    default: 365 // 1 year default
  },

  expiresAt: {
    type: Date
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
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });
// Note: Removed standalone createdAt index to avoid duplication with compound indexes
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual: Age of log entry
auditLogSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual: Is action sensitive
auditLogSchema.virtual('isSensitive').get(function() {
  const sensitiveActions = [
    'PASSWORD_CHANGE', 'PASSWORD_RESET', 'USER_DELETE', 'DATA_DELETE',
    'PERMISSION_GRANT', 'PERMISSION_REVOKE', 'ROLE_DELETE', 'API_KEY_CREATE'
  ];
  return sensitiveActions.includes(this.action);
});

// Pre-save Hook: Set expiration date
auditLogSchema.pre('save', function(next) {
  if (!this.expiresAt && this.retentionPeriod) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.retentionPeriod);
    this.expiresAt = expirationDate;
  }
  next();
});

// Static Methods

/**
 * Log an action
 */
auditLogSchema.statics.logAction = async function(data) {
  const {
    userId,
    user,
    action,
    resourceType,
    resourceId,
    resourceName,
    description,
    status = 'SUCCESS',
    errorMessage,
    errorCode,
    requestData,
    responseData,
    ipAddress,
    userAgent,
    changes,
    impact,
    complianceTags
  } = data;

  const log = await this.create({
    userId: userId || user?._id,
    userName: user?.name || 'System',
    userEmail: user?.email || 'system@app.com',
    userRole: user?.role || 'system',
    action,
    resourceType,
    resourceId: resourceId?.toString(),
    resourceName,
    description,
    status,
    errorMessage,
    errorCode,
    requestData,
    responseData,
    ipAddress,
    userAgent,
    changes,
    impact,
    complianceTags: complianceTags || []
  });

  return log;
};

/**
 * Get audit logs with filters
 */
auditLogSchema.statics.getFilteredLogs = async function(filters = {}, options = {}) {
  const {
    userId,
    action,
    resourceType,
    status,
    startDate,
    endDate,
    ipAddress,
    searchTerm
  } = filters;

  const {
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const query = { isDeleted: false };

  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (status) query.status = status;
  if (ipAddress) query.ipAddress = ipAddress;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (searchTerm) {
    query.$or = [
      { description: { $regex: searchTerm, $options: 'i' } },
      { resourceName: { $regex: searchTerm, $options: 'i' } },
      { userName: { $regex: searchTerm, $options: 'i' } }
    ];
  }

  const logs = await this.find(query)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .populate('userId', 'name email role');

  const total = await this.countDocuments(query);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get audit statistics
 */
auditLogSchema.statics.getStatistics = async function(userId, startDate, endDate) {
  const match = { isDeleted: false };
  
  if (userId) match.userId = userId;
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
        totalActions: { $sum: 1 },
        successfulActions: {
          $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
        },
        failedActions: {
          $sum: { $cond: [{ $eq: ['$status', 'FAILURE'] }, 1, 0] }
        },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueIPs: { $addToSet: '$ipAddress' }
      }
    }
  ]);

  const actionBreakdown = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  const resourceBreakdown = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$resourceType',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return {
    summary: stats[0] || {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      uniqueUsers: [],
      uniqueIPs: []
    },
    topActions: actionBreakdown,
    resourceBreakdown: resourceBreakdown
  };
};

/**
 * Get user activity timeline
 */
auditLogSchema.statics.getUserTimeline = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const timeline = await this.find({
    userId: userId,
    isDeleted: false,
    createdAt: { $gte: startDate }
  })
  .sort({ createdAt: -1 })
  .limit(100);

  return timeline;
};

/**
 * Get sensitive operations
 */
auditLogSchema.statics.getSensitiveOperations = async function(startDate, endDate) {
  const sensitiveActions = [
    'PASSWORD_CHANGE', 'PASSWORD_RESET', 'USER_DELETE', 'DATA_DELETE',
    'PERMISSION_GRANT', 'PERMISSION_REVOKE', 'ROLE_DELETE', 'API_KEY_CREATE',
    'SETTINGS_UPDATE', 'WEBHOOK_CONFIG'
  ];

  const match = {
    action: { $in: sensitiveActions },
    isDeleted: false
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  return await this.find(match)
    .sort({ createdAt: -1 })
    .populate('userId', 'name email role');
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
