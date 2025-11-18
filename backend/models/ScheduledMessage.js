const mongoose = require('mongoose');

/**
 * ScheduledMessage Model
 * 
 * Manages scheduled WhatsApp messages with timezone support
 * Allows users to schedule messages for future delivery
 * Supports text, media, template messages with retry logic
 */

const scheduledMessageSchema = new mongoose.Schema({
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
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
  },
  
  // Message details
  messageType: {
    type: String,
    enum: ['text', 'template', 'image', 'video', 'document', 'audio'],
    required: true
  },
  
  // Text message
  text: {
    type: String,
    default: ''
  },
  
  // Template message
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    default: null
  },
  templateName: {
    type: String,
    default: ''
  },
  templateLanguage: {
    type: String,
    default: 'en'
  },
  templateComponents: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  
  // Media message
  mediaUrl: {
    type: String,
    default: ''
  },
  mediaId: {
    type: String,
    default: ''
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'document', 'audio', ''],
    default: ''
  },
  caption: {
    type: String,
    default: ''
  },
  filename: {
    type: String,
    default: ''
  },
  
  // Scheduling details
  scheduledFor: {
    type: Date,
    required: true,
    index: true
  },
  timezone: {
    type: String,
    default: 'UTC',
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Execution details
  sentAt: {
    type: Date,
    default: null
  },
  whatsappMessageId: {
    type: String,
    default: ''
  },
  whatsappStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed', ''],
    default: ''
  },
  
  // Error handling
  error: {
    code: String,
    message: String,
    timestamp: Date
  },
  retryCount: {
    type: Number,
    default: 0,
    max: 3
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0,
    max: 5
  },
  nextRetryAt: {
    type: Date,
    default: null
  },
  
  // Cancellation
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  
  // Metadata
  metadata: {
    deviceType: String,
    appVersion: String,
    ipAddress: String
  },
  
  // Notes
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
scheduledMessageSchema.index({ userId: 1, status: 1, scheduledFor: 1 });
scheduledMessageSchema.index({ status: 1, scheduledFor: 1 }); // For execution query
scheduledMessageSchema.index({ phoneNumber: 1, status: 1 });
scheduledMessageSchema.index({ userId: 1, createdAt: -1 });

// Virtual: Time until scheduled
scheduledMessageSchema.virtual('timeUntilScheduled').get(function() {
  if (!this.scheduledFor) return null;
  const now = Date.now();
  const scheduled = this.scheduledFor.getTime();
  return scheduled - now; // milliseconds
});

// Virtual: Is ready to send
scheduledMessageSchema.virtual('isReadyToSend').get(function() {
  if (this.status !== 'pending') return false;
  return Date.now() >= this.scheduledFor.getTime();
});

// Virtual: Can be cancelled
scheduledMessageSchema.virtual('canBeCancelled').get(function() {
  return this.status === 'pending' && !this.cancelledAt;
});

// Virtual: Can be retried
scheduledMessageSchema.virtual('canBeRetried').get(function() {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
});

/**
 * Cancel a scheduled message
 */
scheduledMessageSchema.methods.cancel = function(userId, reason = '') {
  if (!this.canBeCancelled) {
    throw new Error('Message cannot be cancelled');
  }
  
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;
};

/**
 * Mark message as sent
 */
scheduledMessageSchema.methods.markAsSent = function(whatsappMessageId, whatsappStatus = 'sent') {
  this.status = 'sent';
  this.sentAt = new Date();
  this.whatsappMessageId = whatsappMessageId;
  this.whatsappStatus = whatsappStatus;
  this.error = undefined;
};

/**
 * Mark message as failed
 */
scheduledMessageSchema.methods.markAsFailed = function(errorCode, errorMessage) {
  this.status = 'failed';
  this.error = {
    code: errorCode,
    message: errorMessage,
    timestamp: new Date()
  };
  
  // Schedule retry if retries remaining
  if (this.retryCount < this.maxRetries) {
    // Exponential backoff: 5min, 15min, 30min
    const delays = [5, 15, 30];
    const delayMinutes = delays[this.retryCount] || 30;
    this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  }
};

/**
 * Increment retry count
 */
scheduledMessageSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.status = 'pending'; // Set back to pending for retry
  this.nextRetryAt = null;
};

