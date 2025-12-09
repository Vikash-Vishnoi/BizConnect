const mongoose = require('mongoose');
 
const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
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
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
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
  }
}, {
  timestamps: true
});

analyticsSchema.index({ campaignId: 1, date: -1 });
analyticsSchema.index({ templateId: 1, date: -1 });
analyticsSchema.index({ businessId: 1, date: -1 });
analyticsSchema.index({ date: -1 });

analyticsSchema.index({ businessId: 1, date: 1 }, { unique: true, partialFilterExpression: { campaignId: null } });

analyticsSchema.pre('save', function(next) {
  const { messagesSent, messagesDelivered, messagesRead, messagesFailed } = this.metrics;
  
  if (messagesSent > 0) {
    this.performance.deliveryRate = Math.round((messagesDelivered / messagesSent) * 100);
    this.performance.readRate = Math.round((messagesRead / messagesSent) * 100);
    this.performance.failureRate = Math.round((messagesFailed / messagesSent) * 100);
  }
  
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

analyticsSchema.statics.getSummary = async function(businessId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        businessId: new mongoose.Types.ObjectId(businessId),
        date: { $gte: startDate, $lte: endDate },
        campaignId: null
      }
    },
    {
      $group: {
        _id: null,
        totalMessagesSent: { $sum: '$metrics.messagesSent' },
        totalMessagesDelivered: { $sum: '$metrics.messagesDelivered' },
        totalMessagesRead: { $sum: '$metrics.messagesRead' },
        totalMessagesFailed: { $sum: '$metrics.messagesFailed' },
        avgQualityScore: { $avg: '$performance.qualityScore' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : null;
};

/**
 * Get template analytics summary (simplified)
 */
analyticsSchema.statics.getTemplateStats = async function(templateId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        templateId: new mongoose.Types.ObjectId(templateId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSent: { $sum: '$metrics.messagesSent' },
        totalDelivered: { $sum: '$metrics.messagesDelivered' },
        totalRead: { $sum: '$metrics.messagesRead' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : null;
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
