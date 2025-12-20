/**
 * Business Verification Routes
 * @module routes/business/verification
 * 
 * Handles WhatsApp Business verification status and requirements
 * Critical for maintaining WhatsApp Business API compliance
 */

const express = require('express');
const router = express.Router();
const Business = require('../../../core/database/models/Business');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness, requirePermission, requireBusinessPermission, requireManager, requireOwnerOrAdmin } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const { ValidationError } = require('../../../core/middlewares/errorHandler');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');

// ==================== CONSTANTS ====================

// Verification Statuses
const VERIFICATION_STATUS = {
  VERIFIED: 'VERIFIED',
  PENDING: 'PENDING',
  UNVERIFIED: 'UNVERIFIED'
};

// Display Name Certification Levels
const CERTIFICATION_LEVEL = {
  VERIFIED: 'VERIFIED',
  PENDING: 'PENDING',
  NONE: 'NONE'
};

// Quality Ratings
const QUALITY_RATING = {
  UNKNOWN: 'UNKNOWN',
  RED: 'RED',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN'
};

// API Health Statuses
const API_STATUS = {
  HEALTHY: 'healthy',
  DOWN: 'down'
};

// Requirement IDs
const REQUIREMENT_ID = {
  PROFILE_COMPLETE: 'profile_complete',
  CONNECTION_ACTIVE: 'connection_active',
  QUALITY_ACCEPTABLE: 'quality_acceptable',
  MESSAGE_HISTORY: 'message_history',
  NO_VIOLATIONS: 'no_violations',
  OPT_OUT_HANDLING: 'opt_out_handling',
  BUSINESS_HOURS: 'business_hours',
  WELCOME_MESSAGE: 'welcome_message'
};

// Default Configuration Values
const VERIFICATION_DEFAULTS = {
  MIN_MESSAGES: parseInt(process.env.VERIFICATION_MIN_MESSAGES || '10'),
  VIOLATION_LOOKBACK_DAYS: parseInt(process.env.VERIFICATION_VIOLATION_LOOKBACK_DAYS || '7'),
  MAX_KEYWORDS: 20,
  MAX_KEYWORD_LENGTH: 50
};

// Time Constants
const TIME_CONSTANTS = {
  MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000
};

// Error Messages
const ERROR_MESSAGES = {
  DISPLAY_NAME_REQUIRED: 'Display name is required for verification request',
  ALREADY_VERIFIED: 'Business is already verified',
  ALREADY_PENDING: 'Verification request is already pending',
  REQUIREMENTS_NOT_MET: 'Not all verification requirements are met',
  FETCH_STATUS_FAILED: 'Failed to fetch verification status',
  SUBMIT_REQUEST_FAILED: 'Failed to submit verification request',
  FETCH_REQUIREMENTS_FAILED: 'Failed to fetch verification requirements'
};

// Success Messages
const SUCCESS_MESSAGES = {
  STATUS_RETRIEVED: 'Verification status retrieved successfully',
  REQUEST_SUBMITTED: 'Verification request submitted successfully',
  REQUIREMENTS_RETRIEVED: 'Verification requirements retrieved successfully'
};

// Verification Request Next Steps
const NEXT_STEPS = [
  'WhatsApp will review your verification request',
  'Review typically takes 1-3 business days',
  'You will be notified via email when the review is complete',
  'Continue using the API while verification is pending'
];

// Requirement Descriptions
const REQUIREMENT_DESCRIPTIONS = {
  PROFILE_COMPLETE: 'Business name, about, email, industry, and phone number must be set',
  CONNECTION_ACTIVE: 'WhatsApp Business API must be connected and functional',
  QUALITY_ACCEPTABLE: 'Quality rating must not be RED',
  NO_VIOLATIONS: 'No API errors or policy violations in the last',
  OPT_OUT_HANDLING: 'Automatic opt-out keyword detection should be enabled',
  BUSINESS_HOURS: 'Set your business hours for customer expectations',
  WELCOME_MESSAGE: 'Automated welcome message for new contacts'
};

