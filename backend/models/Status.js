/**
 * ✅ FEATURE 27: STATUS MODEL
 * 
 * WhatsApp Status/Story Updates - 24-hour ephemeral posts
 * Similar to Instagram Stories or WhatsApp Status
 * 
 * Features:
 * - Text, image, or video status
 * - Auto-expires after 24 hours
 * - View count tracking
 * - Analytics (views, reach)
 * 
 * @version 1.0.0
 * @date November 2025
 */

const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Status Content
  type: {
    type: String,
    enum: ['text', 'image', 'video'],
    required: true
  },
  
  content: {
    type: String, // For text status or media caption
    maxlength: 5000
  },
  
  // Media (for image/video status)
  mediaId: {
    type: String // WhatsApp media ID
  },
  
  mediaUrl: {
    type: String // Local media URL
  },
  
  mediaType: {
    type: String,
    enum: ['image', 'video']
  },
  
  // Status Settings
  backgroundColor: {
    type: String,
    default: '#128C7E' // WhatsApp green
  },
  
  textColor: {
    type: String,
    default: '#FFFFFF'
  },
  
  font: {
    type: String,
    enum: ['default', 'serif', 'sans-serif', 'bold', 'italic'],
    default: 'default'
  },
  
  // Privacy Settings
  privacy: {
    type: String,
    enum: ['all', 'contacts', 'selected'],
    default: 'all'
  },
  
  allowedViewers: [{
    type: String // Phone numbers who can view
  }],
  
  blockedViewers: [{
    type: String // Phone numbers who cannot view
  }],
  
  // Analytics
  views: [{
    phoneNumber: String,
    viewedAt: {
      type: Date,
      default: Date.now
    },
    viewDuration: Number // seconds
  }],
  
  totalViews: {
    type: Number,
    default: 0
  },
  
  uniqueViewers: {
    type: Number,
    default: 0
  },
  
  // WhatsApp API Response
  whatsappMessageId: {
    type: String,
    index: true
  },
  
  whatsappStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  
  // Expiry Management
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // 24 hours from now
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  
  isExpired: {
    type: Boolean,
    default: false,
    index: true
  },
  
  expiredAt: Date,
  
  // Metadata
  metadata: {
    deviceType: String,
    appVersion: String,
    location: {
      latitude: Number,
      longitude: Number
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
statusSchema.index({ userId: 1, createdAt: -1 });
statusSchema.index({ userId: 1, isExpired: 1 });
statusSchema.index({ expiresAt: 1, isExpired: 1 });

// Virtual for time remaining
statusSchema.virtual('timeRemaining').get(function() {
  if (this.isExpired) return 0;
  const now = new Date();
  const remaining = this.expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(remaining / 1000)); // seconds
});

// Virtual for is viewable
statusSchema.virtual('isViewable').get(function() {
  return !this.isExpired && this.expiresAt > new Date();
});

// Method: Check if status is expired
statusSchema.methods.checkExpiry = async function() {
  if (!this.isExpired && new Date() >= this.expiresAt) {
    this.isExpired = true;
    this.expiredAt = new Date();
    await this.save();
    return true;
  }
  return false;
};

// Method: Add view
statusSchema.methods.addView = async function(phoneNumber, viewDuration = 0) {
  // Check if already viewed by this number
  const existingView = this.views.find(v => v.phoneNumber === phoneNumber);
  
  if (!existingView) {
    this.views.push({
      phoneNumber,
      viewedAt: new Date(),
      viewDuration
    });
    this.uniqueViewers += 1;
  }
  
  this.totalViews += 1;
  await this.save();
  
  return {
    totalViews: this.totalViews,
    uniqueViewers: this.uniqueViewers
  };
};

// Method: Get viewers list
statusSchema.methods.getViewers = function() {
  return this.views.map(v => ({
    phoneNumber: v.phoneNumber,
    viewedAt: v.viewedAt,
    viewDuration: v.viewDuration
  }));
};

// Method: Check if phone number can view
statusSchema.methods.canView = function(phoneNumber) {
  // Check if expired
  if (this.isExpired) return false;
  
  // Check blocked list
  if (this.blockedViewers.includes(phoneNumber)) return false;
  
  // Check privacy settings
  if (this.privacy === 'all') return true;
  if (this.privacy === 'selected') {
    return this.allowedViewers.includes(phoneNumber);
  }
  
  // For 'contacts' privacy, would need to check contact list
  // For now, default to true
  return true;
};

// Static method: Get active statuses for user
statusSchema.statics.getActiveStatuses = async function(userId) {
  return this.find({
    userId,
    isExpired: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

// Static method: Expire old statuses (called by cron job)
statusSchema.statics.expireOldStatuses = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      isExpired: false,
      expiresAt: { $lte: now }
    },
    {
      $set: {
        isExpired: true,
        expiredAt: now
      }
    }
  );
  
  return result.modifiedCount;
};

// Static method: Clean up old expired statuses (older than 7 days)
statusSchema.statics.cleanupExpired = async function(daysOld = 7) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const result = await this.deleteMany({
    isExpired: true,
    expiredAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
};

// Pre-save middleware
statusSchema.pre('save', function(next) {
  // Auto-expire if past expiry time
  if (!this.isExpired && new Date() >= this.expiresAt) {
    this.isExpired = true;
    this.expiredAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Status', statusSchema);
