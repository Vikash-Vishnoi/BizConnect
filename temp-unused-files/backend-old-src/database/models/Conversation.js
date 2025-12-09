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
 
const messageSchema = new mongoose.Schema({
  whatsappMessageId: {
    type: String
  },
  direction: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'template', 'interactive', 'reaction', 'contacts', 'sticker'],
    default: 'text'
  },
  error: {
    code: String,
    message: String,
    timestamp: Date,
    retryCount: { type: Number, default: 0 }
  },
  content: {
    text: String,
    mediaUrl: String,
    mediaId: String,
    mediaType: String,
    mimeType: String,
    caption: String,
    filename: String,
    location: {
      latitude: Number,
      longitude: Number,
      name: String,
      address: String
    },
    interactive: {
      type: { type: String },
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
    template: {
      name: String,
      language: String,
      components: [{
        type: String,
        parameters: [mongoose.Schema.Types.Mixed]
      }]
    },
    reaction: {
      messageId: String,
      emoji: String
    },
    contacts: [{
      name:String,
      phones: [{
        phone: String,
        type: String
      }]
    }],
    
    context: {
      messageId: String
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
  reactions: [{
    direction: {
      type: String,
      enum: ['in', 'out'],
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  }
}, { _id: true });

const lastMessageSchema = new mongoose.Schema({
  text: String,
  type: String,
  direction: String,
  timestamp: Date,
  status: String
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    index: true
  },
  contact: {
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    name: String,
    profilePicture: String
  },
  messages: [messageSchema],
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
    enum: ['active', 'archived', 'blocked'],
    default: 'active',
    index: true
  },
  metrics: {
    totalMessages: { type: Number, default: 0 }
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

conversationSchema.index({ 'contact.phoneNumber': 1, businessId: 1 }, { unique: true });
conversationSchema.index({ businessId: 1, status: 1, lastMessageAt: -1 });
conversationSchema.index({ businessId: 1, unreadCount: 1 });
conversationSchema.index({ 'messages.whatsappMessageId': 1 }, { sparse: true });

conversationSchema.virtual('recentMessages').get(function() {
  return this.messages.slice(-50);
});

/**
 * Add a new message to the conversation
 */
conversationSchema.methods.addMessage = async function(messageData) {
  this.messages.push(messageData);
  
  this.lastMessage = {
    text: messageData.content?.text || `[${messageData.type}]`,
    type: messageData.type,
    direction: messageData.direction,
    timestamp: messageData.timestamp || new Date(),
    status: messageData.status
  };
  this.lastMessageAt = messageData.timestamp || new Date();
  
  this.metrics.totalMessages += 1;
  if (messageData.direction === 'in' && messageData.status !== 'read') {
    this.unreadCount += 1;
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
    if (msg.direction === 'in' && msg.status !== 'read') {
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
  if (message && message.direction === 'in' && message.status !== 'read') {
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
    
    const latestMessage = this.messages[this.messages.length - 1];
    if (latestMessage._id.equals(message._id)) {
      this.lastMessage.status = status;
    }
    
    await this.save();
  }
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

/**
 * Find or create conversation by phone number
 * Conversation is between business and customer (identified by phone number)
 */
conversationSchema.statics.findOrCreateByPhone = async function(phoneNumber, businessId, contactData = {}) {
  const normalized = this.normalizePhone(phoneNumber);
  
  let conversation = await this.findOne({
    'contact.phoneNumber': normalized,
    businessId: businessId
  });
  
  if (!conversation) {
    conversation = await this.create({
      contact: {
        phoneNumber: normalized,
        name: contactData.name || phoneNumber,
        profilePicture: contactData.profilePicture
      },
      businessId: businessId,
      messages: []
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
conversationSchema.statics.getPaginated = async function(businessId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = 'active',
    search = '',
    sortBy = 'lastMessageAt',
    sortOrder = -1
  } = options;
  
  const query = {
    businessId: businessId
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
      .select(
        'contact.phoneNumber contact.name contact.profilePicture ' +
        'lastMessage lastMessageAt unreadCount status ' +
        'metrics.totalMessages'
      )
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
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit)
    }
  };
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
