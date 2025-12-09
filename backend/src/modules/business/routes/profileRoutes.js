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
const whatsappService = new WhatsAppService();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for profile photo upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const maxFileSize = parseInt(process.env.PROFILE_PHOTO_MAX_SIZE_MB || '5') * 1024 * 1024;
const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
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
  try {
    const { include } = req.query;
    const includes = include ? include.split(',').map(i => i.trim()) : [];

    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const response = {
      success: true,
      user
    };

    // Include summary statistics
    if (includes.includes('summary')) {
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
    if (includes.includes('whatsapp') && req.businessId) {
      const business = await Business.findById(req.businessId);
      if (business) {
        try {
          const whatsappProfile = await whatsappService.getBusinessProfile(business);
          response.whatsapp = whatsappProfile;
        } catch (error) {
          console.error('Error fetching WhatsApp profile:', error);
          response.whatsapp = { error: 'Failed to fetch WhatsApp profile' };
        }
      }
    }

    // Include business info
    if (includes.includes('business') && req.businessId) {
      const business = await Business.findById(req.businessId).select('name displayName industry createdAt');
      response.business = business;
    }

    res.json(response);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
});

/**
 * PUT / - Update user profile
 * Unchanged from original
 */
router.put('/', async (req, res) => {
  try {
    const { name, email, phone, preferences } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: { ...user.toObject(), password: undefined }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

/**
 * POST /password - Change password
 * Changed from PUT to POST for better REST semantics
 */
router.post('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
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
router.get('/whatsapp', async (req, res) => {
  try {
    if (!req.businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID required'
      });
    }

    const { include } = req.query;
    const includes = include ? include.split(',').map(i => i.trim()) : [];

    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const profile = await whatsappService.getBusinessProfile(business);

    const response = {
      success: true,
      profile
    };

    // Include business hours if requested
    if (includes.includes('business-hours')) {
      try {
        const businessHours = await whatsappService.getBusinessHours(business);
        response.businessHours = businessHours;
      } catch (error) {
        console.error('Error fetching business hours:', error);
        response.businessHours = { error: 'Failed to fetch business hours' };
      }
    }

    // Include available verticals if requested
    if (includes.includes('verticals')) {
      response.verticals = [
        'AUTOMOTIVE', 'BEAUTY', 'APPAREL', 'EDU', 'ENTERTAIN', 'EVENT_PLAN',
        'FINANCE', 'GROCERY', 'GOVT', 'HOTEL', 'HEALTH', 'NONPROFIT', 'PROF_SERVICES',
        'RETAIL', 'TRAVEL', 'RESTAURANT', 'NOT_A_BIZ', 'OTHER'
      ];
    }

    res.json(response);
  } catch (error) {
    console.error('Error getting WhatsApp profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get WhatsApp profile',
      error: error.message
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
router.put('/whatsapp', async (req, res) => {
  try {
    if (!req.businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID required'
      });
    }

    const { about, address, description, email, vertical, websites, businessHours } = req.body;

    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

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

      const updatedProfile = await whatsappService.updateBusinessProfile(
        business,
        profileData
      );

      response.profile = updatedProfile;
    }

    // Update business hours if provided
    if (businessHours && Array.isArray(businessHours)) {
      const updatedHours = await whatsappService.updateBusinessHours(business, businessHours);
      response.businessHours = updatedHours;
    }

    res.json(response);
  } catch (error) {
    console.error('Error updating WhatsApp profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update WhatsApp profile',
      error: error.message
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
router.post('/avatar', upload.single('photo'), async (req, res) => {
  try {
    if (!req.businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID required'
      });
    }

    const { action = 'upload' } = req.query;

    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (action === 'delete') {
      await whatsappService.deleteProfilePhoto(business);
      return res.json({
        success: true,
        message: 'Profile photo deleted successfully'
      });
    }

    // Default action: upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file uploaded'
      });
    }

    const photoPath = req.file.path;
    const result = await whatsappService.uploadProfilePhoto(business, photoPath);

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      result
    });
  } catch (error) {
    console.error('Error managing profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage profile photo',
      error: error.message
    });
  }
});

module.exports = router;