/**
 * Update WhatsApp status
 */
scheduledMessageSchema.methods.updateWhatsAppStatus = function(status) {
  this.whatsappStatus = status;
};

/**
 * Get pending messages ready to send
 * @param {Number} limit - Maximum number of messages to return
 * @returns {Promise<Array>} - Array of scheduled messages
 */
scheduledMessageSchema.statics.getPendingMessages = async function(limit = 100) {
  const now = new Date();
  
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: now }
  })
  .limit(limit)
  .sort({ scheduledFor: 1 })
  .populate('userId', 'name email')
  .populate('templateId', 'name language category');
};

/**
 * Get messages pending retry
 * @returns {Promise<Array>} - Array of messages to retry
 */
scheduledMessageSchema.statics.getRetryMessages = async function() {
  const now = new Date();
  
  return this.find({
    status: 'failed',
    retryCount: { $lt: mongoose.model('ScheduledMessage').schema.path('maxRetries').options.default },
    nextRetryAt: { $lte: now }
  })
  .populate('userId', 'name email');
};

/**
 * Get user's scheduled messages
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of scheduled messages
 */
scheduledMessageSchema.statics.getUserScheduled = async function(userId, options = {}) {
  const {
    status = null,
    limit = 50,
    skip = 0,
    startDate = null,
    endDate = null
  } = options;
  
  const query = { userId };
  
  if (status) {
    query.status = status;
  }
  
  if (startDate || endDate) {
    query.scheduledFor = {};
    if (startDate) query.scheduledFor.$gte = new Date(startDate);
    if (endDate) query.scheduledFor.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ scheduledFor: -1 })
    .limit(limit)
    .skip(skip)
    .populate('templateId', 'name language category');
};

/**
 * Count user's scheduled messages by status
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} - Count by status
 */
scheduledMessageSchema.statics.getStatusCounts = async function(userId) {
  const counts = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  const result = {
    pending: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
    total: 0
  };
  
  counts.forEach(({ _id, count }) => {
    result[_id] = count;
    result.total += count;
  });
  
  return result;
};

/**
 * Cancel all pending messages for a phone number
 * @param {ObjectId} userId - User ID
 * @param {String} phoneNumber - Phone number
 * @param {String} reason - Cancellation reason
 * @returns {Promise<Number>} - Number of messages cancelled
 */
scheduledMessageSchema.statics.cancelAllForNumber = async function(userId, phoneNumber, reason = 'Bulk cancellation') {
  const result = await this.updateMany(
    {
      userId,
      phoneNumber,
      status: 'pending'
    },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason
      }
    }
  );
  
  return result.modifiedCount;
};

/**
 * Delete old completed/cancelled messages
 * @param {Number} daysOld - Age in days
 * @returns {Promise<Number>} - Number of messages deleted
 */
scheduledMessageSchema.statics.cleanupOld = async function(daysOld = 90) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    status: { $in: ['sent', 'cancelled'] },
    createdAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
};

/**
 * Get scheduling statistics for user
 * @param {ObjectId} userId - User ID
 * @param {Number} days - Number of days to analyze
 * @returns {Promise<Object>} - Statistics
 */
scheduledMessageSchema.statics.getStatistics = async function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const stats = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalScheduled: { $sum: 1 },
        totalSent: {
          $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
        },
        totalFailed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        totalCancelled: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalPending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        avgRetries: { $avg: '$retryCount' }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalScheduled: 0,
      totalSent: 0,
      totalFailed: 0,
      totalCancelled: 0,
      totalPending: 0,
      successRate: 0,
      failureRate: 0,
      cancellationRate: 0,
      avgRetries: 0
    };
  }
  
  const data = stats[0];
  const total = data.totalScheduled;
  
  return {
    totalScheduled: total,
    totalSent: data.totalSent,
    totalFailed: data.totalFailed,
    totalCancelled: data.totalCancelled,
    totalPending: data.totalPending,
    successRate: total > 0 ? (data.totalSent / total) * 100 : 0,
    failureRate: total > 0 ? (data.totalFailed / total) * 100 : 0,
    cancellationRate: total > 0 ? (data.totalCancelled / total) * 100 : 0,
    avgRetries: data.avgRetries || 0
  };
};

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
