const mongoose = require('mongoose');

/**
 * FlowResponse Model
 * Tracks user responses to WhatsApp Flows
 */

const flowResponseSchema = new mongoose.Schema({
  // Flow reference
  flow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flow',
    required: true,
    index: true
  },

  flowId: {
    type: String, // WhatsApp Flow ID
    required: true,
    index: true
  },

  // User/Contact information
  user: {
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

  contact: {
    phoneNumber: {
      type: String,
      required: true,
      index: true
    },
    name: String,
    profilePic: String
  },

  // Response data
  responseData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed // Field name to value mapping
  },

  // Flow interaction metadata
  flowToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Status
  status: {
    type: String,
    enum: ['initiated', 'in_progress', 'completed', 'abandoned', 'expired'],
    default: 'initiated',
    index: true
  },

  // Screen tracking
  currentScreen: {
    type: String // Current screen ID
  },

  screensVisited: [{
    screenId: String,
    visitedAt: Date,
    timeSpent: Number // Seconds spent on screen
  }],

  // Timing
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  completedAt: Date,

  completionTime: {
    type: Number // Total time in seconds
  },

  expiresAt: {
    type: Date
  },

  // WhatsApp message reference
  messageId: {
    type: String,
    index: true
  },

  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },

  // Error tracking
  errors: [{
    screenId: String,
    fieldName: String,
    errorMessage: String,
    timestamp: Date
  }],

  // Raw webhook data (for debugging)
  rawWebhookData: mongoose.Schema.Types.Mixed

}, {
  timestamps: true,
  suppressReservedKeysWarning: true // 'errors' is a reserved name but we use it intentionally
});

// Indexes
flowResponseSchema.index({ flow: 1, status: 1 });
flowResponseSchema.index({ user: 1, startedAt: -1 });
flowResponseSchema.index({ 'contact.phoneNumber': 1, startedAt: -1 });
flowResponseSchema.index({ status: 1, expiresAt: 1 });

// Instance methods

/**
 * Mark flow as completed
 */
flowResponseSchema.methods.markCompleted = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.completionTime = Math.floor((this.completedAt - this.startedAt) / 1000);
  
  await this.save();

  // Update flow analytics
  const Flow = mongoose.model('Flow');
  const flow = await Flow.findById(this.flow);
  if (flow) {
    await flow.updateAnalytics(true, this.completionTime);
  }

  return this;
};

/**
 * Mark flow as abandoned
 */
flowResponseSchema.methods.markAbandoned = async function() {
  this.status = 'abandoned';
  
  await this.save();

  // Update flow analytics
  const Flow = mongoose.model('Flow');
  const flow = await Flow.findById(this.flow);
  if (flow) {
    await flow.updateAnalytics(false, null);
  }

  return this;
};

/**
 * Update current screen
 */
flowResponseSchema.methods.updateScreen = function(screenId) {
  const now = new Date();
  
  // Calculate time spent on previous screen
  if (this.screensVisited.length > 0) {
    const lastScreen = this.screensVisited[this.screensVisited.length - 1];
    lastScreen.timeSpent = Math.floor((now - lastScreen.visitedAt) / 1000);
  }

  // Add new screen visit
  this.screensVisited.push({
    screenId,
    visitedAt: now
  });

  this.currentScreen = screenId;
  this.status = 'in_progress';

  return this.save();
};

/**
 * Add field response
 */
flowResponseSchema.methods.addResponse = function(fieldName, value) {
  if (!this.responseData) {
    this.responseData = new Map();
  }
  
  this.responseData.set(fieldName, value);
  
  return this.save();
};

/**
 * Add error
 */
flowResponseSchema.methods.addError = function(screenId, fieldName, errorMessage) {
  this.errors.push({
    screenId,
    fieldName,
    errorMessage,
    timestamp: new Date()
  });

  return this.save();
};

/**
 * Get response as plain object
 */
flowResponseSchema.methods.getResponseObject = function() {
  return {
    flowId: this.flowId,
    contact: this.contact,
    status: this.status,
    data: this.responseData ? Object.fromEntries(this.responseData) : {},
    completionTime: this.completionTime,
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    screensVisited: this.screensVisited
  };
};

// Static methods

/**
 * Get responses for a flow
 */
flowResponseSchema.statics.getFlowResponses = function(flowId, filters = {}) {
  const query = { flow: flowId };
  
  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.startDate && filters.endDate) {
    query.startedAt = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }

  return this.find(query)
    .sort({ startedAt: -1 })
    .populate('flow', 'name description')
    .select('-rawWebhookData -__v');
};

/**
 * Get response statistics
 */
flowResponseSchema.statics.getResponseStats = async function(flowId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        flow: mongoose.Types.ObjectId(flowId),
        startedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgCompletionTime: { $avg: '$completionTime' }
      }
    }
  ]);

  // Calculate daily breakdown
  const dailyStats = await this.aggregate([
    {
      $match: {
        flow: mongoose.Types.ObjectId(flowId),
        startedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$startedAt' }
        },
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        abandoned: {
          $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  return {
    summary: stats,
    daily: dailyStats
  };
};

/**
 * Find active response by token
 */
flowResponseSchema.statics.findByToken = function(flowToken) {
  return this.findOne({ flowToken, status: { $in: ['initiated', 'in_progress'] } })
    .populate('flow');
};

/**
 * Clean up expired responses
 */
flowResponseSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      status: { $in: ['initiated', 'in_progress'] },
      expiresAt: { $lt: now }
    },
    {
      $set: { status: 'expired' }
    }
  );

  return result.modifiedCount;
};

// Pre-save hook to set expiry
flowResponseSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Default 24 hour expiry
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    this.expiresAt = expiryDate;
  }
  next();
});

const FlowResponse = mongoose.model('FlowResponse', flowResponseSchema);

module.exports = FlowResponse;
