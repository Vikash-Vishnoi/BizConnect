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
  messageType: {
    type: String,
    enum: ['text', 'template', 'image', 'video', 'document', 'audio'],
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    default: null
  },
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
  scheduledFor: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
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
  error: {
    message: String
  },
  retryCount: {
    type: Number,
    default: 0,
    max: 3
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

scheduledMessageSchema.index({ userId: 1, status: 1, scheduledFor: 1 });
scheduledMessageSchema.index({ status: 1, scheduledFor: 1 });
scheduledMessageSchema.index({ phoneNumber: 1, status: 1 });
scheduledMessageSchema.index({ userId: 1, createdAt: -1 });

scheduledMessageSchema.virtual('isReadyToSend').get(function() {
  if (this.status !== 'pending') return false;
  return Date.now() >= this.scheduledFor.getTime();
});

scheduledMessageSchema.virtual('canBeCancelled').get(function() {
  return this.status === 'pending';
});

/**
 * Cancel a scheduled message
 */
scheduledMessageSchema.methods.cancel = function(userId) {
  if (!this.canBeCancelled) {
    throw new Error('Message cannot be cancelled');
  }
  
  this.status = 'cancelled';
  this.cancelledBy = userId;
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
 * Mark message as failed (simplified)
 */
scheduledMessageSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.error = { message: errorMessage };
};

/**
 * Increment retry count (simplified)
 */
scheduledMessageSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.status = 'pending';
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
scheduledMessageSchema.statics.cancelAllForNumber = async function(userId, phoneNumber) {
  const result = await this.updateMany(
    {
      userId,
      phoneNumber,
      status: 'pending'
    },
    {
      $set: {
        status: 'cancelled',
        cancelledBy: userId
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

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
