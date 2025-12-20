/**
 * Unified Authorization Middleware
 * Consolidates all authorization logic from businessSecurity, rbac, and userTypeAuth
 * 
 * This is the single source of truth for all permission checks in the system.
 * 
 * USAGE GUIDE:
 * 
 * 1. BUSINESS CONTEXT:
 *    router.get('/route', authenticate, requireBusiness, handler)
 *    - Validates business exists and user has access
 *    - Attaches req.business and req.businessId
 * 
 * 2. PERMISSION CHECKS:
 *    router.post('/route', authenticate, requireBusiness, requirePermission('create', 'campaigns'), handler)
 *    - Validates user has specific permission for action
 * 
 * 3. ROLE CHECKS:
 *    router.delete('/route', authenticate, requireSuperAdmin, handler)
 *    router.put('/route', authenticate, requireBusinessAdmin, handler)
 * 
 * 4. BUSINESS PERMISSIONS:
 *    router.get('/route', authenticate, requireBusinessPermission('view', 'analytics'), handler)
 *    - Checks permission within business context
 * 
 * 5. RESOURCE OWNERSHIP:
 *    router.delete('/campaign/:id', authenticate, requireBusinessAccess, handler)
 *    - Validates user owns or has access to the resource
 * 
 * User Type Hierarchy:
 * - super_admin: Full system access (all permissions)
 * - business_admin: Full access to their business
 * - manager: Create campaigns, manage templates, send messages, view analytics
 * - normal_user: Send messages, manage contacts, limited access
 * 
 * Available Permissions:
 * - manage_all_businesses, manage_business_settings, manage_billing
 * - manage_team, create_campaigns, manage_templates, send_messages
 * - view_analytics, manage_contacts, manage_automations
 * - view_audit_logs, manage_compliance, access_api
 * - view_phone_health, export_data
 */

const Business = require('../database/models/Business');
const User = require('../database/models/User');
const Template = require('../database/models/Template');
const Campaign = require('../database/models/Campaign');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../common/constants');

// ============================================
// CONSTANTS
// ============================================

const BUSINESS_STATUS_ACTIVE = 'active';
const MESSAGING_LIMIT_WARNING_THRESHOLD = parseFloat(process.env.MESSAGING_LIMIT_WARNING_THRESHOLD) || 0.8;
const MAX_CAMPAIGN_RECIPIENTS = parseInt(process.env.MAX_CAMPAIGN_RECIPIENTS) || 10000;
const TEMPLATE_STATUS_APPROVED = 'approved';
const TEMPLATE_WHATSAPP_STATUS_APPROVED = 'APPROVED';
const TIER_UNLIMITED = 'UNLIMITED';

// ============================================
// ROLES CONSTANTS
// ============================================

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BUSINESS_ADMIN: 'business_admin',
  MANAGER: 'manager',
  USER: 'normal_user'
};

const PERMISSIONS = {
  MANAGE_ALL_BUSINESSES: 'manage_all_businesses',
  MANAGE_BUSINESS_SETTINGS: 'manage_business_settings',
  MANAGE_BILLING: 'manage_billing',
  MANAGE_TEAM: 'manage_team',
  CREATE_CAMPAIGNS: 'create_campaigns',
  MANAGE_TEMPLATES: 'manage_templates',
  SEND_MESSAGES: 'send_messages',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_CONTACTS: 'manage_contacts',
  MANAGE_AUTOMATIONS: 'manage_automations',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_COMPLIANCE: 'manage_compliance',
  ACCESS_API: 'access_api',
  VIEW_PHONE_HEALTH: 'view_phone_health',
  EXPORT_DATA: 'export_data'
};

