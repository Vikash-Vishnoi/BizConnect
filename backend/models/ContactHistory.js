const mongoose = require('mongoose');

const contactHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: [
      'profile_update',
      'name_change',
      'photo_update',
      'status_update',
      'about_change',
      'number_change',
      'contact_added',
      'contact_blocked',
      'contact_unblocked'
    ],
    required: true
  },
  changeDetails: {
    field: String, // Field that changed (name, photo, about, etc.)
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    description: String
  },
  metadata: {
    source: {
      type: String,
      enum: ['webhook', 'manual', 'sync', 'api'],
      default: 'webhook'
    },
    webhookId: String,
    conversationId: mongoose.Schema.Types.ObjectId,
    timestamp: Date,
    processed: {
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

// Compound indexes for efficient queries
contactHistorySchema.index({ userId: 1, phoneNumber: 1, timestamp: -1 });
contactHistorySchema.index({ userId: 1, eventType: 1, timestamp: -1 });
contactHistorySchema.index({ 'metadata.processed': 1, timestamp: -1 });

// Static method to get contact history
contactHistorySchema.statics.getHistory = async function(userId, phoneNumber, options = {}) {
  const {
    limit = 50,
    skip = 0,
    eventType,
    startDate,
    endDate
  } = options;

  const query = { userId, phoneNumber };

  if (eventType) {
    query.eventType = eventType;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const [history, total] = await Promise.all([
    this.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    history,
    total,
    hasMore: skip + history.length < total
  };
};

// Static method to get recent changes for a user
contactHistorySchema.statics.getRecentChanges = async function(userId, options = {}) {
  const {
    limit = 20,
    hours = 24
  } = options;

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const changes = await this.find({
    userId,
    timestamp: { $gte: since }
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  // Group by phone number
  const grouped = {};
  changes.forEach(change => {
    if (!grouped[change.phoneNumber]) {
      grouped[change.phoneNumber] = [];
    }
    grouped[change.phoneNumber].push(change);
  });

  return {
    changes,
    grouped,
    count: changes.length,
    since
  };
};

// Static method to get change summary
contactHistorySchema.statics.getChangeSummary = async function(userId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const summary = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        latestChange: { $max: '$timestamp' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  const total = await this.countDocuments({
    userId,
    timestamp: { $gte: since }
  });

  const uniqueContacts = await this.distinct('phoneNumber', {
    userId,
    timestamp: { $gte: since }
  });

  return {
    summary,
    total,
    uniqueContactsCount: uniqueContacts.length,
    uniqueContacts,
    period: `${days} days`,
    since
  };
};

// Static method to record a contact change
contactHistorySchema.statics.recordChange = async function(data) {
  const {
    userId,
    phoneNumber,
    eventType,
    changeDetails,
    metadata = {}
  } = data;

  // Check for duplicate recent entries (within 5 minutes)
  const recentDuplicate = await this.findOne({
    userId,
    phoneNumber,
    eventType,
    'changeDetails.field': changeDetails?.field,
    timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
  });

  if (recentDuplicate) {
    console.log('Duplicate contact change detected, skipping:', {
      phoneNumber,
      eventType,
      field: changeDetails?.field
    });
    return recentDuplicate;
  }

  const record = new this({
    userId,
    phoneNumber,
    eventType,
    changeDetails,
    metadata: {
      ...metadata,
      timestamp: metadata.timestamp || new Date(),
      source: metadata.source || 'webhook'
    }
  });

  await record.save();

  console.log('📝 Contact change recorded:', {
    phoneNumber,
    eventType,
    field: changeDetails?.field
  });

  return record;
};

// Static method to mark changes as processed
contactHistorySchema.statics.markAsProcessed = async function(ids) {
  const result = await this.updateMany(
    { _id: { $in: ids } },
    { $set: { 'metadata.processed': true } }
  );

  return result;
};

// Static method to get unprocessed changes
contactHistorySchema.statics.getUnprocessed = async function(userId, limit = 50) {
  return this.find({
    userId,
    'metadata.processed': false
  })
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();
};

// Instance method to format for display
contactHistorySchema.methods.getDisplayInfo = function() {
  const eventLabels = {
    'profile_update': '👤 Profile Updated',
    'name_change': '✏️ Name Changed',
    'photo_update': '📷 Photo Updated',
    'status_update': '💬 Status Updated',
    'about_change': 'ℹ️ About Changed',
    'number_change': '📱 Number Changed',
    'contact_added': '➕ Contact Added',
    'contact_blocked': '🚫 Contact Blocked',
    'contact_unblocked': '✅ Contact Unblocked'
  };

  let changeDescription = '';
  if (this.changeDetails) {
    const { field, oldValue, newValue, description } = this.changeDetails;
    
    if (description) {
      changeDescription = description;
    } else if (oldValue && newValue) {
      changeDescription = `${field}: "${oldValue}" → "${newValue}"`;
    } else if (newValue) {
      changeDescription = `${field}: ${newValue}`;
    }
  }

  return {
    id: this._id,
    phoneNumber: this.phoneNumber,
    eventType: this.eventType,
    eventLabel: eventLabels[this.eventType] || this.eventType,
    changeDescription,
    timestamp: this.timestamp,
    timeAgo: this.getTimeAgo(),
    source: this.metadata?.source || 'webhook'
  };
};

// Instance method to get human-readable time ago
contactHistorySchema.methods.getTimeAgo = function() {
  const seconds = Math.floor((new Date() - this.timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return this.timestamp.toLocaleDateString();
};

module.exports = mongoose.model('ContactHistory', contactHistorySchema);
