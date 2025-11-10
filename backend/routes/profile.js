const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const whatsappService = require('../services/whatsappService');

/**
 * Profile Routes - WhatsApp Business Profile Management
 * 
 * Aligns with WhatsApp Business API Profile features:
 * - Business information (about, description, address, email)
 * - Profile picture management
 * - Business category (vertical)
 * - Website links
 * - User account settings
 */

// ========================================
// USER PROFILE MANAGEMENT
// ========================================

// @route   GET /api/profile
// @desc    Get user profile (full details)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('welcomeMessageConfig.templateId', 'name category status language')
      .select('-password'); // Exclude password

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        welcomeMessageConfig: user.welcomeMessageConfig,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', [
  auth,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email.toLowerCase();
    }

    // Update fields
    if (name) user.name = name;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ========================================
// WHATSAPP BUSINESS PROFILE MANAGEMENT
// ========================================

// @route   GET /api/profile/whatsapp
// @desc    Get WhatsApp Business Profile information
// @access  Private
router.get('/whatsapp', auth, async (req, res) => {
  try {
    const result = await whatsappService.getBusinessProfile();
    
    if (result.success) {
      res.json({
        profile: result.data,
        message: 'WhatsApp Business Profile retrieved successfully'
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to get WhatsApp Business Profile',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Get WhatsApp profile error:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp Business Profile' });
  }
});

// @route   PUT /api/profile/whatsapp
// @desc    Update WhatsApp Business Profile information
// @access  Private
router.put('/whatsapp', [
  auth,
  body('about')
    .optional()
    .trim()
    .isLength({ max: 139 })
    .withMessage('About must be max 139 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 256 })
    .withMessage('Address must be max 256 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 512 })
    .withMessage('Description must be max 512 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('websites')
    .optional()
    .isArray()
    .withMessage('Websites must be an array'),
  body('websites.*')
    .optional()
    .isURL()
    .withMessage('Each website must be a valid URL'),
  body('vertical')
    .optional()
    .isIn([
      'UNDEFINED', 'OTHER', 'AUTO', 'BEAUTY', 'APPAREL', 'EDU', 'ENTERTAIN',
      'EVENT_PLAN', 'FINANCE', 'GROCERY', 'GOVT', 'HOTEL', 'HEALTH', 'NONPROFIT',
      'PROF_SERVICES', 'RETAIL', 'TRAVEL', 'RESTAURANT', 'NOT_A_BIZ'
    ])
    .withMessage('Invalid business vertical')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      about,
      address,
      description,
      email,
      websites,
      vertical
    } = req.body;

    // Build profile data object with only provided fields
    const profileData = {};
    if (about !== undefined) profileData.about = about;
    if (address !== undefined) profileData.address = address;
    if (description !== undefined) profileData.description = description;
    if (email !== undefined) profileData.email = email;
    if (websites !== undefined) profileData.websites = websites;
    if (vertical !== undefined) profileData.vertical = vertical;

    // Validate at least one field is provided
    if (Object.keys(profileData).length === 0) {
      return res.status(400).json({ 
        error: 'At least one field must be provided to update' 
      });
    }

    const result = await whatsappService.updateBusinessProfile(profileData);
    
    if (result.success) {
      res.json({
        message: 'WhatsApp Business Profile updated successfully',
        profile: profileData
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to update WhatsApp Business Profile',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Update WhatsApp profile error:', error);
    res.status(500).json({ error: 'Failed to update WhatsApp Business Profile' });
  }
});

// @route   POST /api/profile/whatsapp/photo
// @desc    Update WhatsApp Business Profile photo
// @access  Private
router.post('/whatsapp/photo', [
  auth,
  body('mediaId')
    .notEmpty()
    .withMessage('Media ID is required')
    .isString()
    .withMessage('Media ID must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { mediaId } = req.body;

    const result = await whatsappService.updateProfilePhoto(mediaId);
    
    if (result.success) {
      res.json({
        message: 'Profile photo updated successfully',
        data: result.data
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to update profile photo',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Update profile photo error:', error);
    res.status(500).json({ error: 'Failed to update profile photo' });
  }
});

// @route   DELETE /api/profile/whatsapp/photo
// @desc    Remove WhatsApp Business Profile photo
// @access  Private
router.delete('/whatsapp/photo', auth, async (req, res) => {
  try {
    // To remove profile photo, update with empty handle
    const result = await whatsappService.updateBusinessProfile({
      profile_picture_handle: ''
    });
    
    if (result.success) {
      res.json({
        message: 'Profile photo removed successfully'
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to remove profile photo',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Remove profile photo error:', error);
    res.status(500).json({ error: 'Failed to remove profile photo' });
  }
});

// ========================================
// BUSINESS HOURS MANAGEMENT (FEATURE 17)
// ========================================

// @route   GET /api/profile/whatsapp/business-hours
// @desc    Get business hours configuration
// @access  Private
router.get('/whatsapp/business-hours', auth, async (req, res) => {
  try {
    const result = await whatsappService.getBusinessHours();
    
    if (result.success) {
      res.json({
        businessHours: result.data,
        message: 'Business hours retrieved successfully'
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to get business hours',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Get business hours error:', error);
    res.status(500).json({ error: 'Failed to fetch business hours' });
  }
});

// @route   PUT /api/profile/whatsapp/business-hours
// @desc    Update business hours configuration
// @access  Private
router.put('/whatsapp/business-hours', [
  auth,
  body('businessHours')
    .notEmpty()
    .withMessage('Business hours configuration is required')
    .isObject()
    .withMessage('Business hours must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { businessHours } = req.body;

    // Validate structure
    const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    for (const day of validDays) {
      if (businessHours[day]) {
        const { open_time, close_time, is_open } = businessHours[day];
        
        if (typeof is_open !== 'boolean') {
          return res.status(400).json({ 
            error: `Invalid is_open value for ${day}. Must be boolean.` 
          });
        }

        if (is_open) {
          if (!open_time || !timeRegex.test(open_time)) {
            return res.status(400).json({ 
              error: `Invalid open_time for ${day}. Use HH:MM format (24-hour).` 
            });
          }
          if (!close_time || !timeRegex.test(close_time)) {
            return res.status(400).json({ 
              error: `Invalid close_time for ${day}. Use HH:MM format (24-hour).` 
            });
          }
        }
      }
    }

    const result = await whatsappService.updateBusinessHours(businessHours);
    
    if (result.success) {
      res.json({
        message: 'Business hours updated successfully',
        businessHours
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to update business hours',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Update business hours error:', error);
    res.status(500).json({ error: 'Failed to update business hours' });
  }
});

// ========================================
// BUSINESS VERTICALS REFERENCE
// ========================================

// @route   GET /api/profile/whatsapp/verticals
// @desc    Get list of available business verticals
// @access  Private
router.get('/whatsapp/verticals', auth, (req, res) => {
  const verticals = [
    { value: 'UNDEFINED', label: 'Undefined' },
    { value: 'OTHER', label: 'Other' },
    { value: 'AUTO', label: 'Automotive' },
    { value: 'BEAUTY', label: 'Beauty, Spa and Salon' },
    { value: 'APPAREL', label: 'Clothing and Apparel' },
    { value: 'EDU', label: 'Education' },
    { value: 'ENTERTAIN', label: 'Entertainment' },
    { value: 'EVENT_PLAN', label: 'Event Planning and Service' },
    { value: 'FINANCE', label: 'Finance and Banking' },
    { value: 'GROCERY', label: 'Grocery' },
    { value: 'GOVT', label: 'Government' },
    { value: 'HOTEL', label: 'Hotel and Lodging' },
    { value: 'HEALTH', label: 'Health' },
    { value: 'NONPROFIT', label: 'Non-profit' },
    { value: 'PROF_SERVICES', label: 'Professional Services' },
    { value: 'RETAIL', label: 'Shopping and Retail' },
    { value: 'TRAVEL', label: 'Travel and Transportation' },
    { value: 'RESTAURANT', label: 'Restaurant' },
    { value: 'NOT_A_BIZ', label: 'Not a Business' }
  ];

  res.json({ verticals });
});

// ========================================
// PROFILE SUMMARY & STATS
// ========================================

// @route   GET /api/profile/summary
// @desc    Get complete profile summary (user + WhatsApp business)
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    // Get user profile
    const user = await User.findById(req.userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get WhatsApp Business Profile
    const whatsappResult = await whatsappService.getBusinessProfile();

    // Get user statistics
    const Campaign = require('../models/Campaign');
    const Template = require('../models/Template');
    const Conversation = require('../models/Conversation');

    const [
      totalCampaigns,
      activeCampaigns,
      totalTemplates,
      approvedTemplates,
      totalConversations,
      activeConversations
    ] = await Promise.all([
      Campaign.countDocuments({ userId: req.userId }),
      Campaign.countDocuments({ userId: req.userId, status: 'active' }),
      Template.countDocuments({ userId: req.userId }),
      Template.countDocuments({ userId: req.userId, status: 'approved' }),
      Conversation.countDocuments({ userId: req.userId, isDeleted: false }),
      Conversation.countDocuments({ userId: req.userId, status: 'active', isDeleted: false })
    ]);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        memberSince: user.createdAt
      },
      whatsappProfile: whatsappResult.success ? whatsappResult.data : null,
      statistics: {
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns
        },
        templates: {
          total: totalTemplates,
          approved: approvedTemplates
        },
        conversations: {
          total: totalConversations,
          active: activeConversations
        }
      }
    });
  } catch (error) {
    console.error('Get profile summary error:', error);
    res.status(500).json({ error: 'Failed to fetch profile summary' });
  }
});

// ========================================
// ACCOUNT SETTINGS
// ========================================

// @route   PUT /api/profile/password
// @desc    Change user password
// @access  Private
router.put('/password', [
  auth,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// @route   DELETE /api/profile
// @desc    Delete user account (soft delete - deactivate)
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete: Deactivate account
    // Note: You may want to add an 'isActive' or 'deletedAt' field to User model
    // For now, we'll just return a message
    
    // TODO: Implement soft delete logic
    // user.isActive = false;
    // user.deletedAt = new Date();
    // await user.save();

    res.json({ 
      message: 'Account deletion requested. Please contact support to complete the process.',
      note: 'This will delete all your campaigns, templates, and conversations.'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
