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
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'draft'
  },
  whatsappTemplateId: {
    type: String,
    default: null
  },
  whatsappStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', null],
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
        enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER']
      },
      text: String,
      url: String,
      phoneNumber: String
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
    campaigns: {
      type: Number,
      default: 0
    },
    messagesSent: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: null
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Multi-Business Support
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Index for faster queries
templateSchema.index({ status: 1, createdAt: -1 });
templateSchema.index({ userId: 1, createdAt: -1 });
templateSchema.index({ whatsappTemplateId: 1 });
templateSchema.index({ businessId: 1, status: 1, createdAt: -1 });

// Extract variables from template text
templateSchema.methods.extractVariables = function() {
  const variables = [];
  const regex = /\{\{(\d+)\}\}/g;
  
  this.components.forEach(component => {
    if (component.text) {
      let match;
      while ((match = regex.exec(component.text)) !== null) {
        const varNum = match[1];
        if (!variables.find(v => v.name === varNum)) {
          variables.push({
            name: varNum,
            description: `Variable ${varNum}`,
            example: `Example ${varNum}`
          });
        }
      }
    }
  });
  
  return variables;
};

// Get body text for preview
templateSchema.methods.getBodyText = function() {
  const bodyComponent = this.components.find(c => c.type === 'BODY');
  return bodyComponent ? bodyComponent.text : '';
};

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
