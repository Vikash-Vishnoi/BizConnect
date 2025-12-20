/**
 * Consolidated Profile Routes (Phase 3)
 * @module routes/profile/profileRoutes
 * 
 * Consolidates user and WhatsApp profile management from 11 routes to 6 routes
 */
 
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Business } = require('../../../core/database/models');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { asyncHandler, NotFoundError, ValidationError } = require('../../../core/middlewares/errorHandler');
const logger = require('../../../common/helpers/logger');
const { validateBusiness } = require('../../../common/utils/validators');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// ============================================================================
// CONSTANTS
// ============================================================================

const PASSWORD_MIN_LENGTH = 6;
const PROFILE_PHOTO_DEFAULT_MAX_SIZE_MB = 5;
const UPLOAD_DIR_RELATIVE = '../../uploads/profiles';

const ALLOWED_IMAGE_TYPES = /jpeg|jpg|png/;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const INCLUDE_OPTIONS = {
  SUMMARY: 'summary',
  WHATSAPP: 'whatsapp',
  BUSINESS: 'business',
  BUSINESS_HOURS: 'business-hours',
  VERTICALS: 'verticals'
};

const WHATSAPP_VERTICALS = [
  'AUTOMOTIVE', 'BEAUTY', 'APPAREL', 'EDU', 'ENTERTAIN', 'EVENT_PLAN',
  'FINANCE', 'GROCERY', 'GOVT', 'HOTEL', 'HEALTH', 'NONPROFIT', 'PROF_SERVICES',
  'RETAIL', 'TRAVEL', 'RESTAURANT', 'NOT_A_BIZ', 'OTHER'
];

const AVATAR_ACTIONS = {
  UPLOAD: 'upload',
  DELETE: 'delete'
};