// Requirement Actions
const REQUIREMENT_ACTIONS = {
  PROFILE_COMPLETE: 'Go to Business Settings to complete your profile',
  CONNECTION_ACTIVE: 'Check your WhatsApp API connection in Settings',
  QUALITY_ACCEPTABLE: 'Improve your messaging quality - check Phone Health alerts',
  NO_VIOLATIONS: 'Resolve any outstanding API errors or policy issues',
  OPT_OUT_HANDLING: 'Enable automatic opt-out handling in Compliance Settings',
  BUSINESS_HOURS: 'Configure business hours in Business Profile',
  WELCOME_MESSAGE: 'Set up a welcome message in Settings'
};

/**
 * @route   GET /api/business/verification
 * @desc    Get business verification status
 * @access  Private - Manager+ only
 */
router.get('/', auth, requireBusiness, requireManager, requireOwnerOrAdmin, requireBusinessPermission('manage_settings'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = req.business;

    // Get verification status from WhatsApp API
    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    let whatsappVerification = null;
    try {
      // Fetch phone number info from WhatsApp which includes verification status
      const phoneInfo = await whatsappService.getPhoneNumberInfo();
      if (phoneInfo.success && phoneInfo.data) {
        whatsappVerification = {
          verified: phoneInfo.data.verified_name || null,
          displayName: phoneInfo.data.display_phone_number || null,
          qualityRating: phoneInfo.data.quality_rating || QUALITY_RATING.UNKNOWN,
          codeVerificationStatus: phoneInfo.data.code_verification_status || null,
          platformType: phoneInfo.data.platform_type || null
        };
      }
    } catch (whatsappError) {
      logger.error('WhatsApp verification check error', { 
        businessId: business._id.toString(), 
        error: whatsappError.message 
      });
      // Continue with local data if WhatsApp API fails
    }

    // Build verification response
    const verificationStatus = {
      // Local database status
      local: {
        status: business.verification?.businessVerificationStatus || VERIFICATION_STATUS.UNVERIFIED,
        verifiedAt: business.verification?.certificationDate || null,
        displayName: business.verification?.displayName || null,
        verifiedName: business.verification?.verifiedName || null,
        displayNameCertification: business.verification?.displayNameCertification || CERTIFICATION_LEVEL.NONE,
        lastUpdated: business.updatedAt
      },
      // WhatsApp API status
      whatsapp: whatsappVerification,
      // Combined status
      isVerified: business.verification?.businessVerificationStatus === VERIFICATION_STATUS.VERIFIED || whatsappVerification?.verified,
      isPending: business.verification?.businessVerificationStatus === VERIFICATION_STATUS.PENDING,
      canSubmitRequest: business.verification?.businessVerificationStatus !== VERIFICATION_STATUS.PENDING && 
                       business.verification?.businessVerificationStatus !== VERIFICATION_STATUS.VERIFIED
    };

    // Get verification requirements status
    const requirements = await checkVerificationRequirements(business);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        verification: verificationStatus,
        requirements,
        businessId: business._id,
        businessName: business.name
      },
      message: SUCCESS_MESSAGES.STATUS_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get verification status error', { 
      businessId: req.business?._id?.toString(), 
      error: error.message,
      stack: error.stack,
      processingTime
    });
    
    if (error instanceof ValidationError) {
      throw error;
    }
    
    throw new Error(ERROR_MESSAGES.FETCH_STATUS_FAILED);
  }
});

/**
 * @route   POST /api/business/verification/request
 * @desc    Request business verification
 * @access  Private - Manager+ only
 */
