const mongoose = require('mongoose');

/**
 * Support Ticket Schema
 * Stores help requests and contact form submissions
 */
const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    default: null,
    index: true
  },
  type: {
    type: String,
    enum: ['help', 'contact'],
    required: true,
    default: 'contact',
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    default: null
  },
  mobile: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\+[0-9]{10,15}$/.test(v);
      },
      message: 'Mobile number must include country code (e.g., +919876543210)'
    }
  },
  company: {
    type: String,
    trim: true,
    default: null
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: [{
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    note: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
supportTicketSchema.index({ type: 1, status: 1 });
supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ businessId: 1, createdAt: -1 });
supportTicketSchema.index({ email: 1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

/**
 * Mark ticket as resolved
 */
supportTicketSchema.methods.resolve = async function(userId) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  return await this.save();
};

/**
 * Add a note to the ticket
 */
supportTicketSchema.methods.addNote = async function(userId, noteText) {
  this.notes.push({
    addedBy: userId,
    note: noteText,
    addedAt: new Date()
  });
  return await this.save();
};

/**
 * Assign ticket to a user
 */
supportTicketSchema.methods.assignTo = async function(userId) {
  this.assignedTo = userId;
  if (this.status === 'open') {
    this.status = 'in-progress';
  }
  return await this.save();
};

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

module.exports = SupportTicket;