// Role-Permission Mapping
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.BUSINESS_ADMIN]: [
    PERMISSIONS.MANAGE_BUSINESS_SETTINGS,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.CREATE_CAMPAIGNS,
    PERMISSIONS.MANAGE_TEMPLATES,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_CONTACTS,
    PERMISSIONS.MANAGE_AUTOMATIONS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.MANAGE_COMPLIANCE,
    PERMISSIONS.ACCESS_API,
    PERMISSIONS.VIEW_PHONE_HEALTH,
    PERMISSIONS.EXPORT_DATA
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.CREATE_CAMPAIGNS,
    PERMISSIONS.MANAGE_TEMPLATES,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_CONTACTS,
    PERMISSIONS.MANAGE_AUTOMATIONS,
    PERMISSIONS.MANAGE_COMPLIANCE,
    PERMISSIONS.ACCESS_API,
    PERMISSIONS.EXPORT_DATA
  ],
  [ROLES.USER]: [
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.MANAGE_CONTACTS,
    PERMISSIONS.ACCESS_API
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a userType has a specific permission
 */
const hasPermission = (userType, permission) => {
  if (!userType || !ROLE_PERMISSIONS[userType]) {
    return false;
  }
  return ROLE_PERMISSIONS[userType].includes(permission);
};

// ============================================
// BUSINESS CONTEXT MIDDLEWARE
// ============================================

/**
 * Require and validate business context
 * Loads business and attaches to req.business
 * 
 * Usage: router.get('/campaigns', authenticate, requireBusiness, handler)
 */
const requireBusiness = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    // Get businessId from various sources
    const businessId = req.businessId || 
                       req.params.businessId || 
                       req.query.businessId || 
                       req.body.businessId || 
                       req.user?.businessId;
    
    if (!businessId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Business context required. Please select a business or provide X-Business-ID header.',
        errorCode: ERROR_CODES.BUSINESS_CONTEXT_REQUIRED
      });
    }
    
    // Load business (Business.findById is necessary here for full middleware functionality)
    const business = await Business.findById(businessId);
    
    if (!business) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Business not found',
        errorCode: ERROR_CODES.BUSINESS_NOT_FOUND
      });
    }
    
    // Check business status
    if (business.status !== BUSINESS_STATUS_ACTIVE || business.isDeleted) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Business is not active',
        errorCode: ERROR_CODES.BUSINESS_ACCESS_DENIED
      });
    }
    
    // Verify user has access (unless super_admin)
    if (req.user?.userType !== ROLES.SUPER_ADMIN) {
      if (!req.user?.canAccessBusiness || !req.user.canAccessBusiness(business._id)) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'You do not have access to this business',
          errorCode: ERROR_CODES.BUSINESS_ACCESS_DENIED
        });
      }
    }
    
    // Attach business to request
    req.business = business;
    req.businessId = business._id;
    
    const processingTime = Date.now() - startTime;
    logger.info('Business context validated', {
      businessId: business._id.toString(),
      businessName: business.name,
      userId: req.userId?.toString(),
      processingTime
    });
    
    next();
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Business context validation failed', {
      error: error.message,
      errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
      userId: req.userId?.toString(),
      businessId: req.businessId?.toString(),
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to validate business context',
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

/**
 * Require business access (less strict than requireBusiness)
 * Only checks if user can access the business, doesn't validate status
 */
const requireBusinessAccess = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    }

    // Super Admin can access all businesses
    if (req.user.userType === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Get businessId from request
    const businessId = req.params.id ||
                       req.params.businessId || 
                       req.query.businessId || 
                       req.body.businessId || 
                       req.user.businessId;

    if (!businessId) {
      if (!req.user.businessId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'No business access',
          errorCode: ERROR_CODES.BUSINESS_ACCESS_DENIED
        });
      }
      return next();
    }

    // Check if user can access this business
    if (!req.user.canAccessBusiness(businessId)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Access denied to this business',
        errorCode: ERROR_CODES.BUSINESS_ACCESS_DENIED
      });
    }

    const processingTime = Date.now() - startTime;
    logger.info('Business access validated', {
      businessId: businessId?.toString(),
      userId: req.userId?.toString(),
      processingTime
    });
    
    next();
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Business access check failed', {
      error: error.message,
      errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
      userId: req.userId?.toString(),
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Business access validation failed',
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

// ============================================
// ROLE-BASED MIDDLEWARE
// ============================================

/**
 * Require specific user type(s)
 * @param {string|string[]} allowedTypes - User type(s) that can access
 * 
 * Usage: router.post('/admin', authenticate, requireUserType(['super_admin', 'business_admin']), handler)
 */
const requireUserType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    }

    const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
    
    if (!types.includes(req.user.userType)) {
      logger.warn('Insufficient permissions', {
        userId: req.userId?.toString(),
        userType: req.user.userType,
        required: types
      });
      
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: `Insufficient permissions. Required: ${types.join(' or ')}`,
        errorCode: ERROR_CODES.FORBIDDEN
      });
    }

    next();
  };
};

/**
 * Require Super Admin only
 */
const requireSuperAdmin = requireUserType(ROLES.SUPER_ADMIN);

