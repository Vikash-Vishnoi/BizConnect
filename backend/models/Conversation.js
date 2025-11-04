const mongoose = require('mongoose');

/**
 * Conversation Model - WhatsApp Business API Aligned
 * 
 * This model combines conversations and messages into one document,
 * following WhatsApp Business API's conversation-centric approach.
 * 
 * Key WhatsApp Business API concepts:
 * - 24-hour conversation window (free after user initiates)
 * - Template messages required after window expires
 * - Pricing based on conversation category (service, marketing, utility, authentication)
 */

// Embedded Message Schema
const messageSchema = new mongoose.Schema({
  whatsappMessageId: {
    type: String,
    sparse: true // Allows multiple null values
    // Note: Index is created at conversation level (line 294)
  },
  from: {
    type: String,
    required: true,
    trim: true
  },
  to: {
    type: String,
    required: true,
    trim: true
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'template', 'interactive', 'reaction', 'contacts', 'sticker'],
    default: 'text'
  },
  content: {
    // Text message
    text: String,
    
    // Media messages
    mediaUrl: String,
    mediaId: String, // WhatsApp media ID
    mediaType: String,
    mimeType: String,
    caption: String,
    filename: String,
    
    // Location
    location: {
      latitude: Number,
      longitude: Number,
      name: String,
      address: String
    },
    
    // Interactive messages (buttons, lists)
    interactive: {
      type: { type: String }, // button, list, product, product_list
      header: String,
      body: String,
      footer: String,
      buttons: [{
        id: String,
        title: String,
        type: String
      }],
      sections: [{
        title: String,
        rows: [{
          id: String,
          title: String,
          description: String
        }]
      }],
      // For interactive responses
      buttonReply: {
        id: String,
        title: String
      },
      listReply: {
        id: String,
        title: String,
        description: String
      }
    },
    
    // Template message
    template: {
      name: String,
      language: String,
      components: [{
        type: String,
        parameters: [mongoose.Schema.Types.Mixed]
      }]
    },
    
    // Reaction
    reaction: {
      messageId: String,
      emoji: String
    },
    
    // Contacts
    contacts: [{
      name: {
        formatted_name: String,
        first_name: String,
        last_name: String
      },
      phones: [{
        phone: String,
        type: String
      }],
      emails: [{
        email: String,
        type: String
      }]
    }],
    
    // Context (for replies)
    context: {
      messageId: String, // ID of message being replied to
      from: String
    }
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  deliveredAt: Date,
  readAt: Date,
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },
  // WhatsApp Business API specific
  pricing: {
    billable: Boolean,
    category: {
      type: String,
      enum: ['service', 'marketing', 'utility', 'authentication', 'referral_conversion']
    },
    pricingModel: String // CBP (Conversation-Based Pricing)
  }
}, { _id: true }); // ✅ FIXED: Removed timestamps to prevent MongoDB from creating separate 'messages' collection

// Last Message Schema (for conversation metadata)
const lastMessageSchema = new mongoose.Schema({
  text: String,
  type: String,
  direction: String,
  timestamp: Date,
  status: String,
  isCampaignMessage: Boolean // ✅ Flag to identify campaign messages (stored in campaign, not conversation)
}, { _id: false });

