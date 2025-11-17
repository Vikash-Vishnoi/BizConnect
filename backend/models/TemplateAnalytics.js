const mongoose = require('mongoose');

/**
 * TemplateAnalytics Schema
 * Tracks detailed performance metrics for WhatsApp message templates
 */
const templateAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true,
    index: true
  },
  
  templateName: {
    type: String,
    required: true
  },
  
  // Time period for analytics
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'all-time'],
    default: 'all-time'
  },
  
  periodStart: {
    type: Date
  },
  
  periodEnd: {
    type: Date
  },
  
  // Message metrics
  metrics: {
    sent: {
      type: Number,
      default: 0,
      min: 0
    },
    
    delivered: {
      type: Number,
      default: 0,
      min: 0
    },
    
    read: {
      type: Number,
      default: 0,
      min: 0
    },
    
    failed: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Engagement metrics
    replied: {
      type: Number,
      default: 0,
      min: 0
    },
    
    clicked: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Button clicks breakdown
    buttonClicks: [{
      buttonText: String,
      count: {
        type: Number,
        default: 0
      }
    }],
    
    // Quick reply clicks
    quickReplyClicks: [{
      replyText: String,
      count: {
        type: Number,
        default: 0
      }
    }]
  },
  
  // Calculated rates (percentages)
  rates: {
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
    
    replyRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    clickRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    engagementRate: {
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
    }
  },
  
  // Timing analytics
  timing: {
    averageDeliveryTime: {
      type: Number, // milliseconds
      default: 0
    },
    
    averageReadTime: {
      type: Number, // milliseconds
      default: 0
    },
    
    averageReplyTime: {
      type: Number, // milliseconds
      default: 0
    },
    
    fastestDelivery: {
      type: Number,
      default: 0
    },
    
    slowestDelivery: {
      type: Number,
      default: 0
    }
  },
  
  // Campaign association
  campaigns: [{
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },
    campaignName: String,
    sent: Number,
    delivered: Number,
    read: Number
  }],
  
  // Cost tracking (optional)
  costs: {
    totalCost: {
      type: Number,
      default: 0
    },
    
    costPerMessage: {
      type: Number,
      default: 0
    },
    
    costPerDelivery: {
      type: Number,
      default: 0
    },
    
    costPerEngagement: {
      type: Number,
      default: 0
    }
  },
  
  // Metadata
  metadata: {
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    
    lastMessageSent: {
      type: Date
    },
    
    totalRecipients: {
      type: Number,
      default: 0
    },
    
    uniqueRecipients: [{
      type: String // Phone numbers
    }]
  }
}, {
  timestamps: true
});

// Compound indexes
templateAnalyticsSchema.index({ userId: 1, templateId: 1, period: 1 });
templateAnalyticsSchema.index({ userId: 1, periodStart: -1, periodEnd: -1 });
templateAnalyticsSchema.index({ userId: 1, 'rates.engagementRate': -1 });

/**
 * Calculate all rates based on current metrics
 */
templateAnalyticsSchema.methods.calculateRates = function() {
  const { sent, delivered, read, replied, clicked, failed } = this.metrics;
  
  // Delivery rate: (delivered / sent) * 100
  this.rates.deliveryRate = sent > 0 
    ? parseFloat(((delivered / sent) * 100).toFixed(2))
    : 0;
  
  // Read rate: (read / delivered) * 100
  this.rates.readRate = delivered > 0
    ? parseFloat(((read / delivered) * 100).toFixed(2))
    : 0;
  
  // Reply rate: (replied / delivered) * 100
  this.rates.replyRate = delivered > 0
    ? parseFloat(((replied / delivered) * 100).toFixed(2))
    : 0;
  
  // Click rate: (clicked / delivered) * 100
  this.rates.clickRate = delivered > 0
    ? parseFloat(((clicked / delivered) * 100).toFixed(2))
    : 0;
  
  // Engagement rate: ((replied + clicked) / delivered) * 100
  this.rates.engagementRate = delivered > 0
    ? parseFloat((((replied + clicked) / delivered) * 100).toFixed(2))
    : 0;
  
  // Failure rate: (failed / sent) * 100
  this.rates.failureRate = sent > 0
    ? parseFloat(((failed / sent) * 100).toFixed(2))
    : 0;
};

/**
 * Update metrics for a template
 */