/**
 * Require Business Admin or Super Admin
 */
const requireBusinessAdmin = requireUserType([ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]);

/**
 * Require Manager or higher
 */
const requireManager = requireUserType([ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]);

/**
 * Require Business Owner (creator of the business)
 */
const requireBusinessOwner = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    }

    // Super Admin has all access
    if (req.user.userType === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Must have business context
    if (!req.business && !req.businessId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Business context required',
        errorCode: ERROR_CODES.BUSINESS_CONTEXT_REQUIRED
      });
    }

    // Load business if not already attached (Business.findById needed for ownership check)
    const business = req.business || await Business.findById(req.businessId);
    
    if (!business) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Business not found',
        errorCode: ERROR_CODES.BUSINESS_NOT_FOUND
      });
    }

    // Check if user is the owner
    if (business.owner.toString() !== req.userId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Only business owner can perform this action',
        errorCode: ERROR_CODES.FORBIDDEN
      });
    }

    const processingTime = Date.now() - startTime;
    logger.info('Business owner verified', {
      businessId: business._id.toString(),
      userId: req.userId.toString(),
      processingTime
    });
    
    next();
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Business owner check failed', {
      error: error.message,
      errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
      userId: req.userId?.toString(),
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Ownership validation failed',
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

/**
 * Require Business Owner or Admin
 */
const requireOwnerOrAdmin = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    }

    // Super Admin or Business Admin can proceed
    if ([ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN].includes(req.user.userType)) {
      return next();
    }

    // Check if user is business owner
    if (!req.business && !req.businessId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Business context required',
        errorCode: ERROR_CODES.BUSINESS_CONTEXT_REQUIRED
      });
    }

    // Load business if not already attached (Business.findById needed for ownership check)
    const business = req.business || await Business.findById(req.businessId);
    
    if (!business) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Business not found',
        errorCode: ERROR_CODES.BUSINESS_NOT_FOUND
      });
    }

    if (business.owner.toString() === req.userId.toString()) {
      const processingTime = Date.now() - startTime;
      logger.info('Owner or admin verified', {
        businessId: business._id.toString(),
        userId: req.userId.toString(),
        processingTime
      });
      return next();
    }

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: 'Only business owner or admin can perform this action',
      errorCode: ERROR_CODES.FORBIDDEN
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Owner/Admin check failed', {
      error: error.message,
      errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
      userId: req.userId?.toString(),
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Authorization check failed',
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

// ============================================
// PERMISSION-BASED MIDDLEWARE
// ============================================

/**
 * Require specific permission
 * @param {string} permission - Permission to check
 * 
 * Usage: router.post('/campaigns', authenticate, requirePermission('create_campaigns'), handler)
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    }

    if (!hasPermission(req.user.userType, permission)) {
      logger.warn('Permission denied', {
        userId: req.userId?.toString(),
        userType: req.user.userType,
        permission
      });
      
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: `Access denied. Required permission: ${permission}`,
        errorCode: ERROR_CODES.FORBIDDEN
      });
    }

    next();
  };
};

// ============================================
// MODULE-SPECIFIC PERMISSIONS
// ============================================

/**
 * Check if user can modify data
 * @param {string} module - Module name (optional: 'inbox', 'conversations', 'settings', etc.)
 * 
 * Usage: router.put('/campaign/:id', authenticate, canModify('campaigns'), handler)
 */
const canModify = (module = null) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    }

    const { userType } = req.user;

    // Super Admin can modify everything
    if (userType === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Business Admin can modify everything in their business
    if (userType === ROLES.BUSINESS_ADMIN) {
      return next();
    }

    // Manager can only modify inbox/conversations
    if (userType === ROLES.MANAGER) {
      if (!module || module === 'inbox' || module === 'conversations') {
        return next();
      }
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Managers can only modify inbox data',
        errorCode: ERROR_CODES.FORBIDDEN
      });
    }

    // Normal User cannot modify anything
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: 'Normal users have view-only access',
      errorCode: ERROR_CODES.FORBIDDEN
    });
  };
};

// ============================================
// BUSINESS SECURITY ENFORCEMENT
// ============================================

/**
 * Enforce single super_admin in system
 * Apply to: registration, profile update routes
 */