// Main Conversation Schema
const conversationSchema = new mongoose.Schema({
  // Contact Information
  contact: {
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    name: String,
    profilePicture: String,
    email: String,
    customFields: {
      type: Map,
      of: String
    },
    // WhatsApp Business API contact metadata
    waId: String, // WhatsApp ID (usually same as phone without +)
    profileName: String // Name from WhatsApp profile
  },
  
  // Embedded Messages Array
  messages: [messageSchema],
  
  // Conversation Metadata
  lastMessage: lastMessageSchema,
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  unreadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked', 'closed'],
    default: 'active',
    index: true
  },
  
  // WhatsApp Business API - Conversation Window
  conversationWindow: {
    isOpen: {
      type: Boolean,
      default: false
    },
    openedAt: Date, // When user last messaged (starts 24hr window)
    expiresAt: Date, // 24 hours after openedAt
    category: {
      type: String,
      enum: ['user_initiated', 'business_initiated']
    }
  },
  
  // Source and Campaign Tracking
  source: {
    type: String,
    enum: ['campaign', 'webhook', 'manual', 'api', 'import', 'whatsapp', 'qr_code', 'click_to_chat'],
    default: 'webhook'
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  
  // Metrics
  metrics: {
    totalMessages: { type: Number, default: 0 },
    incomingMessages: { type: Number, default: 0 },
    outgoingMessages: { type: Number, default: 0 },
    templateMessagesSent: { type: Number, default: 0 },
    conversationsOpened: { type: Number, default: 0 }, // How many 24hr windows opened
    responseRate: { type: Number, default: 0 }, // % of messages replied to
    avgResponseTime: { type: Number, default: 0 }, // Milliseconds
    firstResponseTime: Number, // Time to first reply (ms)
    lastResponseTime: Number // Time to most recent reply (ms)
  },
  
  // Quality and Engagement
  quality: {
    hasReplied: { type: Boolean, default: false },
    isResponsive: { type: Boolean, default: false },
    qualityScore: { type: Number, default: 0, min: 0, max: 100 },
    engagementLevel: {
      type: String,
      enum: ['none', 'low', 'medium', 'high'],
      default: 'none'
    }
  },
  
  // Assignment and Management
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedToName: String,
  assignedAt: Date,
  
  // User/Organization
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date
  
}, {
  timestamps: true,
  // Optimize for read performance
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound Indexes for Query Performance
conversationSchema.index({ userId: 1, lastMessageAt: -1 });
conversationSchema.index({ userId: 1, status: 1, lastMessageAt: -1 });
conversationSchema.index({ 'contact.phoneNumber': 1, userId: 1 }, { unique: true });
conversationSchema.index({ userId: 1, unreadCount: 1 });
conversationSchema.index({ campaignId: 1, createdAt: -1 });
conversationSchema.index({ 'messages.whatsappMessageId': 1 }, { sparse: true });
conversationSchema.index({ 'conversationWindow.expiresAt': 1 });

// Virtual: Get unread messages
conversationSchema.virtual('unreadMessages').get(function() {
  return this.messages.filter(msg => 
    msg.direction === 'incoming' && msg.status !== 'read'
  );
});

// Virtual: Get latest messages (last 50)
conversationSchema.virtual('recentMessages').get(function() {
  return this.messages.slice(-50);
});

// Virtual: Check if conversation window is currently open
conversationSchema.virtual('isWindowOpen').get(function() {
  if (!this.conversationWindow?.expiresAt) return false;
  return new Date() < this.conversationWindow.expiresAt;
});

// Instance Methods

/**
 * Add a new message to the conversation
 */
conversationSchema.methods.addMessage = async function(messageData) {
  // Add message to array
  this.messages.push(messageData);
  
  // Update conversation metadata
  this.lastMessage = {
    text: messageData.content?.text || `[${messageData.type}]`,
    type: messageData.type,
    direction: messageData.direction,
    timestamp: messageData.timestamp || new Date(),
    status: messageData.status
  };
  this.lastMessageAt = messageData.timestamp || new Date();
  
  // Update metrics
  this.metrics.totalMessages += 1;
  if (messageData.direction === 'incoming') {
    this.metrics.incomingMessages += 1;
    
    // Update unread count
    if (messageData.status !== 'read') {
      this.unreadCount += 1;
    }
    
    // Open conversation window (24 hours)
    this.openConversationWindow();
  } else {
    this.metrics.outgoingMessages += 1;
    if (messageData.type === 'template') {
      this.metrics.templateMessagesSent += 1;
    }
  }
  
  await this.save();
  return this.messages[this.messages.length - 1];
};

/**
 * Mark all messages as read
 */
conversationSchema.methods.markAsRead = async function() {
  const now = new Date();
  this.messages.forEach(msg => {
    if (msg.direction === 'incoming' && msg.status !== 'read') {
      msg.status = 'read';
      msg.readAt = now;
    }
  });
  this.unreadCount = 0;
  await this.save();
};

/**
 * Mark specific message as read
 */
conversationSchema.methods.markMessageAsRead = async function(messageId) {
  const message = this.messages.id(messageId);
  if (message && message.direction === 'incoming' && message.status !== 'read') {
    message.status = 'read';
    message.readAt = new Date();
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    await this.save();
  }
};

/**
 * Update message status (sent, delivered, read)
 */
conversationSchema.methods.updateMessageStatus = async function(whatsappMessageId, status, statusTimestamp) {
  const message = this.messages.find(msg => msg.whatsappMessageId === whatsappMessageId);
  if (message) {
    message.status = status;
    if (status === 'delivered') {
      message.deliveredAt = statusTimestamp || new Date();
    } else if (status === 'read') {
      message.readAt = statusTimestamp || new Date();
    }
    
    // Update lastMessage status if this is the most recent message
    const latestMessage = this.messages[this.messages.length - 1];
    if (latestMessage._id.equals(message._id)) {
      this.lastMessage.status = status;
    }
    
    await this.save();
  }
};

/**
 * Open 24-hour conversation window (when user messages)
 */
conversationSchema.methods.openConversationWindow = function() {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours
  
  // Only open new window if current one is expired
  if (!this.conversationWindow?.expiresAt || this.conversationWindow.expiresAt < now) {
    this.conversationWindow = {
      isOpen: true,
      openedAt: now,
      expiresAt: expiresAt,
      category: 'user_initiated'
    };
    this.metrics.conversationsOpened += 1;
  }
};

/**
 * Calculate response metrics
 */
conversationSchema.methods.calculateResponseMetrics = async function() {
  const incomingMessages = this.messages.filter(m => m.direction === 'incoming');
  const outgoingMessages = this.messages.filter(m => m.direction === 'outgoing');
  
  if (incomingMessages.length === 0) {
    this.metrics.responseRate = 0;
    return;
  }
  
  // Count how many incoming messages got a reply
  let repliedCount = 0;
  let totalResponseTime = 0;
  
  for (let i = 0; i < incomingMessages.length; i++) {
    const incomingMsg = incomingMessages[i];
    const incomingTime = new Date(incomingMsg.timestamp).getTime();
    
    // Find next outgoing message after this incoming one
    const reply = outgoingMessages.find(outMsg => 
      new Date(outMsg.timestamp).getTime() > incomingTime
    );
    
    if (reply) {
      repliedCount++;
      const responseTime = new Date(reply.timestamp).getTime() - incomingTime;
      totalResponseTime += responseTime;
      
      if (!this.metrics.firstResponseTime) {
        this.metrics.firstResponseTime = responseTime;
      }
      this.metrics.lastResponseTime = responseTime;
    }
  }
  
  this.metrics.responseRate = Math.round((repliedCount / incomingMessages.length) * 100);
  this.metrics.avgResponseTime = repliedCount > 0 ? Math.round(totalResponseTime / repliedCount) : 0;
  
  // Update quality
  this.quality.hasReplied = repliedCount > 0;
  this.quality.isResponsive = this.metrics.avgResponseTime < 3600000; // < 1 hour
  
  await this.save();
};

/**
 * Get messages in date range
 */
conversationSchema.methods.getMessagesByDateRange = function(startDate, endDate) {
  return this.messages.filter(msg => {
    const msgDate = new Date(msg.timestamp);
    return msgDate >= startDate && msgDate <= endDate;
  });
};

/**
 * Archive conversation
 */
conversationSchema.methods.archive = async function() {
  this.status = 'archived';
  await this.save();
};

/**
 * Unarchive conversation
 */
conversationSchema.methods.unarchive = async function() {
  this.status = 'active';
  await this.save();
};

// Static Methods

/**
 * Find or create conversation by phone number
 */
conversationSchema.statics.findOrCreateByPhone = async function(phoneNumber, userId, contactData = {}) {
  const normalized = this.normalizePhone(phoneNumber);
  
  let conversation = await this.findOne({
    'contact.phoneNumber': normalized,
    userId: userId,
    isDeleted: false
  });
  
  if (!conversation) {
    conversation = await this.create({
      contact: {
        phoneNumber: normalized,
        name: contactData.name || phoneNumber,
        profilePicture: contactData.profilePicture,
        email: contactData.email,
        waId: contactData.waId,
        profileName: contactData.profileName
      },
      userId: userId,
      messages: [],
      source: contactData.source || 'webhook'
    });
  }
  
  return conversation;
};

/**
 * Normalize phone number
 */
conversationSchema.statics.normalizePhone = function(phoneNumber) {
  const normalized = phoneNumber.replace(/\D/g, '');
  return normalized.startsWith('91') ? normalized : `91${normalized}`;
};

/**
 * Get conversations with pagination
 */
conversationSchema.statics.getPaginated = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = 'active',
    search = '',
    sortBy = 'lastMessageAt',
    sortOrder = -1
  } = options;
  
  const query = {
    userId: userId,
    isDeleted: false
  };
  
  if (status && status !== 'all') {
    query.status = status;
  }
  
  if (search) {
    query.$or = [
      { 'contact.name': new RegExp(search, 'i') },
      { 'contact.phoneNumber': new RegExp(search, 'i') }
    ];
  }
  
  const skip = (page - 1) * limit;
  
  const [conversations, total] = await Promise.all([
    this.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);
  
  return {
    conversations,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
