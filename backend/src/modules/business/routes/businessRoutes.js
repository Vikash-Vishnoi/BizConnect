/**
 * Business CRUD Routes
 * @module routes/business/businessRoutes
 */

const express = require('express');
const router = express.Router();
const Business = require('../../../core/database/models/Business');
const User = require('../../../core/database/models/User');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusinessAdmin, requireBusinessAccess, canModify } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { asyncHandler, NotFoundError, ValidationError, ConflictError, AuthorizationError } = require('../../../core/middlewares/errorHandler');
const { findByIdSafe, updateByIdSafe, createSafe } = require('../../../common/utils/dbHelpers');
const {  
  validateCreateBusiness, 
  validateUpdateBusiness, 
  validateBusinessId 
} = require('../../../core/middlewares/validation');
const { sendError } = require('../../../common/helpers/errorCodes');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
// Phone validation - using single source of truth
const { sanitizePhoneNumber } = require('../../../common/helpers/phoneValidator');
// Business validation - using centralized utility
const { validateBusiness } = require('../../../common/utils/validators');
const logger = require('../../../common/helpers/logger');

// ===========================
// CONSTANTS
// ===========================

// Status Values
const STATUS_ACTIVE = 'active';

// Setup Steps
const SETUP_STEP_PART2_COMPLETE = 3;
const SETUP_STEP_COMPLETE = 4;

// User Types
const USER_TYPE_BUSINESS_ADMIN = 'business_admin';
const USER_TYPE_SUPER_ADMIN = 'super_admin';

// Population Fields
const POPULATE_OWNER = 'name email';
const POPULATE_TEAM_USER = 'name email';

// Sort Options
const SORT_CREATED_AT_DESC = { createdAt: -1 };

// Error Messages
const ERROR_BUSINESS_NOT_FOUND = 'Business not found';
const ERROR_MISSING_REQUIRED_FIELDS = 'Missing required fields: name, phoneNumberId, accessToken, wabaId, appSecret';
const ERROR_BUSINESS_EXISTS_OTHER_USER = 'A business with this WhatsApp Phone Number ID already exists and belongs to another user';
const ERROR_NO_PERMISSION_SETTINGS = 'You do not have permission to manage business settings';
const ERROR_ONLY_SUPER_ADMIN_SWITCH = 'Only super admins can switch between businesses';
const ERROR_NO_ACCESS_BUSINESS = 'You do not have access to this business';

// Success Messages
const SUCCESS_BUSINESSES_RETRIEVED = 'Businesses retrieved successfully';
const SUCCESS_BUSINESS_RETRIEVED = 'Business retrieved successfully';
const SUCCESS_BUSINESS_CREATED = 'Business created successfully';
const SUCCESS_BUSINESS_UPDATED = 'Business updated successfully';
const SUCCESS_SWITCHED_BUSINESS = 'Switched to business successfully';
const SUCCESS_WEBHOOK_COMPLETED = 'Webhook setup completed successfully';

// API Version Default
const DEFAULT_API_VERSION = 'v18.0';

// Resource Names
const RESOURCE_NAME_BUSINESS = 'Business';

// GET / - Get all businesses for current user
router.get('/', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const businesses = await Business.find({
      $or: [
        { owner: req.userId },
        { 'team.user': req.userId }
      ],
      status: STATUS_ACTIVE,
      isDeleted: false
    })
      .populate('owner', POPULATE_OWNER)
      .populate('team.user', POPULATE_TEAM_USER)
      .sort(SORT_CREATED_AT_DESC);
    
    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({ 
      success: true, 
      data: { businesses, count: businesses.length }, 
      message: SUCCESS_BUSINESSES_RETRIEVED,
      processingTime 
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', { 
      error: error.message, 
      stack: error.stack, 
      userId: req.userId?.toString(),
      processingTime 
    });
    
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof ConflictError) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: ERROR_CODES.CONFLICT_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retrieve businesses',
      processingTime
    });
  }
});

