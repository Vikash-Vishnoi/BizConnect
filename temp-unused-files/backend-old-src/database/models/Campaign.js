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
  schedule: {
    type: {
      type: String,
      enum: ['immediate', 'scheduled'],
      default: 'immediate'
    },
    scheduledFor: {
      type: Date,
      default: null
    },
    scheduledTime: {
      type: String,
      default: null
    }
  },
  recipients: [{
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampaignRecipient'
    }
  }],
  usesSeparateRecipients: {
    type: Boolean,
    default: true
  },
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
      default: 70,
      min: 1,
      max: 80
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
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

campaignSchema.index({ status: 1, createdAt: -1 });
campaignSchema.index({ userId: 1, createdAt: -1 });
campaignSchema.index({ businessId: 1, status: 1, createdAt: -1 });

campaignSchema.methods.updateStats = async function() {
  if (!this.usesSeparateRecipients) return;
  
  const CampaignRecipient = mongoose.model('CampaignRecipient');
  const stats = await CampaignRecipient.getCampaignStats(this._id);
  
  this.stats = stats;
  await this.save();
  
  return stats;
};

campaignSchema.methods.getProgress = function() {
  if (this.stats.total === 0) return 0;
  return Math.round((this.stats.sent / this.stats.total) * 100);
};

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