const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  EMAIL_IN_USE: 'Email already in use',
  PASSWORD_REQUIRED: 'Current password and new password are required',
  PASSWORD_TOO_SHORT: `New password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  INCORRECT_PASSWORD: 'Current password is incorrect',
  BUSINESS_REQUIRED: 'Business ID required',
  NO_PHOTO_UPLOADED: 'No photo file uploaded',
  IMAGE_FORMAT_ERROR: 'Only .png, .jpg and .jpeg format allowed!'
};

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

// Configure multer for profile photo upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, UPLOAD_DIR_RELATIVE);
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const maxFileSize = parseInt(process.env.PROFILE_PHOTO_MAX_SIZE_MB || PROFILE_PHOTO_DEFAULT_MAX_SIZE_MB.toString()) * 1024 * 1024;
const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    const extname = ALLOWED_IMAGE_TYPES.test(path.extname(file.originalname).toLowerCase());
    const mimetype = ALLOWED_MIME_TYPES.includes(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error(ERROR_MESSAGES.IMAGE_FORMAT_ERROR));
  }
});

// ============================================================================
// USER PROFILE ROUTES
// ============================================================================

/**
 * GET / - Get user profile with optional includes
 * @query {string} include - Comma-separated: 'summary' | 'whatsapp' | 'business'
 * 
 * Consolidates:
 * - GET /api/profile
 * - GET /api/profile/summary
 * - GET /api/profile/whatsapp (when include=whatsapp)
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  try {
    const { include } = req.query;
    const includes = include ? include.split(',').map(i => i.trim()) : [];

    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const response = {
      success: true,
      user
    };

    // Include summary statistics
    if (includes.includes(INCLUDE_OPTIONS.SUMMARY)) {
      const Business = require('../../../core/database/models/Business');
      const Conversation = require('../../../core/database/models/Conversation');
      const Campaign = require('../../../core/database/models/Campaign');

      const [businessCount, conversationCount, campaignCount] = await Promise.all([
        Business.countDocuments({ users: user._id }),
        req.businessId ? Conversation.countDocuments({ businessId: req.businessId }) : 0,
        req.businessId ? Campaign.countDocuments({ businessId: req.businessId }) : 0
      ]);

      response.summary = {
        businesses: businessCount,
        conversations: conversationCount,
        campaigns: campaignCount,
        joinedAt: user.createdAt
      };
    }

    // Include WhatsApp profile (requires business)
    if (includes.includes(INCLUDE_OPTIONS.WHATSAPP) && req.businessId) {
      const business = await validateBusiness(req.businessId);
      try {
        const credentials = await business.getWhatsAppCredentials();
        const whatsappService = new WhatsAppService(credentials);
        const whatsappProfile = await whatsappService.getBusinessProfile(business);
        response.whatsapp = whatsappProfile;
      } catch (error) {
        logger.error('Error fetching WhatsApp profile', { businessId: req.businessId, error: error.message });
        response.whatsapp = { error: 'Failed to fetch WhatsApp profile' };
      }
    }

    // Include business info
    if (includes.includes(INCLUDE_OPTIONS.BUSINESS) && req.businessId) {
      const business = await validateBusiness(req.businessId, { select: 'name displayName industry createdAt' });
      response.business = business;
    }

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      ...response,
      message: 'User profile retrieved successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    logger.error('Error getting user profile', { userId: req.user?.id, error: error.message, processingTime });
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message,
      processingTime
    });
  }
});

/**
 * PUT / - Update user profile
 * Unchanged from original
 */
router.put('/', async (req, res) => {
  const startTime = Date.now();
  try {
    const { name, email, phone, preferences } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ValidationError(ERROR_MESSAGES.EMAIL_IN_USE);
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        message: 'Profile updated successfully',
        user: { ...user.toObject(), password: undefined }
      },
      message: 'Profile updated successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    logger.error('Error updating user profile', { userId: req.user?.id, error: error.message, processingTime });
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
      processingTime
    });
  }
});

/**
 * POST /password - Change password
 * Changed from PUT to POST for better REST semantics
 */
router.post('/password', async (req, res) => {
  const startTime = Date.now();
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError(ERROR_MESSAGES.PASSWORD_REQUIRED);
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      throw new ValidationError(ERROR_MESSAGES.PASSWORD_TOO_SHORT);
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      throw new ValidationError(ERROR_MESSAGES.INCORRECT_PASSWORD);
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { message: 'Password changed successfully' },
      message: 'Password changed successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    logger.error('Error changing password', { userId: req.user?.id, error: error.message, processingTime });
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to change password',
      error: error.message,
      processingTime
    });
  }
});

// ============================================================================
// WHATSAPP PROFILE ROUTES (Require business)
// ============================================================================

/**
 * GET /whatsapp - Get WhatsApp Business Profile
 * Can include sub-resources with query params
 * @query {string} include - Comma-separated: 'business-hours' | 'verticals'
 */
router.get('/whatsapp', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.businessId) {
      throw new ValidationError(ERROR_MESSAGES.BUSINESS_REQUIRED);
    }

    const { include } = req.query;
    const includes = include ? include.split(',').map(i => i.trim()) : [];

    const business = await validateBusiness(req.businessId);

    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    const profile = await whatsappService.getBusinessProfile(business);

    const response = {
      success: true,
      profile
    };

    // Include business hours if requested
    if (includes.includes(INCLUDE_OPTIONS.BUSINESS_HOURS)) {
      try {
        const businessHours = await whatsappService.getBusinessHours(business);
        response.businessHours = businessHours;
      } catch (error) {
        logger.error('Error fetching business hours', { businessId: req.businessId, error: error.message });
        response.businessHours = { error: 'Failed to fetch business hours' };
      }
    }

    // Include available verticals if requested
    if (includes.includes(INCLUDE_OPTIONS.VERTICALS)) {
      response.verticals = WHATSAPP_VERTICALS;
    }

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      ...response,
      message: 'WhatsApp profile retrieved successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    logger.error('Error getting WhatsApp profile', { businessId: req.businessId, error: error.message, processingTime });
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get WhatsApp profile',
      error: error.message,
      processingTime
    });
  }
});

/**
 * PUT /whatsapp - Update WhatsApp Business Profile
 * Now handles photo upload, business hours, and all profile fields in one endpoint
 * @body {string} about - Business description
 * @body {string} address - Business address
 * @body {string} description - Detailed description
 * @body {string} email - Contact email
 * @body {string} vertical - Business category
 * @body {string[]} websites - Website URLs
 * @body {object[]} businessHours - Array of business hours objects
 * 
 * Consolidates:
 * - PUT /api/profile/whatsapp
 * - PUT /api/profile/whatsapp/business-hours
 */
router.put('/whatsapp', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.businessId) {
      throw new ValidationError(ERROR_MESSAGES.BUSINESS_REQUIRED);
    }

    const { about, address, description, email, vertical, websites, businessHours } = req.body;

    const business = await validateBusiness(req.businessId);

    const response = {
      success: true,
      message: 'WhatsApp profile updated successfully'
    };

    // Update profile fields if provided
    if (about !== undefined || address !== undefined || description !== undefined || 
        email !== undefined || vertical !== undefined || websites !== undefined) {
      
      const profileData = {};
      if (about !== undefined) profileData.about = about;
      if (address !== undefined) profileData.address = address;
      if (description !== undefined) profileData.description = description;
      if (email !== undefined) profileData.email = email;
      if (vertical !== undefined) profileData.vertical = vertical;
      if (websites !== undefined) profileData.websites = websites;

      const credentials = await business.getWhatsAppCredentials();
      const whatsappService = new WhatsAppService(credentials);
      const updatedProfile = await whatsappService.updateBusinessProfile(
        business,
        profileData
      );

      response.profile = updatedProfile;
    }

    // Update business hours if provided
    if (businessHours && Array.isArray(businessHours)) {
      const credentials = await business.getWhatsAppCredentials();
      const whatsappService = new WhatsAppService(credentials);
      const updatedHours = await whatsappService.updateBusinessHours(business, businessHours);
      response.businessHours = updatedHours;
    }

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      ...response,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    logger.error('Error updating WhatsApp profile', { businessId: req.businessId, error: error.message, processingTime });
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to update WhatsApp profile',
      error: error.message,
      processingTime
    });
  }
});

/**
 * POST /avatar - Upload profile photo (formerly /whatsapp/photo)
 * Renamed for clarity and consolidated photo operations
 * @file photo - Image file (jpg, jpeg, png)
 * @query {string} action - 'upload' (default) | 'delete'
 * 
 * Consolidates:
 * - POST /api/profile/whatsapp/photo
 * - DELETE /api/profile/whatsapp/photo
 */
router.post('/avatar', businessContext, upload.single('photo'), async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.businessId) {
      throw new ValidationError(ERROR_MESSAGES.BUSINESS_REQUIRED);
    }

    const { action = AVATAR_ACTIONS.UPLOAD } = req.query;

    const business = await validateBusiness(req.businessId);

    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    if (action === AVATAR_ACTIONS.DELETE) {
      await whatsappService.deleteProfilePhoto(business);
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { message: 'Profile photo deleted successfully' },
        message: 'Profile photo deleted successfully',
        processingTime
      });
    }

    // Default action: upload
    if (!req.file) {
      throw new ValidationError(ERROR_MESSAGES.NO_PHOTO_UPLOADED);
    }

    const photoPath = req.file.path;
    const result = await whatsappService.uploadProfilePhoto(business, photoPath);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        message: 'Profile photo uploaded successfully',
        result
      },
      message: 'Profile photo uploaded successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    logger.error('Error managing profile photo', { businessId: req.businessId, error: error.message, processingTime });
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to manage profile photo',
      error: error.message,
      processingTime
    });
  }
});

module.exports = router;
