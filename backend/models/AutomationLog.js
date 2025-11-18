const mongoose = require('mongoose');

/**
 * Automation Log Model
 * 
 * Tracks execution history of automation rules for debugging and analytics
 */

const automationLogSchema = new mongoose.Schema({
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
  automationRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AutomationRule',
    required: true,
    index: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  
  // Execution details
  triggerType: {
    type: String,
    required: true
  },
  triggerData: {
    keyword: String,
    messageId: String,
    timestamp: Date,
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Execution results
  status: {
    type: String,
    enum: ['success', 'partial', 'failed'],
    required: true,
    index: true
  },
  actionsExecuted: {
    type: Number,
    default: 0
  },
  actionsFailed: {
    type: Number,
    default: 0
  },
  
  // Detailed action results
  actionResults: [{
    actionType: String,
    status: {
      type: String,
      enum: ['success', 'failed', 'skipped']
    },
    message: String,
    error: String,
    executedAt: Date
  }],
  
  // Error information
  error: {
    code: String,
    message: String,
    stack: String
  },
  
  // Performance metrics
  executionTimeMs: Number,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // Using createdAt only
});

// Compound indexes
automationLogSchema.index({ userId: 1, createdAt: -1 });
automationLogSchema.index({ automationRuleId: 1, status: 1 });
automationLogSchema.index({ conversationId: 1, createdAt: -1 });

// TTL index - auto-delete logs older than 90 days
automationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('AutomationLog', automationLogSchema);
