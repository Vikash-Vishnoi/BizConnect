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
const { auth, requireBusiness, requireBusinessPermission } = require('../../../core/middlewares/auth');
const { requireManager, requireBusinessOwnership } = require('../../../core/middlewares/rbac');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
 
/**
 * @route   GET /api/business/verification
 * @desc    Get business verification status
 * @access  Private - Manager+ only
 */
router.get('/', auth, requireBusiness, requireManager, requireBusinessOwnership, requireBusinessPermission('manage_settings'), async (req, res) => {
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
          qualityRating: phoneInfo.data.quality_rating || 'UNKNOWN',
          codeVerificationStatus: phoneInfo.data.code_verification_status || null,
          platformType: phoneInfo.data.platform_type || null
        };
      }
    } catch (whatsappError) {
      console.error('WhatsApp verification check error:', whatsappError);
      // Continue with local data if WhatsApp API fails
    }

    // Build verification response
    const verificationStatus = {
      // Local database status
      local: {
        status: business.verification?.businessVerificationStatus || 'UNVERIFIED',
        verifiedAt: business.verification?.certificationDate || null,
        displayName: business.verification?.displayName || null,
        verifiedName: business.verification?.verifiedName || null,
        displayNameCertification: business.verification?.displayNameCertification || 'NONE',
        lastUpdated: business.updatedAt
      },
      // WhatsApp API status
      whatsapp: whatsappVerification,
      // Combined status
      isVerified: business.verification?.businessVerificationStatus === 'VERIFIED' || whatsappVerification?.verified,
      isPending: business.verification?.businessVerificationStatus === 'PENDING',
      canSubmitRequest: business.verification?.businessVerificationStatus !== 'PENDING' && 
                       business.verification?.businessVerificationStatus !== 'VERIFIED'
    };

    // Get verification requirements status
    const requirements = await checkVerificationRequirements(business);

    res.json({
      verification: verificationStatus,
      requirements,
      businessId: business._id,
      businessName: business.name
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch verification status',
      details: error.message 
    });
  }
});

/**
 * @route   POST /api/business/verification/request
 * @desc    Request business verification
 * @access  Private - Manager+ only
 */