// GET /:id - Get single business
router.get('/:id', auth, validateBusinessId, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  try {
    logger.debug('GET /business/:id route accessed', {
      businessId: req.params.id,
      userId: req.userId,
      userType: req.userType
    });
    
    const { valid, business, error } = await validateBusiness(req.params.id, {
      populateOwner: true,
      userId: req.userId,
      checkActive: false // Allow viewing inactive businesses
    });
    
    if (!valid) {
      throw new NotFoundError(error || ERROR_BUSINESS_NOT_FOUND);
    }
    
    logger.info('Business retrieved successfully', {
      businessId: business._id.toString(),
      userId: req.userId.toString()
    });
    
    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({ 
      success: true, 
      data: business, 
      message: SUCCESS_BUSINESS_RETRIEVED,
      processingTime 
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', { 
      error: error.message, 
      stack: error.stack, 
      businessId: req.params.id,
      userId: req.userId?.toString(),
      processingTime 
    });
    
    if (error instanceof NotFoundError) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof ConflictError) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: ERROR_CODES.CONFLICT_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to create business',
      processingTime
    });
  }
}));

// POST / - Create new business
// RBAC: Business Admin+ can create businesses
router.post('/', auth, requireBusinessAdmin, validateCreateBusiness, async (req, res) => {
  const startTime = Date.now();
  try {
    logger.info('Create business request received', {
      userId: req.userId,
      userType: req.userType
    });
    
    const {
      name,
      displayName,
      description,
      industry,
      website,
      whatsappConfig,
      profile
    } = req.body;
    
    if (!name || !whatsappConfig?.phoneNumberId || !whatsappConfig?.accessToken || 
        !whatsappConfig?.wabaId || !whatsappConfig?.appSecret) {
      logger.warn('Missing required fields in create business request', { userId: req.userId });
      throw new ValidationError(ERROR_MISSING_REQUIRED_FIELDS);
    }
    
    logger.debug('Checking for existing business with phoneNumberId', {
      phoneNumberId: whatsappConfig.phoneNumberId
    });
    
    const existing = await Business.findOne({
      'whatsappConfig.phoneNumberId': whatsappConfig.phoneNumberId
    });
    
    if (existing) {
      logger.info('Found existing business with phoneNumberId', {
        businessId: existing._id.toString(),
        ownerId: existing.owner.toString(),
        requestUserId: req.userId.toString()
      });
      
      // Check if the user owns this business
      if (existing.owner.toString() === req.userId.toString()) {
        logger.info('User owns business - updating existing business', {
          businessId: existing._id.toString(),
          userId: req.userId.toString()
        });
        
        // Update existing business with new credentials
        existing.name = name || existing.name;
        existing.displayName = displayName || name || existing.displayName;
        existing.description = description || existing.description;
        existing.industry = industry || existing.industry;
        existing.website = website || existing.website;
        
        // Update WhatsApp config
        existing.whatsappConfig.accessToken = whatsappConfig.accessToken;
        existing.whatsappConfig.appSecret = whatsappConfig.appSecret;
        existing.whatsappConfig.phoneNumber = sanitizePhoneNumber(whatsappConfig.phoneNumber || '');
        
        // Update profile if provided
        if (profile) {
          existing.profile = { ...existing.profile, ...profile };
        }
        
        // Mark as Part 2 complete, next step is Part 3
        existing.setupStep = SETUP_STEP_PART2_COMPLETE;
        
        await existing.save();
        
        // Update user's businessId if not set
        await User.findByIdAndUpdate(req.userId, {
          businessId: existing._id,
          userType: USER_TYPE_BUSINESS_ADMIN
        });
        
        logger.info('Existing business updated successfully', {
          businessId: existing._id.toString()
        });
        
        // Return updated business
        const businessResponse = existing.toObject();
        businessResponse.whatsappConfig = {
          phoneNumberId: existing.whatsappConfig.phoneNumberId,
          phoneNumber: existing.whatsappConfig.phoneNumber,
          wabaId: existing.whatsappConfig.wabaId,
          apiVersion: existing.whatsappConfig.apiVersion,
          verifyToken: existing.whatsappConfig.verifyToken,
          messagingTier: existing.whatsappConfig.messagingTier,
          qualityRating: existing.whatsappConfig.qualityRating
        };
        
        const processingTime = Date.now() - startTime;
        return res.status(HTTP_STATUS.OK).json({
          success: true,
          message: SUCCESS_BUSINESS_UPDATED,
          isExisting: true,
          data: { business: businessResponse },
          setupStatus: {
            setupStep: existing.setupStep,
            isFullyConfigured: existing.setupStep === SETUP_STEP_COMPLETE
          },
          processingTime
        });
      } else {
        logger.warn('Business exists but belongs to another user', {
          businessId: existing._id.toString(),
          existingOwnerId: existing.owner.toString(),
          requestUserId: req.userId.toString()
        });
        throw new ConflictError(ERROR_BUSINESS_EXISTS_OTHER_USER);
      }
    }
    
    logger.debug('Creating new business', { userId: req.userId });
    
    // Sanitize phone number (remove spaces and formatting)
    const sanitizedPhoneNumber = whatsappConfig.phoneNumber 
      ? sanitizePhoneNumber(whatsappConfig.phoneNumber)
      : '';
    
    logger.debug('Phone number sanitized', {
      original: whatsappConfig.phoneNumber,
      sanitized: sanitizedPhoneNumber
    });
    
    const business = new Business({
      name,
      displayName: displayName || name,  // Top-level displayName
      description,
      industry,
      website,
      owner: req.userId,
      whatsappConfig: {
        phoneNumberId: whatsappConfig.phoneNumberId,
        phoneNumber: sanitizedPhoneNumber,
        wabaId: whatsappConfig.wabaId,
        accessToken: whatsappConfig.accessToken,
        appSecret: whatsappConfig.appSecret,
        // verifyToken is auto-generated by default function
      },
      profile: {
        ...(profile || {}),
        displayName: displayName || name  // Profile displayName
      },
      setupStep: SETUP_STEP_PART2_COMPLETE  // Part 2 complete, next step is Part 3 (webhook)
    });
    
    logger.debug('Business object created, attempting to save', { userId: req.userId });
    
    await business.save();
    
    logger.info('Business saved successfully', {
      businessId: business._id.toString(),
      userId: req.userId.toString()
    });
    
    await User.findByIdAndUpdate(req.userId, {
      businessId: business._id,
      userType: USER_TYPE_BUSINESS_ADMIN
    });
    
    logger.debug('User updated with business ID', {
      userId: req.userId.toString(),
      businessId: business._id.toString()
    });
    
    // Return business with webhook configuration details
    const businessResponse = business.toObject();
    businessResponse.whatsappConfig = {
      phoneNumberId: business.whatsappConfig.phoneNumberId,
      phoneNumber: business.whatsappConfig.phoneNumber,
      wabaId: business.whatsappConfig.wabaId,
      apiVersion: business.whatsappConfig.apiVersion,
      verifyToken: business.whatsappConfig.verifyToken, // Include for webhook setup
      messagingTier: business.whatsappConfig.messagingTier,
      qualityRating: business.whatsappConfig.qualityRating
    };
    
    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_BUSINESS_CREATED,
      data: { business: businessResponse },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', { 
      error: error.message, 
      stack: error.stack, 
      userId: req.userId?.toString(),
      processingTime 
    });
    
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof ConflictError) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: ERROR_CODES.CONFLICT_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof NotFoundError) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to create business',
      processingTime
    });
  }
});