templateAnalyticsSchema.methods.updateMetrics = async function(updateData) {
  // Update metrics
  if (updateData.sent) this.metrics.sent += updateData.sent;
  if (updateData.delivered) this.metrics.delivered += updateData.delivered;
  if (updateData.read) this.metrics.read += updateData.read;
  if (updateData.failed) this.metrics.failed += updateData.failed;
  if (updateData.replied) this.metrics.replied += updateData.replied;
  if (updateData.clicked) this.metrics.clicked += updateData.clicked;
  
  // Update button clicks
  if (updateData.buttonClick) {
    const existingButton = this.metrics.buttonClicks.find(
      b => b.buttonText === updateData.buttonClick
    );
    if (existingButton) {
      existingButton.count += 1;
    } else {
      this.metrics.buttonClicks.push({
        buttonText: updateData.buttonClick,
        count: 1
      });
    }
  }
  
  // Update quick reply clicks
  if (updateData.quickReplyClick) {
    const existingReply = this.metrics.quickReplyClicks.find(
      r => r.replyText === updateData.quickReplyClick
    );
    if (existingReply) {
      existingReply.count += 1;
    } else {
      this.metrics.quickReplyClicks.push({
        replyText: updateData.quickReplyClick,
        count: 1
      });
    }
  }
  
  // Update unique recipients
  if (updateData.recipientPhone) {
    if (!this.metadata.uniqueRecipients.includes(updateData.recipientPhone)) {
      this.metadata.uniqueRecipients.push(updateData.recipientPhone);
      this.metadata.totalRecipients = this.metadata.uniqueRecipients.length;
    }
  }
  
  // Update timing if provided
  if (updateData.deliveryTime) {
    const currentTotal = this.timing.averageDeliveryTime * (this.metrics.delivered - 1);
    this.timing.averageDeliveryTime = (currentTotal + updateData.deliveryTime) / this.metrics.delivered;
    
    if (!this.timing.fastestDelivery || updateData.deliveryTime < this.timing.fastestDelivery) {
      this.timing.fastestDelivery = updateData.deliveryTime;
    }
    
    if (updateData.deliveryTime > this.timing.slowestDelivery) {
      this.timing.slowestDelivery = updateData.deliveryTime;
    }
  }
  
  // Recalculate rates
  this.calculateRates();
  
  // Update metadata
  this.metadata.lastUpdated = new Date();
  if (updateData.sent) {
    this.metadata.lastMessageSent = new Date();
  }
  
  await this.save();
};

/**
 * Get analytics summary for display
 */
templateAnalyticsSchema.methods.getSummary = function() {
  return {
    id: this._id,
    templateId: this.templateId,
    templateName: this.templateName,
    period: this.period,
    metrics: {
      sent: this.metrics.sent,
      delivered: this.metrics.delivered,
      read: this.metrics.read,
      replied: this.metrics.replied,
      clicked: this.metrics.clicked,
      failed: this.metrics.failed
    },
    rates: {
      delivery: `${this.rates.deliveryRate}%`,
      read: `${this.rates.readRate}%`,
      reply: `${this.rates.replyRate}%`,
      click: `${this.rates.clickRate}%`,
      engagement: `${this.rates.engagementRate}%`,
      failure: `${this.rates.failureRate}%`
    },
    timing: {
      avgDelivery: this.formatTime(this.timing.averageDeliveryTime),
      avgRead: this.formatTime(this.timing.averageReadTime),
      avgReply: this.formatTime(this.timing.averageReplyTime)
    },
    topButtons: this.getTopButtons(5),
    topQuickReplies: this.getTopQuickReplies(5),
    totalRecipients: this.metadata.totalRecipients,
    lastUpdated: this.metadata.lastUpdated
  };
};

/**
 * Format time in milliseconds to human-readable
 */
