const mongoose = require('mongoose');

const qualityRatingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  phoneNumberId: {
    type: String,
    required: true,
    index: true
  },
  rating: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
    required: true
  },
  tier: {
    type: String,
    enum: ['TIER_50', 'TIER_250', 'TIER_1K', 'TIER_10K', 'TIER_100K', 'TIER_UNLIMITED'],
    default: 'TIER_1K'
  },
  messagingLimit: {
    type: Number,
    default: 1000
  },
  nameStatus: {
    type: String,
    default: 'UNKNOWN'
  },
  codeVerificationStatus: {
    type: String,
    default: 'UNKNOWN'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
qualityRatingSchema.index({ userId: 1, timestamp: -1 });
qualityRatingSchema.index({ phoneNumberId: 1, timestamp: -1 });

// Static method to get latest rating for user
qualityRatingSchema.statics.getLatestRating = async function(userId) {
  return this.findOne({ userId })
    .sort({ timestamp: -1 })
    .limit(1);
};

// Static method to get rating history
qualityRatingSchema.statics.getRatingHistory = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    userId,
    timestamp: { $gte: startDate }
  }).sort({ timestamp: 1 });
};

// Static method to detect rating changes
qualityRatingSchema.statics.hasRatingChanged = async function(userId, newRating) {
  const latest = await this.getLatestRating(userId);
  if (!latest) return true;
  return latest.rating !== newRating;
};

// Static method to get rating trend
qualityRatingSchema.statics.getRatingTrend = async function(userId, days = 7) {
  const history = await this.getRatingHistory(userId, days);
  if (history.length < 2) return 'stable';
  
  const ratingValues = {
    'GREEN': 3,
    'HIGH': 3,
    'YELLOW': 2,
    'MEDIUM': 2,
    'RED': 1,
    'LOW': 1,
    'UNKNOWN': 0
  };
  
  const firstRating = ratingValues[history[0].rating] || 0;
  const lastRating = ratingValues[history[history.length - 1].rating] || 0;
  
  if (lastRating > firstRating) return 'improving';
  if (lastRating < firstRating) return 'declining';
  return 'stable';
};

module.exports = mongoose.model('QualityRating', qualityRatingSchema);
