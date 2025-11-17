const mongoose = require('mongoose');

/**
 * Channel Model
 * Represents WhatsApp Channels (one-way broadcast channels)
 * 
 * Channels allow businesses to broadcast messages to subscribers
 * Similar to Telegram channels - read-only for subscribers
 */

const channelSchema = new mongoose.Schema({
  // User/Owner reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Channel identification
  channelId: {
    type: String,
    unique: true,
    sparse: true, // WhatsApp-assigned channel ID
    index: true
  },

  // Channel information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  description: {
    type: String,
    maxlength: 500
  },

  // Channel picture
  picture: {
    url: String,
    mediaId: String
  },

  // Channel status
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'DRAFT',
    index: true
  },

  // Visibility
  visibility: {
    type: String,
    enum: ['PUBLIC', 'PRIVATE'], // PUBLIC: Anyone can find and follow, PRIVATE: Invite only
    default: 'PUBLIC'
  },

  // Category
  category: {
    type: String,
    enum: [
      'NEWS', 'ENTERTAINMENT', 'SPORTS', 'BUSINESS', 'TECHNOLOGY',
      'EDUCATION', 'LIFESTYLE', 'HEALTH', 'GOVERNMENT', 'OTHER'
    ],
    default: 'OTHER'
  },

  // Subscriber management
  subscribers: {
    count: {
      type: Number,
      default: 0,
      index: true
    },
    // Note: WhatsApp manages subscribers, we track count
  },

  // Channel settings
  settings: {
    // Allow reactions
    allow_reactions: {
      type: Boolean,
      default: true
    },

    // Allow forwarding
    allow_forwarding: {
      type: Boolean,
      default: true
    },

    // Verification badge (if verified by WhatsApp)
    is_verified: {
      type: Boolean,
      default: false
    }
  },

  // Analytics
  analytics: {
    total_messages: {
      type: Number,
      default: 0
    },
    total_views: {
      type: Number,
      default: 0
    },
    total_reactions: {
      type: Number,
      default: 0
    },
    total_shares: {
      type: Number,
      default: 0
    },
    avg_view_rate: {
      type: Number,
      default: 0 // Percentage
    },
    last_message_sent: Date
  },

  // WhatsApp Business Account
  businessAccountId: {
    type: String,
    index: true
  },

  phoneNumberId: {
    type: String,
    index: true
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
channelSchema.index({ user: 1, status: 1 });
channelSchema.index({ user: 1, isActive: 1 });
channelSchema.index({ createdAt: -1 });
channelSchema.index({ 'subscribers.count': -1 });
channelSchema.index({ status: 1, visibility: 1 });

// Instance methods

/**
 * Update subscriber count
 */
channelSchema.methods.updateSubscriberCount = async function(count) {
  this.subscribers.count = count;
  await this.save();
  return this;
};

/**
 * Increment message count
 */
channelSchema.methods.incrementMessageCount = async function() {
  this.analytics.total_messages += 1;
  this.analytics.last_message_sent = new Date();
  await this.save();
  return this;
};

/**
 * Update analytics
 */
channelSchema.methods.updateAnalytics = async function(data) {
  if (data.views) {
    this.analytics.total_views += data.views;
  }
  if (data.reactions) {
    this.analytics.total_reactions += data.reactions;
  }
  if (data.shares) {
    this.analytics.total_shares += data.shares;
  }

  // Calculate average view rate
  if (this.analytics.total_messages > 0 && this.subscribers.count > 0) {
    this.analytics.avg_view_rate = (this.analytics.total_views / 
      (this.analytics.total_messages * this.subscribers.count)) * 100;
  }

  await this.save();
  return this;
};

/**
 * Get channel info object
 */
channelSchema.methods.getChannelInfo = function() {
  return {
    id: this._id,
    channelId: this.channelId,
    name: this.name,
    description: this.description,
    picture: this.picture,
    status: this.status,
    visibility: this.visibility,
    category: this.category,
    subscriberCount: this.subscribers.count,
    isVerified: this.settings.is_verified,
    analytics: {
      totalMessages: this.analytics.total_messages,
      totalViews: this.analytics.total_views,
      avgViewRate: this.analytics.avg_view_rate,
      lastMessageSent: this.analytics.last_message_sent
    },
    createdAt: this.createdAt
  };
};

// Static methods

/**
 * Get user's channels
 */
channelSchema.statics.getUserChannels = function(userId, filters = {}) {
  const query = { user: userId, isActive: true };
  
  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.visibility) {
    query.visibility = filters.visibility;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .select('-__v');
};

/**
 * Get public channels
 */
channelSchema.statics.getPublicChannels = function(filters = {}) {
  const query = { 
    status: 'ACTIVE', 
    visibility: 'PUBLIC',
    isActive: true 
  };

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.verified) {
    query['settings.is_verified'] = true;
  }

  const sort = filters.sortBy === 'subscribers' 
    ? { 'subscribers.count': -1 }
    : { createdAt: -1 };

  return this.find(query)
    .sort(sort)
    .select('name description picture category subscribers.count settings.is_verified createdAt')
    .limit(filters.limit || 50);
};

/**
 * Get channel statistics
 */
channelSchema.statics.getChannelStats = async function(userId) {
  const stats = await this.aggregate([
    { 
      $match: { 
        user: mongoose.Types.ObjectId(userId), 
        isActive: true 
      } 
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSubscribers: { $sum: '$subscribers.count' },
        totalMessages: { $sum: '$analytics.total_messages' },
        totalViews: { $sum: '$analytics.total_views' }
      }
    }
  ]);

  // Calculate totals
  const totals = await this.aggregate([
    { 
      $match: { 
        user: mongoose.Types.ObjectId(userId), 
        isActive: true 
      } 
    },
    {
      $group: {
        _id: null,
        totalChannels: { $sum: 1 },
        totalSubscribers: { $sum: '$subscribers.count' },
        totalMessages: { $sum: '$analytics.total_messages' },
        totalViews: { $sum: '$analytics.total_views' },
        avgViewRate: { $avg: '$analytics.avg_view_rate' }
      }
    }
  ]);

  return {
    byStatus: stats,
    totals: totals[0] || {
      totalChannels: 0,
      totalSubscribers: 0,
      totalMessages: 0,
      totalViews: 0,
      avgViewRate: 0
    }
  };
};

/**
 * Search channels
 */
channelSchema.statics.searchChannels = function(searchTerm, filters = {}) {
  const query = {
    isActive: true,
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  if (filters.category) {
    query.category = filters.category;
  }

  return this.find(query)
    .sort({ 'subscribers.count': -1 })
    .limit(filters.limit || 20)
    .select('name description picture category subscribers.count settings.is_verified');
};

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;
