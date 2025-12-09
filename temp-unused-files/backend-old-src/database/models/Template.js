const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [200, 'Template name cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
    default: 'MARKETING' 
  },
  language: {
    type: String,
    required: [true, 'Language is required'],
    default: 'en'
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'paused', 'disabled', 'in_appeal'],
    default: 'draft'
  },
  whatsappTemplateId: {
    type: String,
    default: null
  },
  whatsappStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED', 'IN_APPEAL', 'PENDING_DELETION', null],
    default: null
  },
  
  // Template Quality Score (updated by message_template_quality_update webhook)
  qualityScore: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN', null],
    default: null
  },
  
  // Quality History
  qualityHistory: [{
    score: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  
  // Template Status Update Info (from webhook)
  statusUpdateInfo: {
    lastStatusChange: Date,
    statusChangeReason: String,
    pausedAt: Date,
    pauseReason: String
  },
  
  // Template Namespace (for some API configurations)
  namespace: {
    type: String,
    default: null
  },
  
  components: [{
    type: {
      type: String,
      enum: ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'],
      required: true
    },
    format: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'],
      default: 'TEXT'
    },
    text: {
      type: String,
      trim: true
    },
    example: {
      type: mongoose.Schema.Types.Mixed
    },
    buttons: [{
      type: {
        type: String,
        enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'COPY_CODE', 'CATALOG', 'FLOW', 'MPM', 'VOICE_CALL']
      },
      text: String,
      url: String,
      phoneNumber: String,
      example: [String], // For dynamic URL buttons
      flowId: String, // For FLOW button type
      catalogId: String // For CATALOG button type
    }]
  }],
  variables: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    example: {
      type: String,
      default: ''
    }
  }],
  rejectionReason: {
    type: String,
    default: null
  },
  usage: {
    messagesSent: {
      type: Number,
      default: 0
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

templateSchema.index({ status: 1, createdAt: -1 });
templateSchema.index({ userId: 1, createdAt: -1 });
templateSchema.index({ whatsappTemplateId: 1 });
templateSchema.index({ businessId: 1, status: 1, createdAt: -1 });
templateSchema.index({ businessId: 1, name: 1 }, { unique: true });

templateSchema.methods.getBodyText = function() {
  const bodyComponent = this.components.find(c => c.type === 'BODY');
  return bodyComponent ? bodyComponent.text : '';
};

/**
 * Update template quality score (called by webhook)
 */
templateSchema.methods.updateQualityScore = async function(qualityData) {
  // Add to history
  this.qualityHistory.push({
    score: qualityData.score,
    timestamp: new Date(),
    reason: qualityData.reason
  });
  
  // Update current score
  this.qualityScore = qualityData.score;
  
  // Keep only last 30 history entries
  if (this.qualityHistory.length > 30) {
    this.qualityHistory = this.qualityHistory.slice(-30);
  }
  
  await this.save();
};

/**
 * Update template status (called by webhook)
 */
templateSchema.methods.updateStatus = async function(statusData) {
  if (statusData.whatsappStatus) {
    this.whatsappStatus = statusData.whatsappStatus;
    
    // Sync local status
    if (statusData.whatsappStatus === 'APPROVED') {
      this.status = 'approved';
    } else if (statusData.whatsappStatus === 'REJECTED') {
      this.status = 'rejected';
      this.rejectionReason = statusData.reason;
    } else if (statusData.whatsappStatus === 'PAUSED') {
      this.status = 'paused';
      this.statusUpdateInfo.pausedAt = new Date();
      this.statusUpdateInfo.pauseReason = statusData.reason;
    } else if (statusData.whatsappStatus === 'DISABLED') {
      this.status = 'disabled';
    }
  }
  
  this.statusUpdateInfo.lastStatusChange = new Date();
  this.statusUpdateInfo.statusChangeReason = statusData.reason;
  
  await this.save();
};

templateSchema.statics.createDefaultTemplates = async function(businessId, userId) {
  const defaultTemplates = [
    {
      name: 'welcome_message',
      category: 'UTILITY',
      language: 'en',
      status: 'approved',
      whatsappStatus: 'APPROVED',
      components: [
        {
          type: 'BODY',
          format: 'TEXT',
          text: 'Hello! 👋 Thank you for contacting us. We\'ve received your message and will respond shortly.'
        }
      ],
      variables: [],
      businessId,
      userId
    },
    {
      name: 'out_of_hours',
      category: 'UTILITY',
      language: 'en',
      status: 'approved',
      whatsappStatus: 'APPROVED',
      components: [
        {
          type: 'BODY',
          format: 'TEXT',
          text: 'Hello! 👋 We\'re currently outside business hours. We\'ll respond when we\'re back.'
        }
      ],
      variables: [],
      businessId,
      userId
    }
  ];

  const createdTemplates = await this.insertMany(defaultTemplates);
  return createdTemplates;
};

/**
 * Get template health statistics for a business
 */
templateSchema.statics.getHealthStats = async function(businessId) {
  const stats = await this.aggregate([
    { $match: { businessId: mongoose.Types.ObjectId(businessId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        paused: {
          $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : {
    total: 0,
    approved: 0,
    rejected: 0,
    paused: 0,
    pending: 0
  };
};

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
