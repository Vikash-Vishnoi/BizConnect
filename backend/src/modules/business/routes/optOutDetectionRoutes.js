/**
 * Opt-Out Detection Routes
 * Handles automatic detection and processing of opt-out keywords
 * @module routes/optIn/optOutDetectionRoutes
 */

const express = require('express');
const router = express.Router();
const Business = require('../../../core/database/models/Business');
const Contact = require('../../../core/database/models/Contact');
// const OptInConsent = require('../../../core/database/models/OptInConsent'); // TODO: Create OptInConsent model
const { businessContext } = require('../../../core/middlewares/businessContext');
const { NotFoundError, ValidationError } = require('../../../core/middlewares/errorHandler');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');
const { validateBusiness } = require('../../../common/utils/validators');

// ==================== CONSTANTS ====================

// Default opt-out keywords (case-insensitive)
const DEFAULT_OPT_OUT_KEYWORDS = [
  'STOP',
  'UNSUBSCRIBE',
  'REMOVE',
  'OPT OUT',
  'OPTOUT',
  'CANCEL',
  'END',
  'QUIT'
];

// Validation Limits
const VALIDATION_LIMITS = {
  MAX_KEYWORDS: 20,
  MAX_KEYWORD_LENGTH: 50,
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50
};

// Opt-Out Sources
const OPT_OUT_SOURCE = {
  WHATSAPP_KEYWORD: 'whatsapp_keyword',
  USER_REQUEST: 'user_request',
  MANUAL_RESUBSCRIBE: 'manual_resubscribe'
};

// Consent Actions
const CONSENT_ACTION = {
  OPTED_OUT: 'opted_out',
  OPTED_IN: 'opted_in'
};

// Contact Tags
const CONTACT_TAGS = {
  OPTED_OUT: 'opted-out'
};

// Consent Channels
const CONSENT_CHANNELS = {
  ALL: 'all',
  MARKETING: 'marketing'
};

// Error Messages
const ERROR_MESSAGES = {
  PHONE_MESSAGE_REQUIRED: 'Phone number and message are required',
  BUSINESS_NOT_FOUND: 'Business not found',
  DETECT_OPT_OUT_FAILED: 'Failed to detect opt-out',
  PHONE_NUMBER_REQUIRED: 'Phone number is required',
  CONSENT_NOT_FOUND: 'Consent record not found',
  NOT_OPTED_OUT: 'Contact is not opted out',
  KEYWORDS_REQUIRED: 'Keywords must be a non-empty array',
  MAX_KEYWORDS_EXCEEDED: `Maximum ${VALIDATION_LIMITS.MAX_KEYWORDS} keywords allowed`,
  INVALID_KEYWORDS: 'Invalid keywords detected. Each keyword must be a non-empty string (max 50 characters)',
  UPDATE_PATTERNS_FAILED: 'Failed to update opt-out patterns'
};

// Success Messages
const SUCCESS_MESSAGES = {
  NO_OPT_OUT_DETECTED: 'No opt-out keyword detected',
  OPT_OUT_DETECTED_AND_PROCESSED: 'Opt-out detected and processed',
  OPT_OUT_DETECTED: 'Opt-out detected',
  OPT_OUT_PROCESSED: 'Opt-out detected and processed. Contact has been unsubscribed.',
  OPT_OUT_MANUAL_ACTION: 'Opt-out detected but auto-handling is disabled. Manual action required.',
  PATTERNS_UPDATED: 'Opt-out patterns updated successfully',
  CONTACT_RESUBSCRIBED: 'Contact resubscribed successfully'
};

// Log Messages
const LOG_MESSAGES = {
  OPT_OUT_DETECTED: 'Opt-out detected',
  ERROR_DETECTING_OPT_OUT: 'Error detecting opt-out',
  ERROR_IN_DETECT_OPT_OUT: 'Error in detectOptOut',
  ERROR_UPDATING_PATTERNS: 'Error updating opt-out patterns'
};


/**
 * POST /detect-optout - Detect if message contains opt-out keywords
 * This is typically called automatically by the webhook handler
 */
