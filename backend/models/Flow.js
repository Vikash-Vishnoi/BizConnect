const mongoose = require('mongoose');

/**
 * Flow Model
 * Represents WhatsApp interactive flows (multi-step forms)
 * 
 * Flows are multi-screen interactive experiences that allow:
 * - Data collection through forms
 * - Multi-step workflows
 * - Dynamic field validation
 * - Custom UI components
 */

const flowScreenSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: String,
  layout: {
    type: String,
    enum: ['single', 'double'],
    default: 'single'
  },
  terminal: {
    type: Boolean,
    default: false // If true, this is the last screen
  },
  refresh_on_back: {
    type: Boolean,
    default: false
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed // Screen-specific data
  },
  // Form components (TextInput, TextArea, CheckboxGroup, RadioButtonsGroup, Dropdown, DatePicker, etc.)
  form_components: [{
    name: String,
    type: {
      type: String,
      enum: ['TextInput', 'TextArea', 'CheckboxGroup', 'RadioButtonsGroup', 'Dropdown', 'DatePicker', 'OptIn', 'Footer', 'EmbeddedLink', 'Image']
    },
    label: String,
    required: Boolean,
    enabled: {
      type: Boolean,
      default: true
    },
    visible: {
      type: Boolean,
      default: true
    },
    // Component-specific properties
    input_type: String, // For TextInput: text, number, email, phone, password
    min_chars: Number,
    max_chars: Number,
    helper_text: String,
    init_value: String,
    // For selections
    data_source: [{ // For CheckboxGroup, RadioButtonsGroup, Dropdown
      id: String,
      title: String,
      description: String,
      enabled: Boolean
    }],
    // For DatePicker
    min_date: String,
    max_date: String,
    unavailable_dates: [String],
    // For OptIn
    on_click_action: {
      name: String,
      payload: mongoose.Schema.Types.Mixed
    },
    // For Footer buttons
    on_click_action: {
      name: String,
      next: {
        type: String, // Next screen ID or action
        name: String
      },
      payload: mongoose.Schema.Types.Mixed
    }
  }]
});

const flowSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Flow identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  flowId: {
    type: String,
    unique: true,
    sparse: true // WhatsApp-assigned flow ID after publishing
  },

  // Flow metadata
  categories: [{
    type: String,
    enum: [
      'SIGN_UP', 'SIGN_IN', 'APPOINTMENT_BOOKING', 'LEAD_GENERATION',
      'CONTACT_US', 'CUSTOMER_SUPPORT', 'SURVEY', 'REGISTRATION',
      'FEEDBACK', 'ORDER_DETAILS', 'OTHER'
    ]
  }],

  description: {
    type: String,
    maxlength: 500
  },

  // Flow status
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'DEPRECATED', 'BLOCKED', 'THROTTLED'],
    default: 'DRAFT',
    index: true
  },

  // Flow validation status (from WhatsApp)
  validation_errors: [{
    error_type: String,
    message: String,
    line_start: Number,
    line_end: Number,
    column_start: Number,
    column_end: Number
  }],

  // Flow JSON structure (WhatsApp Flow JSON format)
  version: {
    type: String,
    default: '3.0' // Flow JSON schema version
  },

  data_api_version: {
    type: String,
    default: '3.0'
  },

  routing_model: {
    type: Map,
    of: [String] // Screen ID to next screen mappings
  },

  screens: [flowScreenSchema],

  // Flow settings
  settings: {
    // Endpoint for data exchange (optional)
    data_endpoint: String,
    
    // Flow expiry
    ttl: {
      type: Number,
      default: 600 // Time to live in seconds (default 10 min)
    },

    // Response handling
    success_action: {
      name: String,
      payload: mongoose.Schema.Types.Mixed
    },

    error_action: {
      name: String,
      payload: mongoose.Schema.Types.Mixed
    }
  },

  // Analytics
  analytics: {
    sent_count: {
      type: Number,
      default: 0
    },
    completed_count: {
      type: Number,
      default: 0
    },
    abandoned_count: {
      type: Number,
      default: 0
    },
    completion_rate: {
      type: Number,
      default: 0
    },
    avg_completion_time: {
      type: Number,
      default: 0 // In seconds
    },
    last_sent: Date
  },

  // WhatsApp Business Account
  businessAccountId: {
    type: String,
    index: true
  },

  // Preview settings
  preview: {
    enabled: {
      type: Boolean,
      default: false
    },
    expires_at: Date
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
flowSchema.index({ user: 1, status: 1 });
flowSchema.index({ user: 1, isActive: 1 });
flowSchema.index({ createdAt: -1 });
flowSchema.index({ 'analytics.sent_count': -1 });

// Instance methods

/**
 * Get flow as WhatsApp Flow JSON format
 */
flowSchema.methods.toFlowJSON = function() {
  return {
    version: this.version,
    data_api_version: this.data_api_version,
    routing_model: Object.fromEntries(this.routing_model || new Map()),
    screens: this.screens.map(screen => ({
      id: screen.id,
      title: screen.title,
      terminal: screen.terminal,
      data: screen.data ? Object.fromEntries(screen.data) : {},
      layout: {
        type: screen.layout,
        children: screen.form_components.map(comp => ({
          type: comp.type,
          name: comp.name,
          label: comp.label,
          required: comp.required,
          enabled: comp.enabled,
          visible: comp.visible,
          ...(comp.input_type && { 'input-type': comp.input_type }),
          ...(comp.min_chars && { 'min-chars': comp.min_chars }),
          ...(comp.max_chars && { 'max-chars': comp.max_chars }),
          ...(comp.helper_text && { 'helper-text': comp.helper_text }),
          ...(comp.init_value && { 'init-value': comp.init_value }),
          ...(comp.data_source && comp.data_source.length > 0 && { 'data-source': comp.data_source }),
          ...(comp.on_click_action && { 'on-click-action': comp.on_click_action })
        }))
      }
    }))
  };
};

/**
 * Validate flow structure
 */
flowSchema.methods.validateStructure = function() {
  const errors = [];

  // Check if flow has at least one screen
  if (!this.screens || this.screens.length === 0) {
    errors.push({ message: 'Flow must have at least one screen' });
  }

  // Check if flow has at least one terminal screen
  const hasTerminal = this.screens.some(screen => screen.terminal);
  if (!hasTerminal) {
    errors.push({ message: 'Flow must have at least one terminal screen' });
  }

  // Validate routing model references
  if (this.routing_model) {
    for (const [screenId, nextScreens] of this.routing_model) {
      const screenExists = this.screens.some(s => s.id === screenId);
      if (!screenExists) {
        errors.push({ message: `Routing references non-existent screen: ${screenId}` });
      }
    }
  }

  return errors;
};

/**
 * Update analytics after flow completion
 */
flowSchema.methods.updateAnalytics = async function(completed, completionTime) {
  if (completed) {
    this.analytics.completed_count += 1;
  } else {
    this.analytics.abandoned_count += 1;
  }

  this.analytics.sent_count += 1;
  
  // Update completion rate
  const totalResponses = this.analytics.completed_count + this.analytics.abandoned_count;
  this.analytics.completion_rate = totalResponses > 0 
    ? (this.analytics.completed_count / totalResponses) * 100 
    : 0;

  // Update average completion time
  if (completed && completionTime) {
    const totalTime = this.analytics.avg_completion_time * (this.analytics.completed_count - 1) + completionTime;
    this.analytics.avg_completion_time = totalTime / this.analytics.completed_count;
  }

  this.analytics.last_sent = new Date();

  await this.save();
};

// Static methods

/**
 * Get user's flows
 */
flowSchema.statics.getUserFlows = function(userId, filters = {}) {
  const query = { user: userId, isActive: true };
  
  if (filters.status) {
    query.status = filters.status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .select('-__v');
};

/**
 * Get flow statistics
 */
flowSchema.statics.getFlowStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSent: { $sum: '$analytics.sent_count' },
        totalCompleted: { $sum: '$analytics.completed_count' },
        avgCompletionRate: { $avg: '$analytics.completion_rate' }
      }
    }
  ]);

  return stats;
};

