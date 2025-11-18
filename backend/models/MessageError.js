const mongoose = require('mongoose');

const messageErrorSchema = new mongoose.Schema({
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
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    index: true
  },
  messageId: {
    type: String,
    required: true,
    index: true
  },
  whatsappMessageId: {
    type: String,
    index: true
  },
  recipientPhone: {
    type: String,
    required: true,
    index: true
  },
  errorCategory: {
    type: String,
    enum: [
      'INVALID_NUMBER',
      'RATE_LIMIT',
      'BLOCKED',
      'SPAM',
      'POLICY_VIOLATION',
      'MEDIA_ERROR',
      'TEMPLATE_ERROR',
      'NETWORK_ERROR',
      'AUTHENTICATION_ERROR',
      'BUSINESS_PROFILE_ERROR',
      'PARAMETER_ERROR',
      'GENERIC_ERROR',
      'UNKNOWN'
    ],
    required: true,
    index: true
  },
  errorCode: {
    type: Number,
    index: true
  },
  errorTitle: String,
  errorMessage: String,
  errorDetails: mongoose.Schema.Types.Mixed,
  
  // WhatsApp specific error data
  whatsappError: {
    code: Number,
    subcode: Number,
    type: String,
    message: String,
    error_data: {
      details: String,
      messaging_product: String
    },
    fbtrace_id: String
  },

  // Message context
  messageContext: {
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'template', 'interactive', 'poll', 'cta']
    },
    content: mongoose.Schema.Types.Mixed,
    direction: {
      type: String,
      enum: ['outgoing', 'incoming']
    }
  },

  // Retry information
  retryInfo: {
    canRetry: {
      type: Boolean,
      default: false
    },
    retryCount: {
      type: Number,
      default: 0
    },
    lastRetryAt: Date,
    nextRetryAt: Date,
    maxRetries: {
      type: Number,
      default: 3
    }
  },

  // Resolution
  resolution: {
    status: {
      type: String,
      enum: ['PENDING', 'RETRYING', 'RESOLVED', 'FAILED', 'IGNORED'],
      default: 'PENDING'
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolutionNotes: String,
    actionTaken: String
  },

  // Metadata
  metadata: {
    webhookId: String,
    timestamp: Date,
    processed: {
      type: Boolean,
      default: false
    },
    notified: {
      type: Boolean,
      default: false
    }
  },

  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
messageErrorSchema.index({ userId: 1, errorCategory: 1, timestamp: -1 });
messageErrorSchema.index({ userId: 1, 'resolution.status': 1, timestamp: -1 });
messageErrorSchema.index({ conversationId: 1, timestamp: -1 });
messageErrorSchema.index({ 'metadata.processed': 1, timestamp: -1 });

// Static method to categorize error
messageErrorSchema.statics.categorizeError = function(errorCode, errorMessage) {
  // WhatsApp Business API error codes
  // https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
  
  const errorMap = {
    // Invalid numbers
    100: 'INVALID_NUMBER',
    131026: 'INVALID_NUMBER',
    131031: 'INVALID_NUMBER',
    
    // Rate limiting
    4: 'RATE_LIMIT',
    80007: 'RATE_LIMIT',
    130429: 'RATE_LIMIT',
    
    // Blocked/Spam
    131051: 'BLOCKED',
    131052: 'SPAM',
    131053: 'BLOCKED',
    
    // Policy violations
    131056: 'POLICY_VIOLATION',
    
    // Media errors
    131009: 'MEDIA_ERROR',
    131047: 'MEDIA_ERROR',
    
    // Template errors
    132000: 'TEMPLATE_ERROR',
    132001: 'TEMPLATE_ERROR',
    132012: 'TEMPLATE_ERROR',
    132015: 'TEMPLATE_ERROR',
    132016: 'TEMPLATE_ERROR',
    
    // Authentication
    190: 'AUTHENTICATION_ERROR',
    
    // Business profile
    131042: 'BUSINESS_PROFILE_ERROR',
    
    // Parameter errors
    100: 'PARAMETER_ERROR',
    131008: 'PARAMETER_ERROR'
  };

  let category = errorMap[errorCode] || 'UNKNOWN';

  // Fallback to message-based categorization
  if (category === 'UNKNOWN' && errorMessage) {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('invalid') || msg.includes('not found') || msg.includes('doesn\'t exist')) {
      category = 'INVALID_NUMBER';
    } else if (msg.includes('rate limit') || msg.includes('too many')) {
      category = 'RATE_LIMIT';
    } else if (msg.includes('blocked') || msg.includes('banned')) {
      category = 'BLOCKED';
    } else if (msg.includes('spam')) {
      category = 'SPAM';
    } else if (msg.includes('media') || msg.includes('download') || msg.includes('upload')) {
      category = 'MEDIA_ERROR';
    } else if (msg.includes('template')) {
      category = 'TEMPLATE_ERROR';
    } else if (msg.includes('network') || msg.includes('timeout')) {
      category = 'NETWORK_ERROR';
    } else if (msg.includes('token') || msg.includes('auth')) {
      category = 'AUTHENTICATION_ERROR';
    } else {
      category = 'GENERIC_ERROR';
    }
  }

  return category;
};

