const mongoose = require('mongoose');

/**
 * OptInConsent Schema
 * Manages user consent for different types of WhatsApp communications
 * Compliant with GDPR, TCPA, and WhatsApp Business Policy
 */
const optInConsentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  
  // Consent channels
  channels: {
    marketing: {
      consented: {
        type: Boolean,
        default: false
      },
      consentedAt: Date,
      source: String, // 'web', 'app', 'sms', 'whatsapp', 'manual'
      ipAddress: String,
      userAgent: String
    },
    
    service: {
      consented: {
        type: Boolean,
        default: true // Service messages usually auto-consented
      },
      consentedAt: Date,
      source: String
    },
    
    transactional: {
      consented: {
        type: Boolean,
        default: true // Transactional messages usually auto-consented
      },
      consentedAt: Date,
      source: String
    },
    
    promotional: {
      consented: {
        type: Boolean,
        default: false
      },
      consentedAt: Date,
      source: String
    }
  },
  
  // Opt-out tracking
  optedOut: {
    type: Boolean,
    default: false,
    index: true
  },
  
  optedOutAt: Date,
  
  optedOutReason: {
    type: String,
    enum: [
      'user_request',
      'spam_complaint',
      'quality_issue',
      'not_interested',
      'wrong_number',
      'other'
    ]
  },
  
  optOutSource: String, // Where they opted out from
  
  // Consent history
  consentHistory: [{
    action: {
      type: String,
      enum: ['opted_in', 'opted_out', 'channel_enabled', 'channel_disabled', 'consent_renewed']
    },
    channel: String, // 'marketing', 'service', 'transactional', 'promotional', 'all'
    timestamp: {
      type: Date,
      default: Date.now
    },
    source: String,
    ipAddress: String,
    notes: String
  }],
  
  // Verification
  verified: {
    type: Boolean,
    default: false
  },
  
  verifiedAt: Date,
  
  verificationMethod: {
    type: String,
    enum: ['sms', 'whatsapp', 'email', 'manual', 'double_opt_in']
  },
  
  // GDPR compliance
  dataProcessingConsent: {
    type: Boolean,
    default: false
  },
  
  dataProcessingConsentedAt: Date,
  
  // Preferences
  preferences: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'as_needed'],
      default: 'as_needed'
    },
    
    quietHours: {
      enabled: {
        type: Boolean,
        default: false
      },
      start: String, // HH:MM format
      end: String
    },
    
    preferredLanguage: {
      type: String,
      default: 'en'
    },
    
    topics: [String] // Topics user is interested in
  },
  
  // Compliance metadata
  metadata: {
    consentText: String, // The exact text user agreed to
    termsVersion: String, // Version of T&C they agreed to
    privacyPolicyVersion: String,
    
    firstConsentAt: Date,
    lastConsentRenewalAt: Date,
    
    // Campaign associations
    campaigns: [{
      campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign'
      },
      receivedAt: Date
    }],
    
    // Message counts
    messagesSent: {
      type: Number,
      default: 0
    },
    
    messagesDelivered: {
      type: Number,
      default: 0
    },
    
    lastMessageAt: Date
  },
  
  // Warnings and flags
  flags: {
    spam: {
      type: Boolean,
      default: false
    },
    
    blocked: {
      type: Boolean,
      default: false
    },
    
    invalid: {
      type: Boolean,
      default: false
    },
    
    doNotContact: {
      type: Boolean,
      default: false
    }
  },
  
  notes: String // Admin notes
  
}, {
  timestamps: true
});

// Compound indexes
optInConsentSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });
optInConsentSchema.index({ userId: 1, optedOut: 1 });
optInConsentSchema.index({ userId: 1, 'channels.marketing.consented': 1 });
optInConsentSchema.index({ phoneNumber: 1, optedOut: 1 });

/**
 * Check if contact has consented to a specific channel
 */