// PUT /:id - Update business settings
router.put('/:id', auth, requireBusinessAccess, canModify('settings'), async (req, res) => {
  const startTime = Date.now();
  try {
    logger.info('PUT /:id starting', {
      businessId: req.params.id,
      userId: req.userId?.toString(),
      userType: req.user?.userType,
      hasWhatsappConfig: !!req.body.whatsappConfig
    });

    // Load business with sensitive fields if updating whatsappConfig
    let business;
    if (req.body.whatsappConfig) {
      business = await Business.findById(req.params.id)
        .select('+whatsappConfig.accessToken +whatsappConfig.appSecret');
      if (!business) {
        throw new NotFoundError(RESOURCE_NAME_BUSINESS);
      }
    } else {
      business = await findByIdSafe(Business, req.params.id, { resourceName: RESOURCE_NAME_BUSINESS });
    }
    
    logger.info('Business found', {
      businessId: business._id?.toString(),
      hasUser: !!req.user
    });

    // Permission check is already handled by canModify('settings') middleware
    
    const { name, displayName, description, industry, website, profile, settings, whatsappConfig } = req.body;
    
    logger.info('Updating fields', {
      hasName: !!name,
      hasWhatsappConfig: !!whatsappConfig,
      whatsappConfigKeys: whatsappConfig ? Object.keys(whatsappConfig) : []
    });

    if (name !== undefined) business.name = name;
    if (displayName !== undefined) business.displayName = displayName;
    if (description !== undefined) business.description = description;
    if (industry !== undefined) business.industry = industry;
    if (website !== undefined) business.website = website;
    if (profile) business.profile = { ...business.profile, ...profile };
    if (settings) business.settings = { ...business.settings, ...settings };
    if (whatsappConfig) business.whatsappConfig = { ...business.whatsappConfig, ...whatsappConfig };
    
    logger.info('Saving business');
    await business.save();
    logger.info('Business saved successfully');
    
    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({ 
      success: true, 
      data: business, 
      message: SUCCESS_BUSINESS_UPDATED,
      processingTime 
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', { 
      error: error.message, 
      stack: error.stack, 
      businessId: req.params.id,
      processingTime 
    });
    
    if (error instanceof NotFoundError) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof ConflictError) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: ERROR_CODES.CONFLICT_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof AuthorizationError) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.AUTHORIZATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to update business',
      processingTime
    });
  }
});

