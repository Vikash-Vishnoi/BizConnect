const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    index: true
  },
  name: {
    type: String,
    trim: true,
    default: null
  },
  profilePicture: {
    type: String,
    default: null
  },
  lastMessage: {
    type: String,
    trim: true,
    default: null
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true,
    default: null
  },
  metadata: {
    source: {
      type: String,
      enum: ['campaign', 'webhook', 'manual'],
      default: 'webhook'
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null
    },
    customFields: {
      type: Map,
      of: String,
      default: {}
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
conversationSchema.index({ userId: 1, lastMessageAt: -1 });
conversationSchema.index({ status: 1, lastMessageAt: -1 });
conversationSchema.index({ phoneNumber: 1, userId: 1 }, { unique: true });

// Method to mark as read
conversationSchema.methods.markAsRead = async function() {
  this.unreadCount = 0;
  await this.save();
};

// Method to increment unread count
conversationSchema.methods.incrementUnread = async function() {
  this.unreadCount += 1;
  await this.save();
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