router.post('/detect-optout', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phoneNumber, message, businessId } = req.body;

    if (!phoneNumber || !message) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.PHONE_MESSAGE_REQUIRED,
        processingTime
      });
    }

    // Get business to check custom keywords
    const business = await Business.findById(businessId || req.businessId);
    
    if (!business) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.BUSINESS_NOT_FOUND,
        processingTime
      });
    }

    // Check if auto-handling is enabled
    const autoHandle = business.whatsappConfig?.autoHandleOptOut !== false;
    
    // Get opt-out keywords (custom or default)
    const keywords = business.whatsappConfig?.optOutKeywords || DEFAULT_OPT_OUT_KEYWORDS;

    // Normalize message (trim, uppercase)
    const normalizedMessage = message.trim().toUpperCase();

    // Check if message contains any opt-out keyword
    const detectedKeyword = keywords.find(keyword => {
      const normalizedKeyword = keyword.toUpperCase();
      // Check for exact match or keyword as standalone word
      return normalizedMessage === normalizedKeyword || 
             normalizedMessage.split(/\s+/).includes(normalizedKeyword);
    });

    if (!detectedKeyword) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          isOptOut: false,
          message: SUCCESS_MESSAGES.NO_OPT_OUT_DETECTED
        },
        message: SUCCESS_MESSAGES.NO_OPT_OUT_DETECTED,
        processingTime
      });
    }

    // Opt-out keyword detected!
    logger.info(LOG_MESSAGES.OPT_OUT_DETECTED, { 
      keyword: detectedKeyword, 
      phoneNumber, 
      businessId: business._id.toString()
    });

    let autoRevokedOptIn = false;

    // Auto-handle opt-out if enabled
    if (autoHandle) {
      // Find or create contact record and set opt-out status
      let contact = await Contact.findOne({
        businessId: business._id,
        phoneNumber
      });

      if (!contact) {
        // Create a new contact in opted-out state
        contact = await Contact.create({
          businessId: business._id,
          phoneNumber,
          name: phoneNumber, // Default name
          isOptedIn: false,
          optedOutAt: new Date(),
          optedOutReason: OPT_OUT_SOURCE.USER_REQUEST,
          tags: [CONTACT_TAGS.OPTED_OUT],
          metadata: {
            optOutSource: OPT_OUT_SOURCE.WHATSAPP_KEYWORD,
            optOutDetected: true,
            optOutKeyword: detectedKeyword,
            optOutDetectedAt: new Date(),
            autoRevoked: true
          }
        });

        autoRevokedOptIn = true;
      } else if (contact.isOptedIn) {
        // Revoke opt-in consent
        contact.isOptedIn = false;
        contact.optedOutAt = new Date();
        contact.optedOutReason = OPT_OUT_SOURCE.USER_REQUEST;
        
        // Update metadata
        contact.metadata = contact.metadata || {};
        contact.metadata.optOutSource = OPT_OUT_SOURCE.WHATSAPP_KEYWORD;
        contact.metadata.optOutDetected = true;
        contact.metadata.optOutKeyword = detectedKeyword;
        contact.metadata.optOutDetectedAt = new Date();
        contact.metadata.autoRevoked = true;

        // Add opted-out tag
        contact.tags = contact.tags || [];
        if (!contact.tags.includes(CONTACT_TAGS.OPTED_OUT)) {
          contact.tags.push(CONTACT_TAGS.OPTED_OUT);
        }

        await contact.save();
        autoRevokedOptIn = true;
      }
    }

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        isOptOut: true,
        keyword: detectedKeyword,
        autoRevokedOptIn,
        autoHandled: autoHandle,
        message: autoHandle 
          ? SUCCESS_MESSAGES.OPT_OUT_PROCESSED
          : SUCCESS_MESSAGES.OPT_OUT_MANUAL_ACTION
      },
      message: autoHandle ? SUCCESS_MESSAGES.OPT_OUT_DETECTED_AND_PROCESSED : SUCCESS_MESSAGES.OPT_OUT_DETECTED,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(LOG_MESSAGES.ERROR_DETECTING_OPT_OUT, { 
      phoneNumber: req.body.phoneNumber, 
      businessId: req.body.businessId?.toString(), 
      error: error.message,
      stack: error.stack,
      processingTime
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new Error(ERROR_MESSAGES.DETECT_OPT_OUT_FAILED);
  }
});

/**
 * GET /opt-out-patterns - Get list of opt-out keywords
 * Returns the configured opt-out patterns for the business
 */
router.get('/opt-out-patterns', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = await validateBusiness(req.businessId);

    const keywords = business.whatsappConfig?.optOutKeywords || DEFAULT_OPT_OUT_KEYWORDS;
    const autoHandle = business.whatsappConfig?.autoHandleOptOut !== false;

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        keywords,
        autoHandle,
        defaultKeywords: DEFAULT_OPT_OUT_KEYWORDS,
        customized: Boolean(business.whatsappConfig?.optOutKeywords?.length)
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get opt-out patterns error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      stack: error.stack,
      processingTime
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new Error('Failed to fetch opt-out patterns');
  }
});