router.post('/request', auth, requireBusiness, requireManager, requireOwnerOrAdmin, requireBusinessPermission('manage_settings'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = req.business;
    const { displayName, documents } = req.body;

    // Validation
    if (!displayName) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: ERROR_MESSAGES.DISPLAY_NAME_REQUIRED,
        processingTime
      });
    }

    // Check if already verified or pending
    if (business.verification?.businessVerificationStatus === VERIFICATION_STATUS.VERIFIED) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: ERROR_MESSAGES.ALREADY_VERIFIED,
        processingTime
      });
    }

    if (business.verification?.businessVerificationStatus === VERIFICATION_STATUS.PENDING) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: ERROR_MESSAGES.ALREADY_PENDING,
        processingTime
      });
    }

    // Check requirements
    const requirements = await checkVerificationRequirements(business);
    const unmetRequirements = requirements.items.filter(r => !r.met);
    
    if (unmetRequirements.length > 0) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: ERROR_MESSAGES.REQUIREMENTS_NOT_MET,
        unmetRequirements: unmetRequirements.map(r => ({
          name: r.name,
          description: r.description,
          action: r.action
        })),
        processingTime
      });
    }

    // Update business with verification request
    if (!business.verification) {
      business.verification = {};
    }
    business.verification.businessVerificationStatus = VERIFICATION_STATUS.PENDING;
    business.verification.displayName = displayName.trim();
    business.verification.displayNameCertification = CERTIFICATION_LEVEL.PENDING;

    await business.save();

    // In a real implementation, you would:
    // 1. Upload documents to secure storage
    // 2. Submit verification request to WhatsApp Business API
    // 3. Create notification for admins
    // 4. Log the verification request

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        message: SUCCESS_MESSAGES.REQUEST_SUBMITTED,
        verification: {
          status: VERIFICATION_STATUS.PENDING,
          displayName: business.verification.displayName,
          requestedAt: business.updatedAt,
          businessId: business._id
        },
        nextSteps: NEXT_STEPS
      },
      message: SUCCESS_MESSAGES.REQUEST_SUBMITTED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Request verification error', {
      businessId: req.business?._id?.toString(),
      error: error.message,
      stack: error.stack,
      processingTime
    });
    
    if (error instanceof ValidationError) {
      throw error;
    }
    
    throw new Error(ERROR_MESSAGES.SUBMIT_REQUEST_FAILED);
  }
});

/**
 * @route   GET /api/business/verification/requirements
 * @desc    Get verification requirements checklist
 * @access  Private - Manager+ only
 */
router.get('/requirements', auth, requireBusiness, requireManager, requireOwnerOrAdmin, requireBusinessPermission('view_analytics'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = req.business;

    const requirements = await checkVerificationRequirements(business);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        requirements,
        businessId: business._id,
        currentStatus: business.verification?.businessVerificationStatus || VERIFICATION_STATUS.UNVERIFIED,
        canSubmitRequest: requirements.allMet && 
                         business.verification?.businessVerificationStatus !== VERIFICATION_STATUS.PENDING &&
                         business.verification?.businessVerificationStatus !== VERIFICATION_STATUS.VERIFIED
      },
      message: SUCCESS_MESSAGES.REQUIREMENTS_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get verification requirements error', {
      businessId: req.business?._id?.toString(),
      error: error.message,
      stack: error.stack,
      processingTime
    });
    
    if (error instanceof ValidationError) {
      throw error;
    }
    
    throw new Error(ERROR_MESSAGES.FETCH_REQUIREMENTS_FAILED);
  }
});

/**
 * Helper: Check verification requirements
 */
