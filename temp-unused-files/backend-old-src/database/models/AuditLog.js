const mongoose = require('mongoose');
 
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true,
    enum: [
      // Authentication
      'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE',
      
      // User Management
      'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
      
      // Message Operations
      'MESSAGE_SEND', 'MESSAGE_DELETE',
      
      // Template Operations
      'TEMPLATE_CREATE', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE',
      
      // Campaign Operations
      'CAMPAIGN_CREATE', 'CAMPAIGN_UPDATE', 'CAMPAIGN_DELETE', 'CAMPAIGN_START',
      
      // Settings Changes
      'SETTINGS_UPDATE',
      
      // System Events
      'SYSTEM_ERROR'
    ]
  },
  resourceType: {
    type: String,
    required: true,
    enum: [
      'USER', 'MESSAGE', 'TEMPLATE', 'CAMPAIGN', 'CONVERSATION',
      'SETTINGS', 'CONTACT', 'SYSTEM'
    ]
  },

  resourceId: {
    type: String,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['SUCCESS', 'FAILURE', 'PARTIAL', 'PENDING'],
    index: true
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ status: 1, createdAt: -1 });

/**
 * Log an action (simplified)
 */
auditLogSchema.statics.logAction = async function(data) {
  const {
    userId,
    user,
    action,
    resourceType,
    resourceId,
    status = 'SUCCESS'
  } = data;

  const log = await this.create({
    userId: userId || user?._id,
    action,
    resourceType,
    resourceId: resourceId?.toString(),
    status
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
    endDate
  } = filters;

  const {
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const query = {};

  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (status) query.status = status;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
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
 * Get audit statistics (simplified)
 */
auditLogSchema.statics.getStatistics = async function(userId, startDate, endDate) {
  const match = {};
  
  if (userId) match.userId = userId;
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const totalActions = await this.countDocuments(match);
  const successfulActions = await this.countDocuments({ ...match, status: 'SUCCESS' });
  const failedActions = await this.countDocuments({ ...match, status: 'FAILURE' });

  return {
    totalActions,
    successfulActions,
    failedActions
  };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