router.post('/request', auth, requireBusiness, requireManager, requireBusinessOwnership, requireBusinessPermission('manage_settings'), async (req, res) => {
  try {
    const business = req.business;
    const { displayName, documents } = req.body;

    // Validation
    if (!displayName) {
      return res.status(400).json({ 
        error: 'Display name is required for verification request' 
      });
    }

    // Check if already verified or pending
    if (business.verification?.businessVerificationStatus === 'VERIFIED') {
      return res.status(400).json({ 
        error: 'Business is already verified' 
      });
    }

    if (business.verification?.businessVerificationStatus === 'PENDING') {
      return res.status(400).json({ 
        error: 'Verification request is already pending' 
      });
    }

    // Check requirements
    const requirements = await checkVerificationRequirements(business);
    const unmetRequirements = requirements.items.filter(r => !r.met);
    
    if (unmetRequirements.length > 0) {
      return res.status(400).json({ 
        error: 'Not all verification requirements are met',
        unmetRequirements: unmetRequirements.map(r => ({
          name: r.name,
          description: r.description,
          action: r.action
        }))
      });
    }

    // Update business with verification request
    if (!business.verification) {
      business.verification = {};
    }
    business.verification.businessVerificationStatus = 'PENDING';
    business.verification.displayName = displayName.trim();
    business.verification.displayNameCertification = 'PENDING';

    await business.save();

    // In a real implementation, you would:
    // 1. Upload documents to secure storage
    // 2. Submit verification request to WhatsApp Business API
    // 3. Create notification for admins
    // 4. Log the verification request

    res.json({
      message: 'Verification request submitted successfully',
      verification: {
        status: 'PENDING',
        displayName: business.verification.displayName,
        requestedAt: business.updatedAt,
        businessId: business._id
      },
      nextSteps: [
        'WhatsApp will review your verification request',
        'Review typically takes 1-3 business days',
        'You will be notified via email when the review is complete',
        'Continue using the API while verification is pending'
      ]
    });
  } catch (error) {
    console.error('Request verification error:', error);
    res.status(500).json({ 
      error: 'Failed to submit verification request',
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/business/verification/requirements
 * @desc    Get verification requirements checklist
 * @access  Private - Manager+ only
 */
router.get('/requirements', auth, requireBusiness, requireManager, requireBusinessOwnership, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const business = req.business;

    const requirements = await checkVerificationRequirements(business);

    res.json({
      requirements,
      businessId: business._id,
      currentStatus: business.verification?.businessVerificationStatus || 'UNVERIFIED',
      canSubmitRequest: requirements.allMet && 
                       business.verification?.businessVerificationStatus !== 'PENDING' &&
                       business.verification?.businessVerificationStatus !== 'VERIFIED'
    });
  } catch (error) {
    console.error('Get verification requirements error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch verification requirements',
      details: error.message 
    });
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
    id: 'profile_complete',
    name: 'Complete Business Profile',
    description: 'Business name, about, email, industry, and phone number must be set',
    met: profileComplete,
    required: true,
    action: profileComplete ? null : 'Go to Business Settings to complete your profile'
  });

  // 2. WhatsApp connection active
  const connectionActive = business.health?.apiStatus === 'healthy' &&
                          business.health?.apiStatus !== 'down';

  requirements.items.push({
    id: 'connection_active',
    name: 'Active WhatsApp Connection',
    description: 'WhatsApp Business API must be connected and functional',
    met: connectionActive,
    required: true,
    action: connectionActive ? null : 'Check your WhatsApp API connection in Settings'
  });

  // 3. Quality rating acceptable
  const qualityAcceptable = business.phoneNumberQuality?.qualityScore !== 'RED';

  requirements.items.push({
    id: 'quality_acceptable',
    name: 'Acceptable Quality Rating',
    description: 'Quality rating must not be RED',
    met: qualityAcceptable,
    required: true,
    action: qualityAcceptable ? null : 'Improve your messaging quality - check Phone Health alerts'
  });

  // 4. Message history (configurable minimum)
  const minMessagesRequired = parseInt(process.env.VERIFICATION_MIN_MESSAGES || '10');
  const hasMessageHistory = business.usage?.totalMessagesSent >= minMessagesRequired;

  requirements.items.push({
    id: 'message_history',
    name: 'Message History',
    description: `At least ${minMessagesRequired} messages sent to demonstrate legitimate usage`,
    met: hasMessageHistory,
    required: true,
    action: hasMessageHistory ? null : `Send ${minMessagesRequired - (business.usage?.totalMessagesSent || 0)} more messages`
  });

  // 5. No recent violations (configurable lookback period)
  const violationLookbackDays = parseInt(process.env.VERIFICATION_VIOLATION_LOOKBACK_DAYS || '7');
  const hasNoViolations = !business.health?.lastError ||
                         (business.health.lastError.timestamp && 
                          (Date.now() - new Date(business.health.lastError.timestamp).getTime()) > violationLookbackDays * 24 * 60 * 60 * 1000);

  requirements.items.push({
    id: 'no_violations',
    name: 'No Recent Violations',
    description: `No API errors or policy violations in the last ${violationLookbackDays} days`,
    met: hasNoViolations,
    required: true,
    action: hasNoViolations ? null : 'Resolve any outstanding API errors or policy issues'
  });

  // 6. Opt-out handling configured (recommended)
  const optOutConfigured = business.whatsappConfig?.autoHandleOptOut === true &&
                          business.whatsappConfig?.optOutKeywords?.length > 0;

  requirements.items.push({
    id: 'opt_out_handling',
    name: 'Opt-Out Handling Configured',
    description: 'Automatic opt-out keyword detection should be enabled',
    met: optOutConfigured,
    required: false,
    action: optOutConfigured ? null : 'Enable automatic opt-out handling in Compliance Settings'
  });

  // 7. Business hours set (recommended)
  const businessHoursSet = business.profile?.businessHours?.schedule?.monday?.open;

  requirements.items.push({
    id: 'business_hours',
    name: 'Business Hours Configured',
    description: 'Set your business hours for customer expectations',
    met: businessHoursSet,
    required: false,
    action: businessHoursSet ? null : 'Configure business hours in Business Profile'
  });

  // 8. Welcome message configured (recommended)
  const welcomeConfigured = business.settings?.welcomeMessage?.enabled === true;

  requirements.items.push({
    id: 'welcome_message',
    name: 'Welcome Message Setup',
    description: 'Automated welcome message for new contacts',
    met: welcomeConfigured,
    required: false,
    action: welcomeConfigured ? null : 'Set up a welcome message in Settings'
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
