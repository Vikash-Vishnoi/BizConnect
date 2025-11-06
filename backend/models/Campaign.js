const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true,
    maxlength: [200, 'Campaign name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'failed'],
    default: 'draft'
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: [true, 'Template is required for campaign']
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  recipients: [{
    phoneNumber: {
      type: String,
      required: true
    },
    name: {
      type: String,
      default: null
    },
    variables: {
      type: Map,
      of: String,
      default: {}
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending'
    },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    failedReason: String,
    whatsappMessageId: String,
    // ✅ OPTIMIZATION: Store actual message content per recipient (with personalization)
    messageContent: {
      text: String,
      mediaUrl: String,
      templateName: String
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    }
  }],
  stats: {
    total: {
      type: Number,
      default: 0
    },
    sent: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    read: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    }
  },
  settings: {
    sendRate: {
      type: Number,
      default: 10, // messages per minute
      min: 1,
      max: 80 // ✅ FIXED: WhatsApp Business API limit is 80 msg/sec = 4800/min, keeping conservative 80/min
    },
    retryFailed: {
      type: Boolean,
      default: false
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10
    },
    // Message limits to prevent rate limiting and control costs
    messageLimits: {
      enabled: {
        type: Boolean,
        default: false
      },
      dailyLimit: {
        type: Number,
        default: 1000,
        min: 1,
        max: 100000
      },
      hourlyLimit: {
        type: Number,
        default: 100,
        min: 1,
        max: 10000
      },
      // Track sent counts for current period
      dailyCount: {
        type: Number,
        default: 0
      },
      hourlyCount: {
        type: Number,
        default: 0
      },
      lastResetDaily: {
        type: Date,
        default: Date.now
      },
      lastResetHourly: {
        type: Date,
        default: Date.now
      }
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
campaignSchema.index({ status: 1, createdAt: -1 });
campaignSchema.index({ userId: 1, createdAt: -1 });

// Update stats before saving
campaignSchema.pre('save', function(next) {
  if (this.recipients && this.recipients.length > 0) {
    this.stats.total = this.recipients.length;
    this.stats.sent = this.recipients.filter(r => r.status === 'sent' || r.status === 'delivered' || r.status === 'read').length;
    this.stats.delivered = this.recipients.filter(r => r.status === 'delivered' || r.status === 'read').length;
    this.stats.read = this.recipients.filter(r => r.status === 'read').length;
    this.stats.failed = this.recipients.filter(r => r.status === 'failed').length;
    this.stats.pending = this.recipients.filter(r => r.status === 'pending').length;
  }
  next();
});

// Method to get campaign progress percentage
campaignSchema.methods.getProgress = function() {
  if (this.stats.total === 0) return 0;
  return Math.round((this.stats.sent / this.stats.total) * 100);
};

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