async function checkVerificationRequirements(business) {
  const requirements = {
    allMet: true,
    percentComplete: 0,
    items: []
  };

  // 1. Business profile complete
  const profileComplete = !!(
    business.name &&
    business.profile?.about &&
    business.profile?.email &&
    business.profile?.vertical &&
    business.whatsappConfig?.phoneNumber
  );

  requirements.items.push({
    id: REQUIREMENT_ID.PROFILE_COMPLETE,
    name: 'Complete Business Profile',
    description: REQUIREMENT_DESCRIPTIONS.PROFILE_COMPLETE,
    met: profileComplete,
    required: true,
    action: profileComplete ? null : REQUIREMENT_ACTIONS.PROFILE_COMPLETE
  });

  // 2. WhatsApp connection active
  const connectionActive = business.health?.apiStatus === API_STATUS.HEALTHY &&
                          business.health?.apiStatus !== API_STATUS.DOWN;

  requirements.items.push({
    id: REQUIREMENT_ID.CONNECTION_ACTIVE,
    name: 'Active WhatsApp Connection',
    description: REQUIREMENT_DESCRIPTIONS.CONNECTION_ACTIVE,
    met: connectionActive,
    required: true,
    action: connectionActive ? null : REQUIREMENT_ACTIONS.CONNECTION_ACTIVE
  });

  // 3. Quality rating acceptable
  const qualityAcceptable = business.phoneNumberQuality?.qualityScore !== QUALITY_RATING.RED;

  requirements.items.push({
    id: REQUIREMENT_ID.QUALITY_ACCEPTABLE,
    name: 'Acceptable Quality Rating',
    description: REQUIREMENT_DESCRIPTIONS.QUALITY_ACCEPTABLE,
    met: qualityAcceptable,
    required: true,
    action: qualityAcceptable ? null : REQUIREMENT_ACTIONS.QUALITY_ACCEPTABLE
  });

  // 4. Message history (configurable minimum)
  const minMessagesRequired = VERIFICATION_DEFAULTS.MIN_MESSAGES;
  const hasMessageHistory = business.usage?.totalMessagesSent >= minMessagesRequired;

  requirements.items.push({
    id: REQUIREMENT_ID.MESSAGE_HISTORY,
    name: 'Message History',
    description: `At least ${minMessagesRequired} messages sent to demonstrate legitimate usage`,
    met: hasMessageHistory,
    required: true,
    action: hasMessageHistory ? null : `Send ${minMessagesRequired - (business.usage?.totalMessagesSent || 0)} more messages`
  });

  // 5. No recent violations (configurable lookback period)
  const violationLookbackDays = VERIFICATION_DEFAULTS.VIOLATION_LOOKBACK_DAYS;
  const hasNoViolations = !business.health?.lastError ||
                         (business.health.lastError.timestamp && 
                          (Date.now() - new Date(business.health.lastError.timestamp).getTime()) > violationLookbackDays * TIME_CONSTANTS.MILLISECONDS_PER_DAY);

  requirements.items.push({
    id: REQUIREMENT_ID.NO_VIOLATIONS,
    name: 'No Recent Violations',
    description: `${REQUIREMENT_DESCRIPTIONS.NO_VIOLATIONS} ${violationLookbackDays} days`,
    met: hasNoViolations,
    required: true,
    action: hasNoViolations ? null : REQUIREMENT_ACTIONS.NO_VIOLATIONS
  });

  // 6. Opt-out handling configured (recommended)
  const optOutConfigured = business.whatsappConfig?.autoHandleOptOut === true &&
                          business.whatsappConfig?.optOutKeywords?.length > 0;

  requirements.items.push({
    id: REQUIREMENT_ID.OPT_OUT_HANDLING,
    name: 'Opt-Out Handling Configured',
    description: REQUIREMENT_DESCRIPTIONS.OPT_OUT_HANDLING,
    met: optOutConfigured,
    required: false,
    action: optOutConfigured ? null : REQUIREMENT_ACTIONS.OPT_OUT_HANDLING
  });

  // 7. Business hours set (recommended)
  const businessHoursSet = business.profile?.businessHours?.schedule?.monday?.open;

  requirements.items.push({
    id: REQUIREMENT_ID.BUSINESS_HOURS,
    name: 'Business Hours Configured',
    description: REQUIREMENT_DESCRIPTIONS.BUSINESS_HOURS,
    met: businessHoursSet,
    required: false,
    action: businessHoursSet ? null : REQUIREMENT_ACTIONS.BUSINESS_HOURS
  });

  // 8. Welcome message configured (recommended)
  const welcomeConfigured = business.settings?.welcomeMessage?.enabled === true;

  requirements.items.push({
    id: REQUIREMENT_ID.WELCOME_MESSAGE,
    name: 'Welcome Message Setup',
    description: REQUIREMENT_DESCRIPTIONS.WELCOME_MESSAGE,
    met: welcomeConfigured,
    required: false,
    action: welcomeConfigured ? null : REQUIREMENT_ACTIONS.WELCOME_MESSAGE
  });

  // Calculate completion percentage
  const requiredItems = requirements.items.filter(r => r.required);
  const metRequired = requiredItems.filter(r => r.met).length;
  const metAll = requirements.items.filter(r => r.met).length;

  requirements.allMet = requiredItems.every(r => r.met);
  requirements.percentComplete = Math.round((metAll / requirements.items.length) * 100);
  requirements.requiredMet = metRequired;
  requirements.requiredTotal = requiredItems.length;
  requirements.recommendedMet = metAll - metRequired;
  requirements.recommendedTotal = requirements.items.length - requiredItems.length;

  return requirements;
}

module.exports = router;
