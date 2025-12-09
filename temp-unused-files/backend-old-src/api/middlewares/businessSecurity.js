/**
 * CRITICAL SECURITY MIDDLEWARE
 * Implements business logic enforcement and attack prevention
 * 
 * MUST BE APPLIED TO ALL ROUTES
 */

const { User, Campaign, Template } = require('../../database/models');

// Configuration from environment variables
const MAX_CAMPAIGN_RECIPIENTS = parseInt(process.env.MAX_CAMPAIGN_RECIPIENTS) || 10000;
const MESSAGING_LIMIT_WARNING_THRESHOLD = parseFloat(process.env.MESSAGING_LIMIT_WARNING_THRESHOLD) || 0.8;
 
/**
 * Enforce single super_admin in system
 * Apply to: registration, profile update routes
 */
const enforceSingleSuperAdmin = async (req, res, next) => {
  try {
    const { userType } = req.body;
    
    // Check if trying to become super_admin
    if (userType === 'super_admin') {
      // Allow if already super_admin (profile update)
      if (req.user && req.user.userType === 'super_admin') {
        return next();
      }
      
      // Check if super_admin already exists
      const existingSuperAdmin = await User.findOne({ userType: 'super_admin' });
      if (existingSuperAdmin) {
        return res.status(403).json({ 
          error: 'Super admin already exists. Only one super admin allowed in the system.',
          errorCode: 'SUPER_ADMIN_EXISTS'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Super admin enforcement error:', error);
    res.status(500).json({ error: 'Security check failed' });
  }
};

/**
 * Enforce single business_admin per business
 * Apply to: team member addition, role update routes
 */
const enforceSingleBusinessAdmin = async (req, res, next) => {
  try {
    const { userType } = req.body;
    const { id: businessId } = req.params;
    
    // Check if trying to become business_admin
    if (userType === 'business_admin') {
      // Check if business already has an admin
      const existingAdmin = await User.findOne({ 
        businessId,
        userType: 'business_admin'
      });
      
      // Allow if updating self (same user)
      const userId = req.params.userId || req.body.userId;
      if (existingAdmin && existingAdmin._id.toString() !== userId) {
        return res.status(400).json({ 
          error: 'Business already has an admin. Transfer admin role first (demote current admin).',
          errorCode: 'BUSINESS_ADMIN_EXISTS',
          currentAdmin: {
            id: existingAdmin._id,
            name: existingAdmin.name,
            email: existingAdmin.email
          }
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Business admin enforcement error:', error);
    res.status(500).json({ error: 'Security check failed' });
  }
};

/**
 * Validate template is approved before campaign operations
 * Apply to: campaign start, campaign send routes
 */
const validateTemplateApproval = async (req, res, next) => {
  try {
    let campaignId = req.params.id;
    
    // If creating new campaign, templateId in body
    let templateId = req.body.templateId;
    
    // If starting existing campaign, get from campaign
    if (campaignId && !templateId) {
      const campaign = await Campaign.findById(campaignId).select('templateId');
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      templateId = campaign.templateId;
    }
    
    if (!templateId) {
      return next(); // No template to validate
    }
    
    // Check template status
    const template = await Template.findById(templateId).select('status whatsappStatus name');
    
    if (!template) {
      return res.status(404).json({ 
        error: 'Template not found',
        errorCode: 'TEMPLATE_NOT_FOUND'
      });
    }
    
    // CRITICAL: Only allow approved templates
    if (template.status !== 'approved' || template.whatsappStatus !== 'APPROVED') {
      return res.status(400).json({ 
        error: 'Cannot use unapproved template. Template must be approved by Meta first.',
        errorCode: 'TEMPLATE_NOT_APPROVED',
        template: {
          name: template.name,
          status: template.status,
          whatsappStatus: template.whatsappStatus
        },
        hint: 'Wait for Meta approval or select a different approved template.'
      });
    }
    
    // Store template in request for further use
    req.approvedTemplate = template;
    next();
  } catch (error) {
    console.error('Template validation error:', error);
    res.status(500).json({ error: 'Template validation failed' });
  }
};

/**
 * Check WhatsApp messaging limits before campaign operations
 * Apply to: campaign start, bulk send routes
 */
const checkMessagingLimits = async (req, res, next) => {
  try {
    const Business = require('../../database/models/Business');
    const WhatsAppService = require('../../services/whatsapp/whatsappService');
    
    // Get business
    const business = await Business.findById(req.businessId)
      .select('+whatsappConfig.accessToken +whatsappConfig.phoneNumberId +whatsappConfig.wabaId');
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    // Initialize WhatsApp service for this business
    const whatsappService = new WhatsAppService({
      phoneNumberId: business.whatsappConfig.phoneNumberId,
      accessToken: business.whatsappConfig.accessToken,
      wabaId: business.whatsappConfig.wabaId,
      apiVersion: business.whatsappConfig.apiVersion
    });
    
    // Get current messaging limits
    const limitsResult = await whatsappService.getMessagingLimits();
    
    if (!limitsResult.success) {
      console.error('Failed to fetch messaging limits:', limitsResult.error);
      // Don't block on limit check failure, just warn
      console.warn('⚠️  Proceeding without limit check - could not fetch limits');
      return next();
    }
    
    const { daily_limit, quality_rating } = limitsResult.data;
    
    // Count today's messages
    const Analytics = require('../../database/models/Analytics');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAnalytics = await Analytics.findOne({
      businessId: req.businessId,
      date: today
    });
    
    const messagesSentToday = todayAnalytics?.messagesSent || 0;
    const remainingLimit = daily_limit - messagesSentToday;
    
    // Calculate campaign size
    let campaignSize = 0;
    if (req.params.id) {
      // Existing campaign
      const campaign = await Campaign.findById(req.params.id).select('recipients');
      campaignSize = campaign?.recipients?.filter(r => r.status === 'pending').length || 0;
    } else if (req.body.recipients) {
      // New campaign
      campaignSize = Array.isArray(req.body.recipients) ? req.body.recipients.length : 0;
    }
    
    // CRITICAL: Block if campaign would exceed limit
    if (campaignSize > remainingLimit) {
      return res.status(400).json({ 
        error: 'Campaign exceeds daily messaging limit',
        errorCode: 'LIMIT_EXCEEDED',
        limits: {
          dailyLimit: daily_limit,
          messagesSentToday,
          remainingLimit,
          campaignSize,
          shortage: campaignSize - remainingLimit
        },
        recommendation: `Split campaign into ${Math.ceil(campaignSize / remainingLimit)} batches or reduce recipients.`
      });
    }
    
    // Warn if near limit (configurable threshold)
    const percentUsed = ((messagesSentToday + campaignSize) / daily_limit) * 100;
    if (percentUsed >= (MESSAGING_LIMIT_WARNING_THRESHOLD * 100)) {
      console.warn(`⚠️  WARNING: ${percentUsed.toFixed(1)}% of daily limit will be used`);
    }
    
    // Store limits in request for logging
    req.messagingLimits = {
      dailyLimit: daily_limit,
      messagesSentToday,
      remainingLimit,
      campaignSize,
      percentUsed: percentUsed.toFixed(1)
    };
    
    next();
  } catch (error) {
    console.error('Messaging limit check error:', error);
    // Don't block on errors, just warn
    console.warn('⚠️  Proceeding without limit check due to error');
    next();
  }
};

/**
 * Validate campaign recipient limits
 * Apply to: campaign creation routes
 */
const validateRecipientLimit = (req, res, next) => {
  const MAX_RECIPIENTS = MAX_CAMPAIGN_RECIPIENTS;
  
  if (req.body.recipients && Array.isArray(req.body.recipients)) {
    if (req.body.recipients.length > MAX_RECIPIENTS) {
      return res.status(400).json({ 
        error: `Campaign cannot have more than ${MAX_RECIPIENTS.toLocaleString()} recipients`,
        errorCode: 'TOO_MANY_RECIPIENTS',
        provided: req.body.recipients.length,
        maximum: MAX_RECIPIENTS,
        recommendation: 'Split into multiple campaigns or use batch processing'
      });
    }
  }
  
  next();
};

/**
 * Validate password strength
 * Apply to: registration, password change routes
 */
const validatePasswordStrength = (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return next(); // Let other validation handle missing password
  }
  
  const errors = [];
  const MIN_PASSWORD_LENGTH = parseInt(process.env.MIN_PASSWORD_LENGTH) || 8;
  
  // Minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  
  // Uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }
  
  // Lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least 1 lowercase letter');
  }
  
  // Number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Password does not meet requirements',
      errorCode: 'WEAK_PASSWORD',
      requirements: errors,
      hint: 'Example: MyPass123'
    });
  }
  
  next();
};

/**
 * Prevent business data leakage
 * Apply to: all business-scoped routes
 */
const enforceBusinessIsolation = async (req, res, next) => {
  // Skip for super_admin (can access all businesses)
  if (req.user && req.user.userType === 'super_admin') {
    return next();
  }
  
  // Ensure businessId in request matches user's businessId
  if (req.businessId && req.user.businessId) {
    if (req.businessId.toString() !== req.user.businessId.toString()) {
      return res.status(403).json({ 
        error: 'Access denied. Cannot access other business data.',
        errorCode: 'BUSINESS_ISOLATION_VIOLATION'
      });
    }
  }
  
  next();
};

module.exports = {
  enforceSingleSuperAdmin,
  enforceSingleBusinessAdmin,
  validateTemplateApproval,
  checkMessagingLimits,
  validateRecipientLimit,
  validatePasswordStrength,
  enforceBusinessIsolation
};
