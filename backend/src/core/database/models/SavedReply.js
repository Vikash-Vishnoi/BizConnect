const mongoose = require('mongoose');

const savedReplySchema = new mongoose.Schema({
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
    maxlength: 4096
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
}, {
  timestamps: true
});

savedReplySchema.index({ businessId: 1, isActive: 1, category: 1 });

savedReplySchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

const SavedReply = mongoose.model('SavedReply', savedReplySchema);

module.exports = SavedReply;