templateAnalyticsSchema.methods.formatTime = function(ms) {
  if (!ms || ms === 0) return 'N/A';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Get top N buttons by clicks
 */
templateAnalyticsSchema.methods.getTopButtons = function(limit = 5) {
  return this.metrics.buttonClicks
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(b => ({
      text: b.buttonText,
      clicks: b.count,
      percentage: this.metrics.clicked > 0 
        ? parseFloat(((b.count / this.metrics.clicked) * 100).toFixed(2))
        : 0
    }));
};

/**
 * Get top N quick replies by clicks
 */
templateAnalyticsSchema.methods.getTopQuickReplies = function(limit = 5) {
  return this.metrics.quickReplyClicks
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(r => ({
      text: r.replyText,
      clicks: r.count,
      percentage: this.metrics.clicked > 0
        ? parseFloat(((r.count / this.metrics.clicked) * 100).toFixed(2))
        : 0
    }));
};

/**
 * Static method: Get or create analytics for a template
 */
templateAnalyticsSchema.statics.getOrCreateAnalytics = async function(userId, templateId, templateName, period = 'all-time') {
  let analytics = await this.findOne({ userId, templateId, period });
  
  if (!analytics) {
    analytics = await this.create({
      userId,
      templateId,
      templateName,
      period,
      periodStart: period === 'all-time' ? null : new Date(),
      periodEnd: period === 'all-time' ? null : null
    });
  }
  
  return analytics;
};

/**
 * Static method: Get analytics comparison for multiple templates
 */
templateAnalyticsSchema.statics.compareTemplates = async function(userId, templateIds, period = 'all-time') {
  const analytics = await this.find({
    userId,
    templateId: { $in: templateIds },
    period
  });
  
  return analytics.map(a => a.getSummary());
};

/**
 * Static method: Get top performing templates
 */
templateAnalyticsSchema.statics.getTopPerformers = async function(userId, metric = 'engagementRate', limit = 10) {
  const sortField = `rates.${metric}`;
  
  return await this.find({ userId, period: 'all-time' })
    .sort({ [sortField]: -1 })
    .limit(limit)
    .populate('templateId');
};

/**
 * Static method: Get analytics summary for all templates
 */
templateAnalyticsSchema.statics.getOverallStats = async function(userId, period = 'all-time') {
  const analytics = await this.find({ userId, period });
  
  const totals = analytics.reduce((acc, curr) => {
    acc.sent += curr.metrics.sent;
    acc.delivered += curr.metrics.delivered;
    acc.read += curr.metrics.read;
    acc.replied += curr.metrics.replied;
    acc.clicked += curr.metrics.clicked;
    acc.failed += curr.metrics.failed;
    return acc;
  }, {
    sent: 0,
    delivered: 0,
    read: 0,
    replied: 0,
    clicked: 0,
    failed: 0
  });
  
  const rates = {
    deliveryRate: totals.sent > 0 
      ? parseFloat(((totals.delivered / totals.sent) * 100).toFixed(2))
      : 0,
    readRate: totals.delivered > 0
      ? parseFloat(((totals.read / totals.delivered) * 100).toFixed(2))
      : 0,
    replyRate: totals.delivered > 0
      ? parseFloat(((totals.replied / totals.delivered) * 100).toFixed(2))
      : 0,
    clickRate: totals.delivered > 0
      ? parseFloat(((totals.clicked / totals.delivered) * 100).toFixed(2))
      : 0,
    engagementRate: totals.delivered > 0
      ? parseFloat((((totals.replied + totals.clicked) / totals.delivered) * 100).toFixed(2))
      : 0
  };
  
  return {
    totalTemplates: analytics.length,
    metrics: totals,
    rates,
    templates: analytics.map(a => ({
      id: a.templateId,
      name: a.templateName,
      sent: a.metrics.sent,
      engagementRate: a.rates.engagementRate
    })).sort((a, b) => b.engagementRate - a.engagementRate)
  };
};

/**
 * Static method: Track template usage from campaign
 */
templateAnalyticsSchema.statics.trackCampaignUsage = async function(
  userId, 
  templateId, 
  templateName, 
  campaignId, 
  campaignName, 
  recipientCount
) {
  const analytics = await this.getOrCreateAnalytics(userId, templateId, templateName);
  
  // Update metrics
  await analytics.updateMetrics({ sent: recipientCount });
  
  // Add campaign association
  const existingCampaign = analytics.campaigns.find(
    c => c.campaignId.toString() === campaignId.toString()
  );
  
  if (existingCampaign) {
    existingCampaign.sent += recipientCount;
  } else {
    analytics.campaigns.push({
      campaignId,
      campaignName,
      sent: recipientCount,
      delivered: 0,
      read: 0
    });
  }
  
  await analytics.save();
  return analytics;
};

const TemplateAnalytics = mongoose.model('TemplateAnalytics', templateAnalyticsSchema);

module.exports = TemplateAnalytics;
