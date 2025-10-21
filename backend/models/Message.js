const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  whatsappMessageId: {
    type: String,
    unique: true,
    sparse: true
  },
  from: {
    type: String,
    required: [true, 'Sender is required'],
    trim: true
  },
  to: {
    type: String,
    required: [true, 'Recipient is required'],
    trim: true
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'template'],
    default: 'text'
  },
  content: {
    text: {
      type: String,
      trim: true
    },
    mediaUrl: {
      type: String,
      default: null
    },
    mediaType: {
      type: String,
      default: null
    },
    caption: {
      type: String,
      trim: true,
      default: null
    },
    filename: {
      type: String,
      default: null
    },
    templateName: {
      type: String,
      default: null
    },
    location: {
      latitude: Number,
      longitude: Number,
      name: String,
      address: String
    }
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  timestamp: {
    type: Date,
    default: Date.now,
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
  error: {
    code: String,
    message: String
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null
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
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ userId: 1, timestamp: -1 });
messageSchema.index({ status: 1, timestamp: -1 });
messageSchema.index({ campaignId: 1 });

// Update conversation after saving message
messageSchema.post('save', async function() {
  try {
    const Conversation = mongoose.model('Conversation');
    const conversation = await Conversation.findById(this.conversationId);
    
    if (conversation) {
      conversation.lastMessage = this.content.text || `[${this.type}]`;
      conversation.lastMessageAt = this.timestamp;
      
      // Increment unread count for incoming messages
      if (this.direction === 'incoming' && this.status !== 'read') {
        conversation.unreadCount += 1;
      }
      
      await conversation.save();
    }
  } catch (error) {
    console.error('Error updating conversation:', error);
  }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