/**
 * PUT /opt-out-patterns - Update opt-out keywords
 * Allows customizing the opt-out keyword patterns
 */
router.put('/opt-out-patterns', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { keywords, autoHandle } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.KEYWORDS_REQUIRED,
        processingTime
      });
    }

    // Validate keywords (max 20, each max 50 chars)
    if (keywords.length > VALIDATION_LIMITS.MAX_KEYWORDS) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.MAX_KEYWORDS_EXCEEDED,
        processingTime
      });
    }

    const invalidKeywords = keywords.filter(k => !k || typeof k !== 'string' || k.length > VALIDATION_LIMITS.MAX_KEYWORD_LENGTH);
    if (invalidKeywords.length > 0) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_KEYWORDS,
        processingTime
      });
    }

    const business = await Business.findById(req.businessId);

    if (!business) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.BUSINESS_NOT_FOUND,
        processingTime
      });
    }

    // Update configuration
    if (!business.whatsappConfig) {
      business.whatsappConfig = {};
    }

    business.whatsappConfig.optOutKeywords = keywords.map(k => k.trim().toUpperCase());
    
    if (typeof autoHandle === 'boolean') {
      business.whatsappConfig.autoHandleOptOut = autoHandle;
    }

    await business.save();

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        message: SUCCESS_MESSAGES.PATTERNS_UPDATED,
        keywords: business.whatsappConfig.optOutKeywords,
        autoHandle: business.whatsappConfig.autoHandleOptOut
      },
      message: SUCCESS_MESSAGES.PATTERNS_UPDATED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(LOG_MESSAGES.ERROR_UPDATING_PATTERNS, {
      businessId: req.businessId?.toString(),
      error: error.message,
      stack: error.stack,
      processingTime
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new Error(ERROR_MESSAGES.UPDATE_PATTERNS_FAILED);
  }
});

/**
 * GET /opted-out - Get list of opted-out contacts
 * Returns contacts who have opted out (with pagination)
 */
router.get('/opted-out', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      page = VALIDATION_LIMITS.DEFAULT_PAGE, 
      limit = VALIDATION_LIMITS.DEFAULT_LIMIT, 
      keyword 
    } = req.query;

    const query = {
      businessId: req.businessId,
      optedOut: true
    };

    // Filter by specific keyword if provided
    if (keyword) {
      query.optOutKeyword = keyword.toUpperCase();
    }

    const [consents, total] = await Promise.all([
      OptInConsent.find(query)
        .sort({ optedOutAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      OptInConsent.countDocuments(query)
    ]);

    // Get keyword statistics
    const keywordStats = await OptInConsent.aggregate([
      { $match: { businessId: req.businessId, optedOut: true, optOutKeyword: { $exists: true } } },
      { $group: { _id: '$optOutKeyword', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        count: consents.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        consents,
        keywordStats: keywordStats.map(stat => ({
          keyword: stat._id,
          count: stat.count
        }))
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get opted-out contacts error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      stack: error.stack,
      processingTime
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new Error('Failed to fetch opted-out contacts');
  }
});

/**
 * POST /resubscribe - Manually resubscribe an opted-out contact
 * Allows admin to manually resubscribe a contact
 */
router.post('/resubscribe', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phoneNumber, channels = [CONSENT_CHANNELS.MARKETING] } = req.body;

    if (!phoneNumber) {
      throw new ValidationError(ERROR_MESSAGES.PHONE_NUMBER_REQUIRED);
    }

    const consent = await OptInConsent.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (!consent) {
      throw new NotFoundError(ERROR_MESSAGES.CONSENT_NOT_FOUND);
    }

    if (!consent.optedOut) {
      throw new ValidationError(ERROR_MESSAGES.NOT_OPTED_OUT);
    }

    // Resubscribe using the built-in method
    await consent.optBackIn(channels, OPT_OUT_SOURCE.MANUAL_RESUBSCRIBE);

    // Update contact if exists
    const contact = await Contact.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (contact) {
      contact.optedOut = false;
      contact.optedOutAt = null;
      contact.optedOutReason = null;
      contact.tags = contact.tags.filter(tag => tag !== CONTACT_TAGS.OPTED_OUT);
      await contact.save();
    }

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        consent: consent.getSummary()
      },
      message: SUCCESS_MESSAGES.CONTACT_RESUBSCRIBED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Resubscribe contact error', {
      businessId: req.businessId?.toString(),
      phoneNumber: req.body.phoneNumber,
      error: error.message,
      stack: error.stack,
      processingTime
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new Error('Failed to resubscribe contact');
  }
});

