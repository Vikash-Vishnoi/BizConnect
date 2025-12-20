/**
 * Business Profile Settings Routes
 * @module routes/settings/businessProfileRoutes
 */

const express = require('express');
const router = express.Router();
const { Business } = require('../../../core/database/models');
const { businessContext } = require('../../../core/middlewares/businessContext');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const multer = require('multer');
const path = require('path');
const { NotFoundError, ValidationError } = require('../../../core/middlewares/errorHandler');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');
const { validateBusiness } = require('../../../common/utils/validators');

// ===========================
// CONSTANTS
// ===========================

// File Upload Settings
const DEFAULT_PROFILE_PHOTO_MAX_SIZE_MB = '5';
const BYTES_PER_MB = 1024 * 1024;
const maxFileSize = parseInt(process.env.PROFILE_PHOTO_MAX_SIZE_MB || DEFAULT_PROFILE_PHOTO_MAX_SIZE_MB) * BYTES_PER_MB;

// Upload Paths
const UPLOAD_DEST_PROFILES = path.join(__dirname, '../../uploads/profiles');

// Field Names
const FIELD_ABOUT = 'about';
const FIELD_ADDRESS = 'address';
const FIELD_DESCRIPTION = 'description';
const FIELD_EMAIL = 'email';
const FIELD_PHONE_NUMBER = 'phoneNumber';
const FIELD_WEBSITE = 'website';
const FIELD_CITY = 'city';
const FIELD_STATE = 'state';
const FIELD_COUNTRY = 'country';
const FIELD_VERTICAL = 'vertical';
const FIELD_WEBSITES = 'websites';
const FIELD_PHOTO = 'photo';
const FIELD_PROFILE = 'profile';

// Error Messages
const ERROR_NO_PHOTO_UPLOADED = 'No photo file uploaded';

// Success Messages
const SUCCESS_PROFILE_RETRIEVED = 'Business profile retrieved successfully';
const SUCCESS_PROFILE_UPDATED = 'Business profile updated successfully';
const SUCCESS_PHOTO_UPLOADED = 'Profile photo uploaded successfully';

const upload = multer({
  dest: UPLOAD_DEST_PROFILES,
  limits: { fileSize: maxFileSize }
});

// GET /business-profile - Get business profile settings
router.get('/business-profile', async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await validateBusiness(req.businessId);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        profile: business.profile || {}
      },
      message: SUCCESS_PROFILE_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', { 
      error: error.message, 
      stack: error.stack, 
      businessId: req.businessId?.toString(),
      processingTime 
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new Error('Failed to process request');
  }
});

// PUT /business-profile - Update business profile settings
router.put('/business-profile', async (req, res) => {
  const startTime = Date.now();
  try {
    const { about, address, description, email, phoneNumber, website, city, state, country, vertical, websites } = req.body;

    const business = await validateBusiness(req.businessId);

    if (!business.profile) {
      business.profile = {};
    }

    if (about !== undefined) business.profile[FIELD_ABOUT] = about;
    if (address !== undefined) business.profile[FIELD_ADDRESS] = address;
    if (description !== undefined) business.profile[FIELD_DESCRIPTION] = description;
    if (email !== undefined) business.profile[FIELD_EMAIL] = email;
    if (phoneNumber !== undefined) business.profile[FIELD_PHONE_NUMBER] = phoneNumber;
    if (website !== undefined) business.profile[FIELD_WEBSITE] = website;
    if (city !== undefined) business.profile[FIELD_CITY] = city;
    if (state !== undefined) business.profile[FIELD_STATE] = state;
    if (country !== undefined) business.profile[FIELD_COUNTRY] = country;
    if (vertical !== undefined) business.profile[FIELD_VERTICAL] = vertical;
    if (websites !== undefined) business.profile[FIELD_WEBSITES] = websites;

    await business.save();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        profile: business.profile
      },
      message: SUCCESS_PROFILE_UPDATED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', { 
      error: error.message, 
      stack: error.stack, 
      businessId: req.businessId?.toString(),
      processingTime 
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new Error('Failed to process request');
  }
});

// POST /business-profile/photo - Upload business profile photo
router.post('/business-profile/photo', upload.single(FIELD_PHOTO), async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.file) {
      throw new ValidationError(ERROR_NO_PHOTO_UPLOADED);
    }

    const business = await validateBusiness(req.businessId);

    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    const result = await whatsappService.uploadProfilePhoto(business, req.file.path);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { result },
      message: SUCCESS_PHOTO_UPLOADED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', { 
      error: error.message, 
      stack: error.stack, 
      businessId: req.businessId?.toString(),
      processingTime 
    });
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new Error('Failed to process request');
  }
});

module.exports = router;