// POST /:id/switch - Switch active business
router.post('/:id/switch', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await findByIdSafe(Business, req.params.id, { resourceName: RESOURCE_NAME_BUSINESS });
    
    if (req.user.userType !== USER_TYPE_SUPER_ADMIN) {
      throw new AuthorizationError(ERROR_ONLY_SUPER_ADMIN_SWITCH);
    }
    
    await User.findByIdAndUpdate(req.userId, {
      businessId: business._id
    });
    
    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({ 
      success: true, 
      data: business, 
      message: SUCCESS_SWITCHED_BUSINESS,
      processingTime 
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', { 
      error: error.message, 
      stack: error.stack, 
      businessId: req.params.id,
      processingTime 
    });
    
    if (error instanceof NotFoundError) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof AuthorizationError) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.AUTHORIZATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retrieve business',
      processingTime
    });
  }
});

// POST /:id/webhook/complete - Mark webhook setup as complete (Part 3)
router.post('/:id/webhook/complete', auth, requireBusinessAccess, async (req, res) => {
  const startTime = Date.now();
  try {
    logger.info('Complete webhook setup request received', {
      businessId: req.params.id,
      userId: req.userId
    });
    
    const business = await findByIdSafe(Business, req.params.id, { resourceName: RESOURCE_NAME_BUSINESS });
    
    // Verify user has access to this business
    if (!business.hasUser(req.userId)) {
      throw new AuthorizationError(ERROR_NO_ACCESS_BUSINESS);
    }
    
    // Mark webhook as configured and setup complete
    business.whatsappConfig.webhookConfigured = true;
    business.whatsappConfig.webhookConfiguredAt = new Date();
    business.setupStep = SETUP_STEP_COMPLETE;  // Mark setup as complete
    await business.save();
    
    logger.info('Webhook setup completed successfully', {
      businessId: business._id.toString()
    });
    
    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({ 
      success: true, 
      data: {
        business: {
          _id: business._id,
          name: business.name,
          setupStep: business.setupStep,
          webhookConfigured: business.whatsappConfig.webhookConfigured
        }
      }, 
      message: SUCCESS_WEBHOOK_COMPLETED,
      processingTime 
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', { 
      error: error.message, 
      stack: error.stack, 
      businessId: req.params.id,
      processingTime 
    });
    
    if (error instanceof NotFoundError) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof AuthorizationError) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.AUTHORIZATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to complete webhook setup',
      processingTime
    });
  }
});

module.exports = router;

