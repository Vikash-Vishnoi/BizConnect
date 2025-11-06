/**
 * Media Model
 * 
 * Tracks media files uploaded to WhatsApp Business API
 * Stores metadata, usage tracking, and cleanup information
 */

const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  // User who uploaded the media
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // WhatsApp Media Information
  whatsappMediaId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // File Information
  filename: {
    type: String,
    required: true
  },
  originalFilename: String,
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  sha256: String, // File hash from WhatsApp

  // Media Type Classification
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', 'sticker'],
    required: true
  },

  // Storage Information
  localPath: String, // Path to locally cached file (optional)
  cdnUrl: String, // CDN URL if cached externally (optional)
  whatsappUrl: String, // Original WhatsApp URL (temporary, expires)
  urlExpiresAt: Date, // When WhatsApp URL expires

  // Usage Tracking
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: Date,
  usedInConversations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  }],
  usedInCampaigns: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  }],

  // Metadata
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  uploadedBy: String, // User's name or email

  // Status & Lifecycle
  status: {
    type: String,
    enum: ['active', 'deleted', 'expired', 'failed'],
    default: 'active',
    index: true
  },
  deletedAt: Date,
  deleteScheduledFor: Date, // Auto-cleanup date

  // Tags & Organization
  tags: [String],
  category: String, // e.g., 'product', 'marketing', 'support'
  description: String,

  // Error Tracking
  uploadError: String,
  deleteError: String,

  // Cleanup Configuration
  autoDelete: {
    type: Boolean,
    default: false
  },
  autoDeleteAfterDays: {
    type: Number,
    default: 30
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
mediaSchema.index({ userId: 1, uploadedAt: -1 });
mediaSchema.index({ userId: 1, mediaType: 1 });
mediaSchema.index({ userId: 1, status: 1 });
mediaSchema.index({ deleteScheduledFor: 1 }, { sparse: true });
mediaSchema.index({ status: 1, autoDelete: 1, uploadedAt: 1 });

// Instance Methods

/**
 * Mark media as used in a conversation
 */
mediaSchema.methods.recordUsage = async function(conversationId) {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  
  if (conversationId && !this.usedInConversations.includes(conversationId)) {
    this.usedInConversations.push(conversationId);
  }
  
  return this.save();
};

/**
 * Mark media as used in a campaign
 */
mediaSchema.methods.recordCampaignUsage = async function(campaignId) {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  
  if (campaignId && !this.usedInCampaigns.includes(campaignId)) {
    this.usedInCampaigns.push(campaignId);
  }
  
  return this.save();
};

/**
 * Schedule media for auto-deletion
 */
mediaSchema.methods.scheduleDelete = function(daysFromNow = null) {
  const days = daysFromNow || this.autoDeleteAfterDays;
  this.deleteScheduledFor = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.save();
};

/**
 * Mark as deleted
 */
mediaSchema.methods.markDeleted = function() {
  this.status = 'deleted';
  this.deletedAt = new Date();
  return this.save();
};

// Static Methods

/**
 * Get user's media files with filters
 */
mediaSchema.statics.getUserMedia = async function(userId, options = {}) {
  const {
    mediaType,
    status = 'active',
    page = 1,
    limit = 20,
    sortBy = 'uploadedAt',
    sortOrder = -1
  } = options;

  const query = { userId, status };
  
  if (mediaType) {
    query.mediaType = mediaType;
  }

  const skip = (page - 1) * limit;

  const [media, total] = await Promise.all([
    this.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    media,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get media statistics for user
 */
mediaSchema.statics.getStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), status: 'active' } },
    {
      $group: {
        _id: '$mediaType',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        avgSize: { $avg: '$fileSize' }
      }
    }
  ]);

  const total = await this.countDocuments({ userId, status: 'active' });
  const totalSize = stats.reduce((sum, s) => sum + s.totalSize, 0);

  return {
    total,
    totalSize,
    byType: stats.reduce((acc, s) => {
      acc[s._id] = {
        count: s.count,
        totalSize: s.totalSize,
        avgSize: Math.round(s.avgSize)
      };
      return acc;
    }, {})
  };
};

/**
 * Find media scheduled for deletion
 */
mediaSchema.statics.getScheduledForDeletion = async function() {
  return this.find({
    status: 'active',
    autoDelete: true,
    deleteScheduledFor: { $lte: new Date() }
  });
};

/**
 * Find unused media older than specified days
 */
mediaSchema.statics.getUnusedMedia = async function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'active',
    uploadedAt: { $lte: cutoffDate },
    usageCount: 0
  });
};

/**
 * Bulk delete media files
 */
mediaSchema.statics.bulkDelete = async function(mediaIds) {
  return this.updateMany(
    { _id: { $in: mediaIds } },
    {
      $set: {
        status: 'deleted',
        deletedAt: new Date()
      }
    }
  );
};

module.exports = mongoose.model('Media', mediaSchema);
