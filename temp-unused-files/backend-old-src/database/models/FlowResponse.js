const mongoose = require('mongoose');

/**
 * FlowResponse Model
 * Tracks user responses to WhatsApp Flows
 */

const flowResponseSchema = new mongoose.Schema({
  flow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flow',
    required: true,
    index: true
  },
 
  flowId: {
    type: String,
    required: true,
    index: true
  },
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
  responseData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  flowToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['initiated', 'in_progress', 'completed', 'abandoned', 'expired'],
    default: 'initiated',
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  completedAt: Date,

  expiresAt: {
    type: Date
  },
  messageId: {
    type: String,
    index: true
  },

  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  }

}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

flowResponseSchema.index({ flow: 1, status: 1 });
flowResponseSchema.index({ user: 1, startedAt: -1 });
flowResponseSchema.index({ 'contact.phoneNumber': 1, startedAt: -1 });
flowResponseSchema.index({ status: 1, expiresAt: 1 });

/**
 * Mark flow as completed
 */
flowResponseSchema.methods.markCompleted = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  
  await this.save();

  const Flow = mongoose.model('Flow');
  const flow = await Flow.findById(this.flow);
  if (flow) {
    await flow.updateAnalytics(true);
  }

  return this;
};

/**
 * Mark flow as abandoned
 */
flowResponseSchema.methods.markAbandoned = async function() {
  this.status = 'abandoned';
  
  await this.save();

  const Flow = mongoose.model('Flow');
  const flow = await Flow.findById(this.flow);
  if (flow) {
    await flow.updateAnalytics(false, null);
  }

  return this;
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
 * Get response as plain object
 */
flowResponseSchema.methods.getResponseObject = function() {
  return {
    flowId: this.flowId,
    contact: this.contact,
    status: this.status,
    data: this.responseData ? Object.fromEntries(this.responseData) : {},
    startedAt: this.startedAt,
    completedAt: this.completedAt
  };
};

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
    .select('-__v');
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

flowResponseSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    this.expiresAt = expiryDate;
  }
  next();
});

const FlowResponse = mongoose.model('FlowResponse', flowResponseSchema);

module.exports = FlowResponse;