// Static method to check if error is retryable
messageErrorSchema.statics.isRetryable = function(errorCategory) {
  const retryableCategories = [
    'RATE_LIMIT',
    'NETWORK_ERROR',
    'MEDIA_ERROR',
    'GENERIC_ERROR'
  ];
  return retryableCategories.includes(errorCategory);
};

// Static method to get error statistics
messageErrorSchema.statics.getErrorStats = async function(userId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [total, byCategory, byStatus, topRecipients] = await Promise.all([
    this.countDocuments({ userId, timestamp: { $gte: since } }),
    
    this.aggregate([
      { $match: { userId, timestamp: { $gte: since } } },
      { $group: { _id: '$errorCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    
    this.aggregate([
      { $match: { userId, timestamp: { $gte: since } } },
      { $group: { _id: '$resolution.status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    
    this.aggregate([
      { $match: { userId, timestamp: { $gte: since } } },
      { $group: { _id: '$recipientPhone', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);

  // Daily breakdown
  const dailyBreakdown = await this.aggregate([
    { $match: { userId, timestamp: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    total,
    byCategory,
    byStatus,
    topRecipients,
    dailyBreakdown,
    period: `${days} days`,
    since
  };
};

// Static method to record error
messageErrorSchema.statics.recordError = async function(data) {
  const {
    userId,
    conversationId,
    messageId,
    whatsappMessageId,
    recipientPhone,
    errorData,
    messageContext,
    webhookId
  } = data;

  // Categorize error
  const errorCategory = this.categorizeError(
    errorData.code,
    errorData.message
  );

  const canRetry = this.isRetryable(errorCategory);

  const error = new this({
    userId,
    conversationId,
    messageId,
    whatsappMessageId,
    recipientPhone,
    errorCategory,
    errorCode: errorData.code,
    errorTitle: errorData.title || errorData.type || 'Message Error',
    errorMessage: errorData.message,
    errorDetails: errorData.error_data || errorData.details,
    whatsappError: errorData,
    messageContext,
    retryInfo: {
      canRetry,
      retryCount: 0,
      maxRetries: canRetry ? 3 : 0
    },
    metadata: {
      webhookId,
      timestamp: new Date(),
      processed: false,
      notified: false
    }
  });

  await error.save();

  console.log('❌ Message error recorded:', {
    messageId,
    category: errorCategory,
    canRetry
  });

  return error;
};

// Instance method to mark as resolved
messageErrorSchema.methods.markResolved = async function(resolvedBy, notes, action) {
  this.resolution.status = 'RESOLVED';
  this.resolution.resolvedAt = new Date();
  this.resolution.resolvedBy = resolvedBy;
  this.resolution.resolutionNotes = notes;
  this.resolution.actionTaken = action;
  this.metadata.processed = true;

  await this.save();
  return this;
};

// Instance method to retry
messageErrorSchema.methods.recordRetry = async function() {
  this.retryInfo.retryCount += 1;
  this.retryInfo.lastRetryAt = new Date();
  
  if (this.retryInfo.retryCount >= this.retryInfo.maxRetries) {
    this.resolution.status = 'FAILED';
  } else {
    this.resolution.status = 'RETRYING';
    // Next retry in exponential backoff: 5min, 15min, 1hour
    const delays = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000];
    const delay = delays[this.retryInfo.retryCount - 1] || delays[delays.length - 1];
    this.retryInfo.nextRetryAt = new Date(Date.now() + delay);
  }

  await this.save();
  return this;
};

// Instance method to get display info
messageErrorSchema.methods.getDisplayInfo = function() {
  const categoryLabels = {
    'INVALID_NUMBER': '📵 Invalid Number',
    'RATE_LIMIT': '⏱️ Rate Limit',
    'BLOCKED': '🚫 Blocked',
    'SPAM': '⚠️ Spam',
    'POLICY_VIOLATION': '⛔ Policy Violation',
    'MEDIA_ERROR': '🖼️ Media Error',
    'TEMPLATE_ERROR': '📄 Template Error',
    'NETWORK_ERROR': '🌐 Network Error',
    'AUTHENTICATION_ERROR': '🔐 Auth Error',
    'BUSINESS_PROFILE_ERROR': '👤 Profile Error',
    'PARAMETER_ERROR': '⚙️ Parameter Error',
    'GENERIC_ERROR': '❗ Error',
    'UNKNOWN': '❓ Unknown Error'
  };

  return {
    id: this._id,
    messageId: this.messageId,
    recipientPhone: this.recipientPhone,
    errorCategory: this.errorCategory,
    errorLabel: categoryLabels[this.errorCategory] || this.errorCategory,
    errorTitle: this.errorTitle,
    errorMessage: this.errorMessage,
    errorCode: this.errorCode,
    canRetry: this.retryInfo.canRetry,
    retryCount: this.retryInfo.retryCount,
    maxRetries: this.retryInfo.maxRetries,
    status: this.resolution.status,
    timestamp: this.timestamp,
    timeAgo: this.getTimeAgo()
  };
};

// Instance method to get time ago
messageErrorSchema.methods.getTimeAgo = function() {
  const seconds = Math.floor((new Date() - this.timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return this.timestamp.toLocaleDateString();
};

module.exports = mongoose.model('MessageError', messageErrorSchema);
