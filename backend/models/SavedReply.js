const mongoose = require('mongoose');

const savedReplySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  shortcut: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  message: {
    type: String,
    required: true,
    maxlength: 4096, // WhatsApp message limit
  },
  category: {
    type: String,
    enum: ['greeting', 'support', 'sales', 'closing', 'faq', 'other'],
    default: 'other',
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsedAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for user-specific queries
savedReplySchema.index({ userId: 1, isActive: 1, category: 1 });

// Update the updatedAt field before saving
savedReplySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Increment usage count
savedReplySchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

const SavedReply = mongoose.model('SavedReply', savedReplySchema);

module.exports = SavedReply;
