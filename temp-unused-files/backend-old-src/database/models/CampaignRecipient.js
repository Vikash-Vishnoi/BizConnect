const mongoose = require('mongoose');

/**
 * CampaignRecipient Model
 *  
 * Stores individual recipient data for campaigns separately
 * This allows campaigns with 100K+ recipients without bloating Campaign document
 * 
 * Space Optimization:
 * - Campaign stores template ONCE
 * - Each recipient document is ~200 bytes
 * - 100K recipients = ~20 MB (vs 500 MB storing full messages)
 * 
 * @module models/CampaignRecipient
 */

const campaignRecipientSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true
  },
  
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
    index: true
  },
  
  variables: {
    type: Map,
    of: String,
    default: {}
  },
  
  status: {
    type: String,
    enum: ['pending', 'queued', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
    index: true
  },
  queuedAt: {
    type: Date,
    default: null
  },
  
  sentAt: {
    type: Date,
    default: null,
    index: true
  },
  
  deliveredAt: {
    type: Date,
    default: null
  },
  
  readAt: {
    type: Date,
    default: null
  },
  
  failedAt: {
    type: Date,
    default: null
  },
  whatsappMessageId: {
    type: String,
    default: null,
    index: true
  },
  failedReason: {
    type: String,
    default: null
  },
  
  errorCode: {
    type: String,
    default: null
  },
  
  retryCount: {
    type: Number,
    default: 0
  }
  
}, {
  timestamps: true
});

campaignRecipientSchema.index({ campaignId: 1, status: 1 });
campaignRecipientSchema.index({ campaignId: 1, sentAt: -1 });
campaignRecipientSchema.index({ businessId: 1, status: 1 });
campaignRecipientSchema.index({ contactId: 1, campaignId: 1 });

campaignRecipientSchema.statics.getCampaignStats = async function(campaignId) {
  const stats = await this.aggregate([
    { $match: { campaignId: mongoose.Types.ObjectId(campaignId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    pending: 0,
    queued: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

campaignRecipientSchema.statics.getByStatus = async function(campaignId, status, limit = 100) {
  return this.find({ 
    campaignId,
    status 
  })
  .limit(limit)
  .lean();
};

campaignRecipientSchema.statics.updateStatus = async function(recipientId, status, metadata = {}) {
  const update = {
    status,
    ...metadata
  };
  
  if (status === 'sent') update.sentAt = new Date();
  if (status === 'delivered') update.deliveredAt = new Date();
  if (status === 'read') update.readAt = new Date();
  if (status === 'failed') update.failedAt = new Date();
  
  return this.findByIdAndUpdate(recipientId, update, { new: true });
};

campaignRecipientSchema.statics.bulkCreateRecipients = async function(campaignId, businessId, contacts) {
  const recipients = contacts.map(contact => ({
    campaignId,
    businessId,
    contactId: contact._id,
    variables: contact.variables || {},
    status: 'pending'
  }));
  
  return this.insertMany(recipients);
};

campaignRecipientSchema.methods.getFullMessage = async function() {
  const Campaign = mongoose.model('Campaign');
  const campaign = await Campaign.findById(this.campaignId).populate('templateId');
  
  if (!campaign || !campaign.templateId) {
    return null;
  }
  
  let messageText = campaign.templateId.content;
  
  if (this.variables) {
    this.variables.forEach((value, key) => {
      messageText = messageText.replace(`{{${key}}}`, value);
    });
  }
  
  return {
    text: messageText,
    templateName: campaign.templateId.name,
    templateId: campaign.templateId._id,
    variables: Object.fromEntries(this.variables)
  };
};

const CampaignRecipient = mongoose.model('CampaignRecipient', campaignRecipientSchema);

module.exports = CampaignRecipient;
