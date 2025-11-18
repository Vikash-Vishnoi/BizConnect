const mongoose = require('mongoose');

/**
 * DataExport Model
 * Manages GDPR data export requests and tracks deletion workflows
 * 
 * Features:
 * - User data export requests
 * - Right to be forgotten (deletion requests)
 * - Export status tracking
 * - Automatic file cleanup
 * - Compliance audit trail
 */

const dataExportSchema = new mongoose.Schema({
  // Request Info
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    index: true
  },
  requestType: {
    type: String,
    enum: ['EXPORT', 'DELETE'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },

  // Export Details (for EXPORT type)
  dataTypes: [{
    type: String,
    enum: [
      'profile',
      'conversations',
      'messages',
      'contacts',
      'templates',
      'campaigns',
      'analytics',
      'automations',
      'media',
      'settings',
      'audit_logs',
      'all'
    ]
  }],
  format: {
    type: String,
    enum: ['JSON', 'CSV', 'PDF'],
    default: 'JSON'
  },
  exportUrl: String,  // S3 URL or local file path
  fileSize: Number,   // in bytes
  expiresAt: Date,    // When the export file will be deleted

  // Deletion Details (for DELETE type)
  deletionReason: String,
  deleteDataTypes: [{
    type: String,
    enum: [
      'conversations',
      'messages',
      'contacts',
      'templates',
      'campaigns',
      'analytics',
      'automations',
      'media',
      'audit_logs',
      'all'  // Delete everything except user account
    ]
  }],
  deletedRecords: {
    conversations: { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    contacts: { type: Number, default: 0 },
    templates: { type: Number, default: 0 },
    campaigns: { type: Number, default: 0 },
    analytics: { type: Number, default: 0 },
    automations: { type: Number, default: 0 },
    media: { type: Number, default: 0 },
    auditLogs: { type: Number, default: 0 }
  },

  // Processing Info
  startedAt: Date,
  completedAt: Date,
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },

  // Request Metadata
  requestedBy: {
    userId: mongoose.Schema.Types.ObjectId,
    userEmail: String,
    ipAddress: String,
    userAgent: String
  },
  verificationToken: String,  // Email verification token
  verifiedAt: Date,

  // Compliance
  legalBasis: {
    type: String,
    enum: ['GDPR_ARTICLE_15', 'GDPR_ARTICLE_17', 'CCPA', 'USER_REQUEST', 'OTHER'],
    default: 'USER_REQUEST'
  },
  consentGiven: {
    type: Boolean,
    default: false
  },
  privacyPolicyVersion: String,

  // Audit Trail
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String

}, {
  timestamps: true
});

// Indexes
dataExportSchema.index({ userId: 1, requestType: 1 });
dataExportSchema.index({ status: 1, createdAt: -1 });
dataExportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });  // TTL index for auto-cleanup

// Virtual: Is request expired
dataExportSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual: Processing duration
dataExportSchema.virtual('processingDuration').get(function() {
  if (this.startedAt && this.completedAt) {
    return this.completedAt - this.startedAt;
  }
  return null;
});

// Methods
dataExportSchema.methods.markAsProcessing = async function() {
  this.status = 'PROCESSING';
  this.startedAt = new Date();
  return this.save();
};

dataExportSchema.methods.markAsCompleted = async function(data) {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  
  if (data.exportUrl) this.exportUrl = data.exportUrl;
  if (data.fileSize) this.fileSize = data.fileSize;
  if (data.deletedRecords) this.deletedRecords = data.deletedRecords;
  
  // Set expiration for export files (30 days)
  if (this.requestType === 'EXPORT') {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  return this.save();
};

dataExportSchema.methods.markAsFailed = async function(errorMessage) {
  this.status = 'FAILED';
  this.completedAt = new Date();
  this.errorMessage = errorMessage;
  this.retryCount += 1;
  return this.save();
};

dataExportSchema.methods.canRetry = function() {
  return this.retryCount < this.maxRetries && this.status === 'FAILED';
};

// Static methods
dataExportSchema.statics.createExportRequest = async function(userId, dataTypes, format, requestedBy) {
  return this.create({
    userId,
    requestType: 'EXPORT',
    dataTypes,
    format,
    requestedBy,
    verificationToken: generateVerificationToken()
  });
};

dataExportSchema.statics.createDeletionRequest = async function(userId, deleteDataTypes, deletionReason, requestedBy) {
  return this.create({
    userId,
    requestType: 'DELETE',
    deleteDataTypes,
    deletionReason,
    requestedBy,
    verificationToken: generateVerificationToken()
  });
};

dataExportSchema.statics.getPendingRequests = async function(limit = 10) {
  return this.find({ status: 'PENDING' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('userId', 'name email');
};

dataExportSchema.statics.getUserRequests = async function(userId, requestType = null) {
  const query = { userId };
  if (requestType) query.requestType = requestType;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .select('-verificationToken');
};

dataExportSchema.statics.getRequestStats = async function(userId = null) {
  const match = userId ? { userId: mongoose.Types.ObjectId(userId) } : {};
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: { requestType: '$requestType', status: '$status' },
        count: { $sum: 1 },
        avgProcessingTime: {
          $avg: {
            $subtract: ['$completedAt', '$startedAt']
          }
        }
      }
    }
  ]);
};

// Helper function
function generateVerificationToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

// Pre-save middleware
dataExportSchema.pre('save', function(next) {
  // Set default data types if 'all' is selected
  if (this.dataTypes && this.dataTypes.includes('all')) {
    this.dataTypes = [
      'profile', 'conversations', 'messages', 'contacts',
      'templates', 'campaigns', 'analytics', 'automations',
      'media', 'settings', 'audit_logs'
    ];
  }
  
  if (this.deleteDataTypes && this.deleteDataTypes.includes('all')) {
    this.deleteDataTypes = [
      'conversations', 'messages', 'contacts', 'templates',
      'campaigns', 'analytics', 'automations', 'media', 'audit_logs'
    ];
  }
  
  next();
});

const DataExport = mongoose.model('DataExport', dataExportSchema);

module.exports = DataExport;