/**
 * Create default flow template
 */
flowSchema.statics.createDefaultFlow = function(userId, type = 'LEAD_GENERATION') {
  const templates = {
    LEAD_GENERATION: {
      name: 'Lead Generation Form',
      description: 'Collect customer information',
      screens: [
        {
          id: 'WELCOME',
          title: 'Welcome',
          layout: 'single',
          form_components: [
            {
              type: 'TextInput',
              name: 'full_name',
              label: 'Full Name',
              required: true,
              input_type: 'text',
              max_chars: 100
            },
            {
              type: 'TextInput',
              name: 'email',
              label: 'Email Address',
              required: true,
              input_type: 'email'
            },
            {
              type: 'TextInput',
              name: 'phone',
              label: 'Phone Number',
              required: false,
              input_type: 'phone'
            },
            {
              type: 'Footer',
              name: 'submit_btn',
              label: 'Submit',
              on_click_action: {
                name: 'complete',
                payload: {}
              }
            }
          ],
          terminal: true
        }
      ]
    },
    APPOINTMENT_BOOKING: {
      name: 'Appointment Booking',
      description: 'Book appointments',
      screens: [
        {
          id: 'SELECT_DATE',
          title: 'Select Date',
          layout: 'single',
          form_components: [
            {
              type: 'DatePicker',
              name: 'appointment_date',
              label: 'Choose Date',
              required: true
            },
            {
              type: 'Dropdown',
              name: 'time_slot',
              label: 'Time Slot',
              required: true,
              data_source: [
                { id: '09:00', title: '9:00 AM' },
                { id: '10:00', title: '10:00 AM' },
                { id: '11:00', title: '11:00 AM' },
                { id: '14:00', title: '2:00 PM' },
                { id: '15:00', title: '3:00 PM' },
                { id: '16:00', title: '4:00 PM' }
              ]
            },
            {
              type: 'Footer',
              name: 'next_btn',
              label: 'Next',
              on_click_action: {
                name: 'navigate',
                next: {
                  type: 'screen',
                  name: 'CONTACT_INFO'
                }
              }
            }
          ]
        },
        {
          id: 'CONTACT_INFO',
          title: 'Contact Information',
          layout: 'single',
          form_components: [
            {
              type: 'TextInput',
              name: 'name',
              label: 'Full Name',
              required: true,
              input_type: 'text'
            },
            {
              type: 'TextInput',
              name: 'phone',
              label: 'Phone Number',
              required: true,
              input_type: 'phone'
            },
            {
              type: 'TextArea',
              name: 'notes',
              label: 'Additional Notes',
              required: false,
              max_chars: 500
            },
            {
              type: 'Footer',
              name: 'book_btn',
              label: 'Book Appointment',
              on_click_action: {
                name: 'complete',
                payload: {}
              }
            }
          ],
          terminal: true
        }
      ]
    }
  };

  const template = templates[type] || templates.LEAD_GENERATION;
  
  return new this({
    user: userId,
    name: template.name,
    description: template.description,
    categories: [type],
    screens: template.screens,
    createdBy: userId
  });
};

const Flow = mongoose.model('Flow', flowSchema);

module.exports = Flow;
