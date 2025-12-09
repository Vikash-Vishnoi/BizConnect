/**
 * Opt-Out Detection Routes
 * Handles automatic detection and processing of opt-out keywords
 * @module routes/optIn/optOutDetectionRoutes
 */

const express = require('express');
const router = express.Router();
const Business = require('../../../database/models/Business');
const Contact = require('../../../database/models/Contact');
 
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

/**
 * POST /detect-optout - Detect if message contains opt-out keywords
 * This is typically called automatically by the webhook handler
 */
router.post('/detect-optout', async (req, res) => {
  try {
    const { phoneNumber, message, businessId } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    // Get business to check custom keywords
    const business = await Business.findById(businessId || req.businessId);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
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
      return res.json({
        success: true,
        isOptOut: false,
        message: 'No opt-out keyword detected'
      });
    }

    // Opt-out keyword detected!
    console.log(`🚫 Opt-out detected: "${detectedKeyword}" from ${phoneNumber}`);

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
          optedOutReason: 'user_request',
          tags: ['opted-out'],
          metadata: {
            optOutSource: 'whatsapp_keyword',
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
        contact.optedOutReason = 'user_request';
        
        // Update metadata
        contact.metadata = contact.metadata || {};
        contact.metadata.optOutSource = 'whatsapp_keyword';
        contact.metadata.optOutDetected = true;
        contact.metadata.optOutKeyword = detectedKeyword;
        contact.metadata.optOutDetectedAt = new Date();
        contact.metadata.autoRevoked = true;

        // Add opted-out tag
        contact.tags = contact.tags || [];
        if (!contact.tags.includes('opted-out')) {
          contact.tags.push('opted-out');
        }

        await contact.save();
        autoRevokedOptIn = true;
      }
    }

    res.json({
      success: true,
      isOptOut: true,
      keyword: detectedKeyword,
      autoRevokedOptIn,
      autoHandled: autoHandle,
      message: autoHandle 
        ? `Opt-out detected and processed. Contact has been unsubscribed.`
        : `Opt-out detected but auto-handling is disabled. Manual action required.`
    });

  } catch (error) {
    console.error('Error detecting opt-out:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect opt-out',
      error: error.message
    });
  }
});

/**
 * GET /opt-out-patterns - Get list of opt-out keywords
 * Returns the configured opt-out patterns for the business
 */
router.get('/opt-out-patterns', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const keywords = business.whatsappConfig?.optOutKeywords || DEFAULT_OPT_OUT_KEYWORDS;
    const autoHandle = business.whatsappConfig?.autoHandleOptOut !== false;

    res.json({
      success: true,
      keywords,
      autoHandle,
      defaultKeywords: DEFAULT_OPT_OUT_KEYWORDS,
      customized: Boolean(business.whatsappConfig?.optOutKeywords?.length)
    });
  } catch (error) {
    console.error('Error getting opt-out patterns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get opt-out patterns',
      error: error.message
    });
  }
});

/**
 * PUT /opt-out-patterns - Update opt-out keywords
 * Allows customizing the opt-out keyword patterns
 */
router.put('/opt-out-patterns', async (req, res) => {
  try {
    const { keywords, autoHandle } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keywords must be a non-empty array'
      });
    }

    // Validate keywords (max 20, each max 50 chars)
    if (keywords.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 keywords allowed'
      });
    }

    const invalidKeywords = keywords.filter(k => !k || typeof k !== 'string' || k.length > 50);
    if (invalidKeywords.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid keywords detected. Each keyword must be a non-empty string (max 50 characters)'
      });
    }

    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
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

    res.json({
      success: true,
      message: 'Opt-out patterns updated successfully',
      keywords: business.whatsappConfig.optOutKeywords,
      autoHandle: business.whatsappConfig.autoHandleOptOut
    });
  } catch (error) {
    console.error('Error updating opt-out patterns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update opt-out patterns',
      error: error.message
    });
  }
});

/**
 * GET /opted-out - Get list of opted-out contacts
 * Returns contacts who have opted out (with pagination)
 */
router.get('/opted-out', async (req, res) => {
  try {
    const { page = 1, limit = 50, keyword } = req.query;

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

    res.json({
      success: true,
      count: consents.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      consents,
      keywordStats: keywordStats.map(stat => ({
        keyword: stat._id,
        count: stat.count
      }))
    });
  } catch (error) {
    console.error('Error getting opted-out contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get opted-out contacts',
      error: error.message
    });
  }
});

/**
 * POST /resubscribe - Manually resubscribe an opted-out contact
 * Allows admin to manually resubscribe a contact
 */
router.post('/resubscribe', async (req, res) => {
  try {
    const { phoneNumber, channels = ['marketing'] } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const consent = await OptInConsent.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Consent record not found'
      });
    }

    if (!consent.optedOut) {
      return res.status(400).json({
        success: false,
        message: 'Contact is not opted out'
      });
    }

    // Resubscribe using the built-in method
    await consent.optBackIn(channels, 'manual_resubscribe');

    // Update contact if exists
    const contact = await Contact.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (contact) {
      contact.optedOut = false;
      contact.optedOutAt = null;
      contact.optedOutReason = null;
      contact.tags = contact.tags.filter(tag => tag !== 'opted-out');
      await contact.save();
    }

    res.json({
      success: true,
      message: 'Contact resubscribed successfully',
      consent: consent.getSummary()
    });
  } catch (error) {
    console.error('Error resubscribing contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resubscribe contact',
      error: error.message
    });
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

    console.log(`🚫 Opt-out detected: "${detectedKeyword}" from ${phoneNumber}`);

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
          optedOutReason: 'user_request',
          optOutSource: 'whatsapp_keyword',
          optOutDetected: true,
          optOutKeyword: detectedKeyword,
          optOutDetectedAt: new Date(),
          autoRevoked: true,
          consentHistory: [{
            action: 'opted_out',
            channel: 'all',
            timestamp: new Date(),
            source: 'whatsapp_keyword',
            notes: `Auto-detected opt-out keyword: "${detectedKeyword}"`
          }]
        });

        autoRevokedOptIn = true;
      } else if (!consent.optedOut) {
        // Revoke consent for all channels
        consent.optedOut = true;
        consent.optedOutAt = new Date();
        consent.optedOutReason = 'user_request';
        consent.optOutSource = 'whatsapp_keyword';
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
          action: 'opted_out',
          channel: 'all',
          timestamp: new Date(),
          source: 'whatsapp_keyword',
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
        contact.optedOutReason = 'user_request';
        contact.tags = contact.tags || [];
        if (!contact.tags.includes('opted-out')) {
          contact.tags.push('opted-out');
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
    console.error('Error in detectOptOut:', error);
    return {
      isOptOut: false,
      error: error.message
    };
  }
}

// Export router and helper function
module.exports = router;
module.exports.detectOptOut = detectOptOut;
