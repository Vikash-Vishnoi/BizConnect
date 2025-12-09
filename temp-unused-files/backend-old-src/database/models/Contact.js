const mongoose = require('mongoose');
const { phoneNumberValidator } = require('../../utils/helpers/phoneValidator');

const contactSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true 
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    validate: phoneNumberValidator
  },
  name: {
    type: String,
    trim: true
  },
  optInStatus: {
    type: String,
    enum: ['OPTED_IN', 'OPTED_OUT', 'PENDING', 'UNKNOWN'],
    default: 'UNKNOWN',
    index: true
  },
  isBlocked: {
    type: Boolean,
    default: false,
    index: true
  },
  blockedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

contactSchema.index({ businessId: 1, phoneNumber: 1 }, { unique: true });
contactSchema.index({ businessId: 1, optInStatus: 1 });
contactSchema.index({ businessId: 1, isBlocked: 1 });

/**
 * Opt in contact
 */
contactSchema.methods.optIn = function() {
  this.optInStatus = 'OPTED_IN';
  return this;
};

/**
 * Opt out contact
 */
contactSchema.methods.optOut = function() {
  this.optInStatus = 'OPTED_OUT';
  return this;
};

/**
 * Check if contact can receive messages
 */
contactSchema.methods.canReceiveMessages = function() {
  // Check if blocked
  if (this.isBlocked) return false;
  
  // Check opt-in status
  if (this.optInStatus === 'OPTED_OUT') return false;
  
  return true;
};

contactSchema.statics.bulkImport = async function(businessId, contacts) {
  const operations = contacts.map(contact => ({
    updateOne: {
      filter: { 
        businessId,
        phoneNumber: contact.phoneNumber
      },
      update: {
        $set: {
          ...contact,
          businessId
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      upsert: true
    }
  }));

  const result = await this.bulkWrite(operations);
  return {
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    total: result.upsertedCount + result.modifiedCount
  };
};

contactSchema.statics.getFiltered = async function(businessId, filters = {}) {
  const query = { businessId };

  if (filters.search) {
    query.phoneNumber = { $regex: filters.search, $options: 'i' };
  }
  
  if (filters.optInStatus) {
    query.optInStatus = filters.optInStatus;
  }

  const contacts = await this.find(query)
    .sort({ [filters.sortBy || 'phoneNumber']: filters.sortOrder || 1 })
    .limit(filters.limit || 100)
    .skip(filters.skip || 0);

  const total = await this.countDocuments(query);

  return { contacts, total };
};

/**
 * Get opted-in contacts for business
 */
contactSchema.statics.getOptedInContacts = async function(businessId) {
  return this.find({
    businessId,
    optInStatus: 'OPTED_IN',
    isBlocked: false
  });
};

/**
 * Get opted-out contacts for business
 */
contactSchema.statics.getOptedOutContacts = async function(businessId) {
  return this.find({
    businessId,
    optInStatus: 'OPTED_OUT'
  });
};

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
