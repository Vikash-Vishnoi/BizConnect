/**
 * Business Profile Settings Routes
 * @module routes/settings/businessProfileRoutes
 */

const express = require('express');
const router = express.Router();
const { Business } = require('../../../core/database/models');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const whatsappService = new WhatsAppService();
const multer = require('multer');
const path = require('path');
 
const maxFileSize = parseInt(process.env.PROFILE_PHOTO_MAX_SIZE_MB || '5') * 1024 * 1024;
const upload = multer({
  dest: path.join(__dirname, '../../uploads/profiles'),
  limits: { fileSize: maxFileSize }
});

// GET /business-profile - Get business profile settings
router.get('/business-profile', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.json({
      success: true,
      profile: business.profile || {}
    });
  } catch (error) {
    console.error('Error getting business profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get business profile',
      error: error.message
    });
  }
});

// PUT /business-profile - Update business profile settings
router.put('/business-profile', async (req, res) => {
  try {
    const { about, address, description, email, vertical, websites } = req.body;

    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (!business.profile) {
      business.profile = {};
    }

    if (about !== undefined) business.profile.about = about;
    if (address !== undefined) business.profile.address = address;
    if (description !== undefined) business.profile.description = description;
    if (email !== undefined) business.profile.email = email;
    if (vertical !== undefined) business.profile.vertical = vertical;
    if (websites !== undefined) business.profile.websites = websites;

    await business.save();

    res.json({
      success: true,
      message: 'Business profile updated successfully',
      profile: business.profile
    });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business profile',
      error: error.message
    });
  }
});

// POST /business-profile/photo - Upload business profile photo
router.post('/business-profile/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file uploaded'
      });
    }

    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const result = await whatsappService.uploadProfilePhoto(business, req.file.path);

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      result
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
      error: error.message
    });
  }
});

module.exports = router;
