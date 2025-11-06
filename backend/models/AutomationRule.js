const mongoose = require('mongoose');

/**
 * Automation Rule Model - WhatsApp Message Flow Automation
 * 
 * Enables automated message flows based on triggers:
 * - Welcome messages (first contact)
 * - Auto-replies (keyword matching)
 * - Follow-ups (time-based)
 * - Away messages (business hours)
 * - Lead qualification flows
 */

const automationRuleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Trigger configuration
  trigger: {
    type: {
      type: String,
      enum: [
        'new_conversation',      // First message from contact
        'keyword',              // Message contains specific keyword
        'after_hours',          // Message received outside business hours
        'no_response',          // No reply within X minutes
        'message_received',     // Any incoming message
        'specific_time'         // Scheduled trigger
      ],
      required: true
    },
    
    // Keyword trigger settings
    keywords: [{
      type: String,
      lowercase: true,
      trim: true
    }],
    matchType: {
      type: String,
      enum: ['exact', 'contains', 'starts_with', 'ends_with'],
      default: 'contains'
    },
    caseSensitive: {
      type: Boolean,
      default: false
    },
    
    // Time-based trigger settings
    delayMinutes: {
      type: Number,
      min: 1,
      max: 10080 // Max 1 week
    },
    businessHours: {
      enabled: Boolean,
      timezone: String,
      schedule: [{
        day: {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        },
        startTime: String, // Format: "09:00"
        endTime: String    // Format: "18:00"
      }]
    }
  },
  
  // Actions to perform when triggered
  actions: [{
    type: {
      type: String,
      enum: ['send_message', 'send_template', 'add_tag', 'assign_to', 'stop_automation'],
      required: true
    },
    
    // Send message action
    message: {
      type: String,
      maxlength: 4096
    },
    
    // Send template action
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template'
    },
    templateParams: [String],
    
    // Add tag action
    tags: [String],
    
    // Assign to action
    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Delay before executing this action
    delaySeconds: {
      type: Number,
      default: 0,
      min: 0,
      max: 3600 // Max 1 hour delay between actions
    },
    
    order: {
      type: Number,
      default: 0
    }
  }],
  
  // Conditions to check before executing (optional filters)
  conditions: {
    // Only trigger for specific tags
    requiredTags: [String],
    excludedTags: [String],
    
    // Only trigger for specific contact segments
    contactFilter: {
      hasOrdered: Boolean,
      minMessages: Number,
      maxMessages: Number,
      lastMessageWithinDays: Number
    },
    
    // Prevent too frequent triggers
    maxTriggersPerContact: {
      count: Number,
      periodHours: Number
    }
  },
  
  // Statistics
  stats: {
    totalTriggers: {
      type: Number,
      default: 0
    },
    successfulExecutions: {
      type: Number,
      default: 0
    },
    failedExecutions: {
      type: Number,
      default: 0
    },
    lastTriggered: Date
  },
  
  // Priority for execution (higher = executes first)
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Stop other automations after this one triggers
  stopOnTrigger: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
automationRuleSchema.index({ userId: 1, isActive: 1 });
automationRuleSchema.index({ 'trigger.type': 1, isActive: 1 });
automationRuleSchema.index({ priority: -1 });

// Sort actions by order before saving
automationRuleSchema.pre('save', function(next) {
  if (this.actions && this.actions.length > 0) {
    this.actions.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  next();
});

// Instance method to check if automation should trigger
automationRuleSchema.methods.shouldTrigger = function(context) {
  if (!this.isActive) return false;
  
  // Check conditions
  if (this.conditions) {
    // Check required tags
    if (this.conditions.requiredTags && this.conditions.requiredTags.length > 0) {
      const hasTags = this.conditions.requiredTags.every(tag => 
        context.contactTags && context.contactTags.includes(tag)
      );
      if (!hasTags) return false;
    }
    
    // Check excluded tags
    if (this.conditions.excludedTags && this.conditions.excludedTags.length > 0) {
      const hasExcludedTag = this.conditions.excludedTags.some(tag =>
        context.contactTags && context.contactTags.includes(tag)
      );
      if (hasExcludedTag) return false;
    }
    
    // Check max triggers per contact
    if (this.conditions.maxTriggersPerContact) {
      const { count, periodHours } = this.conditions.maxTriggersPerContact;
      if (context.triggerCount >= count && context.lastTriggerWithinPeriod) {
        return false;
      }
    }
  }
  
  return true;
};

// Static method to find applicable automations
automationRuleSchema.statics.findApplicable = async function(userId, triggerType, context = {}) {
  const rules = await this.find({
    userId,
    isActive: true,
    'trigger.type': triggerType
  }).sort({ priority: -1 });
  
  return rules.filter(rule => rule.shouldTrigger(context));
};

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