optInConsentSchema.methods.hasConsent = function(channel = 'marketing') {
  if (this.optedOut) return false;
  if (this.flags.doNotContact) return false;
  if (this.flags.blocked) return false;
  
  return this.channels[channel]?.consented || false;
};

/**
 * Grant consent for a channel
 */
optInConsentSchema.methods.grantConsent = async function(channel, source, metadata = {}) {
  if (!this.channels[channel]) {
    throw new Error(`Invalid channel: ${channel}`);
  }
  
  this.channels[channel].consented = true;
  this.channels[channel].consentedAt = new Date();
  this.channels[channel].source = source;
  
  if (metadata.ipAddress) {
    this.channels[channel].ipAddress = metadata.ipAddress;
  }
  
  if (metadata.userAgent) {
    this.channels[channel].userAgent = metadata.userAgent;
  }
  
  // Add to history
  this.consentHistory.push({
    action: 'channel_enabled',
    channel,
    timestamp: new Date(),
    source,
    ipAddress: metadata.ipAddress,
    notes: metadata.notes
  });
  
  // Update first consent timestamp
  if (!this.metadata.firstConsentAt) {
    this.metadata.firstConsentAt = new Date();
  }
  
  // If this brings them back from opted out
  if (this.optedOut) {
    this.optedOut = false;
    this.optedOutAt = null;
    this.optedOutReason = null;
  }
  
  await this.save();
};

/**
 * Revoke consent for a channel
 */
optInConsentSchema.methods.revokeConsent = async function(channel, reason, source) {
  if (!this.channels[channel]) {
    throw new Error(`Invalid channel: ${channel}`);
  }
  
  this.channels[channel].consented = false;
  
  // Add to history
  this.consentHistory.push({
    action: 'channel_disabled',
    channel,
    timestamp: new Date(),
    source,
    notes: reason
  });
  
  // Check if all channels are now disabled
  const allDisabled = Object.keys(this.channels).every(
    ch => !this.channels[ch].consented
  );
  
  if (allDisabled) {
    this.optedOut = true;
    this.optedOutAt = new Date();
    this.optedOutReason = reason;
    this.optOutSource = source;
  }
  
  await this.save();
};

/**
 * Opt out completely (all channels)
 */
optInConsentSchema.methods.optOutCompletely = async function(reason, source) {
  this.optedOut = true;
  this.optedOutAt = new Date();
  this.optedOutReason = reason;
  this.optOutSource = source;
  
  // Disable all channels
  Object.keys(this.channels).forEach(channel => {
    this.channels[channel].consented = false;
  });
  
  // Add to history
  this.consentHistory.push({
    action: 'opted_out',
    channel: 'all',
    timestamp: new Date(),
    source,
    notes: reason
  });
  
  await this.save();
};

/**
 * Opt back in
 */
optInConsentSchema.methods.optBackIn = async function(channels = ['marketing'], source) {
  this.optedOut = false;
  this.optedOutAt = null;
  this.optedOutReason = null;
  
  // Re-enable specified channels
  channels.forEach(channel => {
    if (this.channels[channel]) {
      this.channels[channel].consented = true;
      this.channels[channel].consentedAt = new Date();
      this.channels[channel].source = source;
    }
  });
  
  // Add to history
  this.consentHistory.push({
    action: 'opted_in',
    channel: channels.join(', '),
    timestamp: new Date(),
    source,
    notes: 'User opted back in'
  });
  
  await this.save();
};

/**
 * Verify consent (double opt-in)
 */
optInConsentSchema.methods.verifyConsent = async function(method) {
  this.verified = true;
  this.verifiedAt = new Date();
  this.verificationMethod = method;
  
  await this.save();
};

/**
 * Track message sent
 */
optInConsentSchema.methods.trackMessageSent = async function(delivered = false) {
  this.metadata.messagesSent += 1;
  if (delivered) {
    this.metadata.messagesDelivered += 1;
  }
  this.metadata.lastMessageAt = new Date();
  
  await this.save();
};

