/**
 * ✅ FEATURE 26: VIEW ONCE MEDIA MODEL
 * 
 * Track view-once media messages sent through the system
 * Ephemeral images/videos that disappear after viewing
 * 
 * Features:
 * - Track sent view-once media
 * - Record when media is viewed
 * - Analytics on view-once usage
 * 
 * @version 1.0.0
 * @date November 2025
 */

const mongoose = require('mongoose');

const viewOnceMediaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Recipient Information
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  
  // Media Details
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  
  mediaId: {
    type: String,
    required: true // WhatsApp media ID
  },
  
  mediaUrl: {
    type: String // Local media URL for reference
  },
  
  caption: {
    type: String,
    maxlength: 1024
  },
  
  fileSize: {
    type: Number // Bytes
  },
  
  fileName: {
    type: String
  },
  
  // WhatsApp API Response
  whatsappMessageId: {
    type: String,
    index: true,
    unique: true,
    sparse: true
  },
  
  whatsappStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  
  // View Tracking
  isViewed: {
    type: Boolean,
    default: false
  },
  
  viewedAt: {
    type: Date
  },
  
  viewDuration: {
    type: Number // Seconds the media was viewed
  },
  
  // Timestamps
  sentAt: {
    type: Date,
    default: Date.now
  },
  
  deliveredAt: Date,
  
  readAt: Date,
  
  // Metadata
  metadata: {
    deviceType: String,
    appVersion: String,
    ipAddress: String
  },
  
  // Error Tracking
  error: {
    code: String,
    message: String,
    timestamp: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
viewOnceMediaSchema.index({ userId: 1, createdAt: -1 });
viewOnceMediaSchema.index({ userId: 1, phoneNumber: 1 });
viewOnceMediaSchema.index({ whatsappStatus: 1, createdAt: -1 });
viewOnceMediaSchema.index({ isViewed: 1, createdAt: -1 });

// Virtual for time since sent
viewOnceMediaSchema.virtual('timeSinceSent').get(function() {
  return Date.now() - this.sentAt.getTime();
});

// Method: Mark as viewed
viewOnceMediaSchema.methods.markAsViewed = async function(viewDuration = 0) {
  if (!this.isViewed) {
    this.isViewed = true;
    this.viewedAt = new Date();
    this.viewDuration = viewDuration;
    await this.save();
  }
  return this;
};

// Method: Update WhatsApp status
viewOnceMediaSchema.methods.updateStatus = async function(status, timestamp = new Date()) {
  this.whatsappStatus = status;
  
  if (status === 'delivered') {
    this.deliveredAt = timestamp;
  } else if (status === 'read') {
    this.readAt = timestamp;
    // Mark as viewed when read
    if (!this.isViewed) {
      await this.markAsViewed();
    }
  }
  
  await this.save();
  return this;
};

// Method: Record error
viewOnceMediaSchema.methods.recordError = async function(errorCode, errorMessage) {
  this.whatsappStatus = 'failed';
  this.error = {
    code: errorCode,
    message: errorMessage,
    timestamp: new Date()
  };
  await this.save();
  return this;
};

// Static method: Get user stats
viewOnceMediaSchema.statics.getUserStats = async function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const stats = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSent: { $sum: 1 },
        totalViewed: {
          $sum: { $cond: ['$isViewed', 1, 0] }
        },
        images: {
          $sum: { $cond: [{ $eq: ['$mediaType', 'image'] }, 1, 0] }
        },
        videos: {
          $sum: { $cond: [{ $eq: ['$mediaType', 'video'] }, 1, 0] }
        },
        avgViewDuration: { $avg: '$viewDuration' }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalSent: 0,
      totalViewed: 0,
      viewRate: 0,
      images: 0,
      videos: 0,
      avgViewDuration: 0
    };
  }
  
  const result = stats[0];
  return {
    totalSent: result.totalSent,
    totalViewed: result.totalViewed,
    viewRate: result.totalSent > 0 ? ((result.totalViewed / result.totalSent) * 100).toFixed(1) : 0,
    images: result.images,
    videos: result.videos,
    avgViewDuration: Math.round(result.avgViewDuration || 0)
  };
};

// Static method: Get recent view-once media
viewOnceMediaSchema.statics.getRecent = async function(userId, limit = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-metadata -error');
};

module.exports = mongoose.model('ViewOnceMedia', viewOnceMediaSchema);
