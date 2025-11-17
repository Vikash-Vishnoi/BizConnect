const mongoose = require('mongoose');

/**
 * ChannelMessage Model
 * Tracks messages sent to WhatsApp Channels
 */

const channelMessageSchema = new mongoose.Schema({
  // Channel reference
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
    index: true
  },

  channelId: {
    type: String, // WhatsApp channel ID
    required: true,
    index: true
  },

  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Message content
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'poll'],
    required: true
  },

  content: {
    // For text messages
    text: String,
    
    // For media messages
    media: {
      id: String,
      link: String,
      caption: String,
      filename: String,
      mimeType: String
    },

    // For location messages
    location: {
      latitude: Number,
      longitude: Number,
      name: String,
      address: String
    },

    // For poll messages
    poll: {
      question: String,
      options: [String],
      multipleAnswers: Boolean
    }
  },

  // WhatsApp message ID
  messageId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending',
    index: true
  },

  // Analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    reactions: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    reactionBreakdown: {
      type: Map,
      of: Number // emoji -> count
    },
    viewRate: {
      type: Number,
      default: 0 // Percentage
    }
  },

  // Timing
  sentAt: {
    type: Date,
    index: true
  },

  deliveredAt: Date,

  // Error tracking
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
channelMessageSchema.index({ channel: 1, sentAt: -1 });
channelMessageSchema.index({ user: 1, createdAt: -1 });
channelMessageSchema.index({ channelId: 1, status: 1 });
channelMessageSchema.index({ status: 1, createdAt: -1 });

// Instance methods

/**
 * Update message status
 */
channelMessageSchema.methods.updateStatus = async function(status, additionalData = {}) {
  this.status = status;

  if (status === 'sent' && !this.sentAt) {
    this.sentAt = new Date();
  }

  if (status === 'delivered' && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }

  if (status === 'failed' && additionalData.error) {
    this.error = additionalData.error;
  }

  if (additionalData.messageId) {
    this.messageId = additionalData.messageId;
  }

  await this.save();
  return this;
};

/**
 * Update analytics
 */
channelMessageSchema.methods.updateAnalytics = async function(data) {
  if (data.views !== undefined) {
    this.analytics.views = data.views;
  }

  if (data.reactions !== undefined) {
    this.analytics.reactions = data.reactions;
  }

  if (data.shares !== undefined) {
    this.analytics.shares = data.shares;
  }

  if (data.reactionBreakdown) {
    this.analytics.reactionBreakdown = new Map(Object.entries(data.reactionBreakdown));
  }

  // Calculate view rate
  const Channel = mongoose.model('Channel');
  const channel = await Channel.findById(this.channel);
  if (channel && channel.subscribers.count > 0) {
    this.analytics.viewRate = (this.analytics.views / channel.subscribers.count) * 100;
  }

  await this.save();
  return this;
};

/**
 * Add reaction
 */
channelMessageSchema.methods.addReaction = async function(emoji) {
  this.analytics.reactions += 1;

  if (!this.analytics.reactionBreakdown) {
    this.analytics.reactionBreakdown = new Map();
  }

  const currentCount = this.analytics.reactionBreakdown.get(emoji) || 0;
  this.analytics.reactionBreakdown.set(emoji, currentCount + 1);

  await this.save();

  // Update channel analytics
  const Channel = mongoose.model('Channel');
  await Channel.findByIdAndUpdate(
    this.channel,
    { $inc: { 'analytics.total_reactions': 1 } }
  );

  return this;
};

// Static methods

/**
 * Get channel messages
 */
channelMessageSchema.statics.getChannelMessages = function(channelId, filters = {}) {
  const query = { channel: channelId, isActive: true };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.startDate && filters.endDate) {
    query.sentAt = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }

  return this.find(query)
    .sort({ sentAt: -1 })
    .select('-__v');
};

/**
 * Get message analytics
 */
channelMessageSchema.statics.getMessageAnalytics = async function(channelId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        channel: mongoose.Types.ObjectId(channelId),
        sentAt: { $gte: startDate },
        status: { $in: ['sent', 'delivered'] }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$sentAt' }
        },
        messageCount: { $sum: 1 },
        totalViews: { $sum: '$analytics.views' },
        totalReactions: { $sum: '$analytics.reactions' },
        totalShares: { $sum: '$analytics.shares' },
        avgViewRate: { $avg: '$analytics.viewRate' }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // Get top performing messages
  const topMessages = await this.find({
    channel: channelId,
    sentAt: { $gte: startDate },
    status: { $in: ['sent', 'delivered'] }
  })
    .sort({ 'analytics.views': -1 })
    .limit(10)
    .select('type content.text analytics sentAt');

  return {
    daily: stats,
    topMessages
  };
};

/**
 * Get failed messages
 */
channelMessageSchema.statics.getFailedMessages = function(channelId) {
  return this.find({
    channel: channelId,
    status: 'failed',
    isActive: true
  })
    .sort({ createdAt: -1 })
    .select('type content error createdAt');
};

const ChannelMessage = mongoose.model('ChannelMessage', channelMessageSchema);

module.exports = ChannelMessage;