const enforceSingleSuperAdmin = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { userType } = req.body;
    
    if (userType === ROLES.SUPER_ADMIN) {
      // Allow if already super_admin (profile update)
      if (req.user && req.user.userType === ROLES.SUPER_ADMIN) {
        return next();
      }
      
      // Check if super_admin already exists
      const existingSuperAdmin = await User.findOne({ userType: ROLES.SUPER_ADMIN });
      if (existingSuperAdmin) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          error: 'Super admin already exists. Only one super admin allowed in the system.',
          errorCode: 'SUPER_ADMIN_EXISTS'
        });
      }
    }
    
    const processingTime = Date.now() - startTime;
    logger.info('Super admin enforcement check passed', {
      userId: req.user?._id?.toString(),
      processingTime
    });
    
    next();
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Super admin enforcement error', {
      error: error.message,
      errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
      userId: req.user?._id?.toString(),
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Security check failed',
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

/**
 * Enforce single business_admin per business
 * Apply to: team member addition, role update routes
 */
const enforceSingleBusinessAdmin = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { userType } = req.body;
    const businessId = req.params.id || req.params.businessId || req.businessId;
    
    if (userType === ROLES.BUSINESS_ADMIN && businessId) {
      // Check if business already has an admin
      const existingAdmin = await User.findOne({ 
        businessId,
        userType: ROLES.BUSINESS_ADMIN
      });
      
      // Allow if updating self
      const userId = req.params.userId || req.body.userId;
      if (existingAdmin && existingAdmin._id.toString() !== userId) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
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
    
    const processingTime = Date.now() - startTime;
    logger.info('Business admin enforcement check passed', {
      businessId: businessId?.toString(),
      userId: req.user?._id?.toString(),
      processingTime
    });
    
    next();
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Business admin enforcement error', {
      error: error.message,
      errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
      businessId: req.businessId?.toString(),
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Security check failed',
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

/**
 * Validate template is approved before campaign operations
 * Apply to: campaign start, campaign send routes
 */
const validateTemplateApproval = async (req, res, next) => {
  console.log('🔍 validateTemplateApproval - START');
  const startTime = Date.now();
  
  try {
    let campaignId = req.params.id;
    let templateId = req.body.templateId;
    
    // If starting existing campaign, get template from campaign
    if (campaignId && !templateId) {
      console.log('📋 Fetching campaign to get template:', campaignId);
      const campaign = await Campaign.findById(campaignId).select('templateId');
      if (!campaign) {
        console.log('❌ Campaign not found');
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Campaign not found',
          errorCode: ERROR_CODES.RESOURCE_NOT_FOUND
        });
      }
      templateId = campaign.templateId;
      console.log('📋 Template ID from campaign:', templateId);
    }
    
    if (!templateId) {
      console.log('⏭️ No template to validate, skipping');
      return next(); // No template to validate
    }
    
    // Check template status
    console.log('🔍 Fetching template:', templateId);
    const template = await Template.findById(templateId).select('status whatsappStatus name');
    
    if (!template) {
      console.log('❌ Template not found');
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Template not found',
        errorCode: ERROR_CODES.RESOURCE_NOT_FOUND
      });
    }
    
    // Only allow approved templates (check status OR whatsappStatus)
    const isStatusApproved = template.status === TEMPLATE_STATUS_APPROVED;
    const isWhatsappApproved = template.whatsappStatus === TEMPLATE_WHATSAPP_STATUS_APPROVED;
    
    // Log template status for debugging
    console.log('📊 Template approval check:', {
      templateName: template.name,
      status: template.status,
      whatsappStatus: template.whatsappStatus,
      isStatusApproved,
      isWhatsappApproved
    });
    
    logger.info('Checking template approval', {
      templateId: templateId.toString(),
      templateName: template.name,
      status: template.status,
      whatsappStatus: template.whatsappStatus,
      isStatusApproved,
      isWhatsappApproved
    });
    
    // Template is approved if EITHER status is approved OR whatsappStatus is APPROVED
    if (!isStatusApproved && !isWhatsappApproved) {
      console.log('❌ Template not approved');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
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
    
    // Store template in request
    req.approvedTemplate = template;
    
    const processingTime = Date.now() - startTime;
    console.log('✅ validateTemplateApproval - PASSED', processingTime + 'ms');
    logger.info('Template approval validated', {
      templateId: templateId.toString(),
      templateName: template.name,
      processingTime
    });
    
    next();
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.log('❌ validateTemplateApproval - ERROR:', error.message);
    logger.error('Template validation error', {
      error: error.message,
      errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Template validation failed',
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

/**
 * Check WhatsApp messaging limits before campaign operations
 * Apply to: campaign start, bulk send routes
 */
const checkMessagingLimits = async (req, res, next) => {
  console.log('🔍 checkMessagingLimits - START');
  const startTime = Date.now();
  
  try {
    if (!req.business) {
      console.log('❌ No business context');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Business context required',
        errorCode: ERROR_CODES.BUSINESS_CONTEXT_REQUIRED
      });
    }

    const business = req.business;
    console.log('📊 Business messaging limit:', business.messagingLimit);
    
    // Check if messaging limit is set
    if (!business.messagingLimit || business.messagingLimit.tier === TIER_UNLIMITED) {
      console.log('⏭️ No limit or unlimited tier, skipping');
      return next();
    }

    const { currentUsage, maxAllowed } = business.messagingLimit;
    const usagePercentage = currentUsage / maxAllowed;

    console.log('📊 Usage:', { currentUsage, maxAllowed, percentage: Math.round(usagePercentage * 100) });

    // Block if at or over limit
    if (currentUsage >= maxAllowed) {
      console.log('❌ Messaging limit reached');
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Messaging limit reached. Upgrade your tier or wait for limit reset.',
        errorCode: 'MESSAGING_LIMIT_REACHED',
        limit: {
          current: currentUsage,
          max: maxAllowed,
          percentage: Math.round(usagePercentage * 100)
        }
      });
    }

    // Warn if approaching limit
    if (usagePercentage >= MESSAGING_LIMIT_WARNING_THRESHOLD) {
      logger.warn('Approaching messaging limit', {
        businessId: business._id.toString(),
        currentUsage,
        maxAllowed,
        percentage: Math.round(usagePercentage * 100)
      });
    }

    const processingTime = Date.now() - startTime;
    console.log('✅ checkMessagingLimits - PASSED', processingTime + 'ms');
    logger.info('Messaging limits checked', {
      businessId: business._id.toString(),
      currentUsage,
      maxAllowed,
      processingTime
    });
    
    next();
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.log('❌ checkMessagingLimits - ERROR:', error.message);
    logger.error('Messaging limit check failed', {
      error: error.message,
      errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
      businessId: req.business?._id?.toString(),
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Limit validation failed',
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

// ============================================
// EXPORTS
// ============================================

// ============================================
// BACKWARD COMPATIBILITY
// ============================================

/**
 * Backward compatibility alias for requireBusinessPermission
 * Maps old (action, module) pattern to new permission-based system
 * 
 * @deprecated Use requirePermission(permission) instead
 */
const requireBusinessPermission = (action, module) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    }

    const { userType } = req.user;

    // Super Admin has all permissions
    if (userType === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Business Admin has all business permissions
    if (userType === ROLES.BUSINESS_ADMIN) {
      return next();
    }

    // Map action + module to permission string
    const permissionMap = {
      'manage_conversations': ['manage', 'conversations'],
      'view_conversations': ['view', 'conversations'],
      'manage_templates': ['manage', 'templates'],
      'view_templates': ['view', 'templates'],
      'manage_settings': ['manage', 'settings'],
      'view_analytics': ['view', 'analytics']
    };

    // Check if action/module matches any permission
    const matchingPermission = Object.keys(permissionMap).find(perm => {
      const [permAction, permModule] = permissionMap[perm];
      return permAction === action && permModule === module;
    });

    if (matchingPermission && hasPermission(userType, matchingPermission)) {
      return next();
    }

    logger.warn('Permission denied (legacy)', {
      userId: req.userId?.toString(),
      userType,
      action,
      module
    });

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: `Access denied. Required permission: ${action} ${module}`,
      errorCode: ERROR_CODES.FORBIDDEN
    });
  };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Constants
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  
  // Helper functions
  hasPermission,
  
  // Business context
  requireBusiness,
  requireBusinessAccess,
  
  // Role-based
  requireUserType,
  requireSuperAdmin,
  requireBusinessAdmin,
  requireManager,
  requireBusinessOwner,
  requireOwnerOrAdmin,
  
  // Permission-based
  requirePermission,
  requireBusinessPermission,  // Backward compatibility
  
  // Module permissions
  canModify,
  
  // Security enforcement
  enforceSingleSuperAdmin,
  enforceSingleBusinessAdmin,
  validateTemplateApproval,
  checkMessagingLimits
};