/**
 * Helper function to detect opt-out (can be called directly without HTTP)
 * @param {String} phoneNumber - Phone number
 * @param {String} message - Message text
 * @param {Object} business - Business object
 * @returns {Promise<Object>} Detection result
 */
async function detectOptOut(phoneNumber, message, business) {
  try {
    // Check if auto-handling is enabled
    const autoHandle = business.whatsappConfig?.autoHandleOptOut !== false;
    
    // Get opt-out keywords (custom or default)
    const keywords = business.whatsappConfig?.optOutKeywords || DEFAULT_OPT_OUT_KEYWORDS;

    // Normalize message (trim, uppercase)
    const normalizedMessage = message.trim().toUpperCase();

    // Check if message contains any opt-out keyword
    const detectedKeyword = keywords.find(keyword => {
      const normalizedKeyword = keyword.toUpperCase();
      // Check for exact match or keyword as standalone word
      return normalizedMessage === normalizedKeyword || 
             normalizedMessage.split(/\s+/).includes(normalizedKeyword);
    });

    if (!detectedKeyword) {
      return {
        isOptOut: false,
        autoRevokedOptIn: false
      };
    }

    logger.info(LOG_MESSAGES.OPT_OUT_DETECTED, { 
      keyword: detectedKeyword, 
      phoneNumber, 
      businessId: business._id.toString()
    });

    let autoRevokedOptIn = false;

    // Auto-handle opt-out if enabled
    if (autoHandle) {
      // Find or create opt-in consent record
      let consent = await OptInConsent.findOne({
        businessId: business._id,
        phoneNumber
      });

      if (!consent) {
        // Create a new consent record in opted-out state
        consent = await OptInConsent.create({
          userId: business.userId,
          businessId: business._id,
          phoneNumber,
          optedOut: true,
          optedOutAt: new Date(),
          optedOutReason: OPT_OUT_SOURCE.USER_REQUEST,
          optOutSource: OPT_OUT_SOURCE.WHATSAPP_KEYWORD,
          optOutDetected: true,
          optOutKeyword: detectedKeyword,
          optOutDetectedAt: new Date(),
          autoRevoked: true,
          consentHistory: [{
            action: CONSENT_ACTION.OPTED_OUT,
            channel: CONSENT_CHANNELS.ALL,
            timestamp: new Date(),
            source: OPT_OUT_SOURCE.WHATSAPP_KEYWORD,
            notes: `Auto-detected opt-out keyword: "${detectedKeyword}"`
          }]
        });

        autoRevokedOptIn = true;
      } else if (!consent.optedOut) {
        // Revoke consent for all channels
        consent.optedOut = true;
        consent.optedOutAt = new Date();
        consent.optedOutReason = OPT_OUT_SOURCE.USER_REQUEST;
        consent.optOutSource = OPT_OUT_SOURCE.WHATSAPP_KEYWORD;
        consent.optOutDetected = true;
        consent.optOutKeyword = detectedKeyword;
        consent.optOutDetectedAt = new Date();
        consent.autoRevoked = true;

        // Disable all channels
        Object.keys(consent.channels).forEach(channel => {
          consent.channels[channel].consented = false;
        });

        // Add to history
        consent.consentHistory.push({
          action: CONSENT_ACTION.OPTED_OUT,
          channel: CONSENT_CHANNELS.ALL,
          timestamp: new Date(),
          source: OPT_OUT_SOURCE.WHATSAPP_KEYWORD,
          notes: `Auto-detected opt-out keyword: "${detectedKeyword}"`
        });

        await consent.save();
        autoRevokedOptIn = true;
      }

      // Update contact flags if contact exists
      const contact = await Contact.findOne({
        businessId: business._id,
        phoneNumber
      });

      if (contact) {
        contact.optedOut = true;
        contact.optedOutAt = new Date();
        contact.optedOutReason = OPT_OUT_SOURCE.USER_REQUEST;
        contact.tags = contact.tags || [];
        if (!contact.tags.includes(CONTACT_TAGS.OPTED_OUT)) {
          contact.tags.push(CONTACT_TAGS.OPTED_OUT);
        }
        await contact.save();
      }
    }

    return {
      isOptOut: true,
      keyword: detectedKeyword,
      autoRevokedOptIn,
      autoHandled: autoHandle
    };
  } catch (error) {
    logger.error(LOG_MESSAGES.ERROR_IN_DETECT_OPT_OUT, { 
      phoneNumber,
      businessId: business._id?.toString(),
      error: error.message,
      stack: error.stack
    });
    return {
      isOptOut: false,
      error: error.message
    };
  }
}

// Export router and helper function
module.exports = router;
module.exports.detectOptOut = detectOptOut;