/**
 * Get consent summary
 */
optInConsentSchema.methods.getSummary = function() {
  return {
    phoneNumber: this.phoneNumber,
    optedOut: this.optedOut,
    verified: this.verified,
    channels: {
      marketing: this.channels.marketing.consented,
      service: this.channels.service.consented,
      transactional: this.channels.transactional.consented,
      promotional: this.channels.promotional.consented
    },
    preferences: this.preferences,
    flags: this.flags,
    messageStats: {
      sent: this.metadata.messagesSent,
      delivered: this.metadata.messagesDelivered,
      lastMessageAt: this.metadata.lastMessageAt
    },
    consentedAt: this.channels.marketing.consentedAt || this.metadata.firstConsentAt,
    optedOutAt: this.optedOutAt
  };
};

/**
 * Static method: Get or create consent record
 */
optInConsentSchema.statics.getOrCreate = async function(userId, phoneNumber) {
  let consent = await this.findOne({ userId, phoneNumber });
  
  if (!consent) {
    consent = await this.create({
      userId,
      phoneNumber,
      channels: {
        marketing: { consented: false },
        service: { consented: true, consentedAt: new Date(), source: 'default' },
        transactional: { consented: true, consentedAt: new Date(), source: 'default' },
        promotional: { consented: false }
      }
    });
  }
  
  return consent;
};

/**
 * Static method: Get consented contacts for a channel
 */
optInConsentSchema.statics.getConsentedContacts = async function(userId, channel = 'marketing') {
  return await this.find({
    userId,
    optedOut: false,
    'flags.doNotContact': false,
    'flags.blocked': false,
    [`channels.${channel}.consented`]: true
  });
};

/**
 * Static method: Get opt-out statistics
 */
optInConsentSchema.statics.getOptOutStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const [total, optedOut, byReason, recentOptOuts] = await Promise.all([
    this.countDocuments({ userId }),
    this.countDocuments({ userId, optedOut: true }),
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), optedOut: true } },
      { $group: { _id: '$optedOutReason', count: { $sum: 1 } } }
    ]),
    this.countDocuments({
      userId,
      optedOut: true,
      optedOutAt: { $gte: startDate }
    })
  ]);
  
  return {
    total,
    optedOut,
    optedIn: total - optedOut,
    optOutRate: total > 0 ? ((optedOut / total) * 100).toFixed(2) : 0,
    byReason: byReason.map(r => ({ reason: r._id, count: r.count })),
    recentOptOuts
  };
};

/**
 * Static method: Bulk import consents
 */
optInConsentSchema.statics.bulkImport = async function(userId, contacts, channel = 'marketing', source = 'import') {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  for (const contact of contacts) {
    try {
      const { phoneNumber, consented = true } = contact;
      
      if (!phoneNumber) {
        results.skipped++;
        continue;
      }
      
      let consent = await this.findOne({ userId, phoneNumber });
      
      if (!consent) {
        consent = await this.create({
          userId,
          phoneNumber,
          channels: {
            marketing: {
              consented: channel === 'marketing' ? consented : false,
              consentedAt: consented ? new Date() : null,
              source
            },
            service: { consented: true, consentedAt: new Date(), source: 'default' },
            transactional: { consented: true, consentedAt: new Date(), source: 'default' },
            promotional: {
              consented: channel === 'promotional' ? consented : false,
              consentedAt: consented ? new Date() : null,
              source
            }
          },
          metadata: {
            firstConsentAt: consented ? new Date() : null
          }
        });
      } else {
        if (consented) {
          await consent.grantConsent(channel, source);
        }
      }
      
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        phoneNumber: contact.phoneNumber,
        error: error.message
      });
    }
  }
  
  return results;
};

const OptInConsent = mongoose.model('OptInConsent', optInConsentSchema);

module.exports = OptInConsent;
