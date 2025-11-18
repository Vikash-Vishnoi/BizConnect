const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
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
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
    index: true
  },
  metrics: {
    messagesSent: {
      type: Number,
      default: 0,
      min: 0
    },
    messagesDelivered: {
      type: Number,
      default: 0,
      min: 0
    },
    messagesRead: {
      type: Number,
      default: 0,
      min: 0
    },
    messagesFailed: {
      type: Number,
      default: 0,
      min: 0
    },
    activeCampaigns: {
      type: Number,
      default: 0,
      min: 0
    },
    completedCampaigns: {
      type: Number,
      default: 0,
      min: 0
    },
    activeConversations: {
      type: Number,
      default: 0,
      min: 0
    },
    newConversations: {
      type: Number,
      default: 0,
      min: 0
    },
    templatesCreated: {
      type: Number,
      default: 0,
      min: 0
    },
    templatesApproved: {
      type: Number,
      default: 0,
      min: 0
    },
    responseRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageResponseTime: {
      type: Number,
      default: 0,
      min: 0 // in minutes
    }
  },
  performance: {
    deliveryRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    readRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    failureRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    qualityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  revenue: {
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    costPerMessage: {
      type: Number,
      default: 0,
      min: 0
    },
    roi: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Composite index for date range queries
analyticsSchema.index({ userId: 1, date: -1 });
analyticsSchema.index({ campaignId: 1, date: -1 });
analyticsSchema.index({ date: -1 });

// Ensure one document per day per user
analyticsSchema.index({ userId: 1, date: 1 }, { unique: true, partialFilterExpression: { campaignId: null } });

// TTL index - auto-delete analytics data older than 365 days (optional, can be adjusted)
// Note: Enable this in production to prevent unlimited database growth
// analyticsSchema.index({ date: 1 }, { expireAfterSeconds: 31536000 }); // 365 days

// Calculate performance metrics before saving
analyticsSchema.pre('save', function(next) {
  const { messagesSent, messagesDelivered, messagesRead, messagesFailed } = this.metrics;
  
  // Calculate delivery rate
  if (messagesSent > 0) {
    this.performance.deliveryRate = Math.round((messagesDelivered / messagesSent) * 100);
    this.performance.readRate = Math.round((messagesRead / messagesSent) * 100);
    this.performance.failureRate = Math.round((messagesFailed / messagesSent) * 100);
  }
  
  // Calculate quality score (weighted average)
  const deliveryWeight = 0.4;
  const readWeight = 0.4;
  const failureWeight = 0.2;
  
  this.performance.qualityScore = Math.round(
    (this.performance.deliveryRate * deliveryWeight) +
    (this.performance.readRate * readWeight) +
    ((100 - this.performance.failureRate) * failureWeight)
  );
  
  next();
});

// Static method to get analytics summary for a date range
analyticsSchema.statics.getSummary = async function(userId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
        campaignId: null // Only aggregate daily totals, not campaign-specific
      }
    },
    {
      $group: {
        _id: null,
        totalMessagesSent: { $sum: '$metrics.messagesSent' },
        totalMessagesDelivered: { $sum: '$metrics.messagesDelivered' },
        totalMessagesRead: { $sum: '$metrics.messagesRead' },
        totalMessagesFailed: { $sum: '$metrics.messagesFailed' },
        totalActiveCampaigns: { $sum: '$metrics.activeCampaigns' },
        totalCompletedCampaigns: { $sum: '$metrics.completedCampaigns' },
        totalActiveConversations: { $sum: '$metrics.activeConversations' },
        totalNewConversations: { $sum: '$metrics.newConversations' },
        avgQualityScore: { $avg: '$performance.qualityScore' },
        avgDeliveryRate: { $avg: '$performance.deliveryRate' },
        avgReadRate: { $avg: '$performance.readRate' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : null;
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
