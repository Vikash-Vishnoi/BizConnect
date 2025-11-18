const express = require('express');
const router = express.Router();
const Business = require('../models/Business');
const User = require('../models/User');
const { auth, isAdmin } = require('../middleware/auth');

// @route   GET /api/business
// @desc    Get all businesses for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const businesses = await Business.findByUser(req.userId)
      .populate('owner', 'name email')
      .populate('team.user', 'name email');
    
    res.json({
      success: true,
      count: businesses.length,
      data: businesses
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch businesses'
    });
  }
});

// @route   GET /api/business/:id
// @desc    Get single business
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('team.user', 'name email')
      .populate('team.addedBy', 'name email');
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Check if user has access
    if (!business.hasUser(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: business
    });
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business'
    });
  }
});

// @route   POST /api/business
// @desc    Create new business
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      industry,
      website,
      whatsappConfig,
      profile
    } = req.body;
    
    // Validate required fields
    if (!name || !whatsappConfig?.phoneNumberId || !whatsappConfig?.accessToken || 
        !whatsappConfig?.wabaId || !whatsappConfig?.appSecret) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, phoneNumberId, accessToken, wabaId, appSecret'
      });
    }
    
    // Check if phone number ID already exists
    const existing = await Business.findOne({
      'whatsappConfig.phoneNumberId': whatsappConfig.phoneNumberId
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A business with this WhatsApp Phone Number ID already exists'
      });
    }
    
    // Create business
    const business = await Business.create({
      name,
      displayName: displayName || name,
      description,
      industry,
      website,
      whatsappConfig: {
        phoneNumberId: whatsappConfig.phoneNumberId,
        phoneNumber: whatsappConfig.phoneNumber || '',
        wabaId: whatsappConfig.wabaId,
        accessToken: whatsappConfig.accessToken,
        systemUserToken: whatsappConfig.systemUserToken,
        appSecret: whatsappConfig.appSecret,
        verifyToken: whatsappConfig.verifyToken,
        apiVersion: whatsappConfig.apiVersion || 'v22.0'
      },
      profile: profile || {},
      owner: req.userId,
      team: []
    });
    
    // Add business to user's businesses array
    await User.findByIdAndUpdate(req.userId, {
      $push: {
        businesses: {
          businessId: business._id,
          role: 'owner',
          joinedAt: new Date()
        }
      },
      $set: {
        currentBusiness: business._id
      }
    });
    
    res.status(201).json({
      success: true,
      data: business,
      message: 'Business created successfully'
    });
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create business'
    });
  }
});

// @route   PUT /api/business/:id
// @desc    Update business
// @access  Private (Owner/Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Check permission
    const role = business.getUserRole(req.userId);
    if (!['owner', 'admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Only owners and admins can update business settings'
      });
    }
    
    const {
      name,
      displayName,
      description,
      industry,
      website,
      logo,
      profile,
      settings
    } = req.body;
    
    // Update fields
    if (name) business.name = name;
    if (displayName) business.displayName = displayName;
    if (description !== undefined) business.description = description;
    if (industry) business.industry = industry;
    if (website) business.website = website;
    if (logo) business.logo = logo;
    if (profile) business.profile = { ...business.profile, ...profile };
    if (settings) business.settings = { ...business.settings, ...settings };
    
    await business.save();
    
    res.json({
      success: true,
      data: business,
      message: 'Business updated successfully'
    });
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update business'
    });
  }
});

// @route   PUT /api/business/:id/credentials
// @desc    Update WhatsApp credentials
// @access  Private (Owner only)
router.put('/:id/credentials', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .select('+whatsappConfig.accessToken +whatsappConfig.systemUserToken +whatsappConfig.appSecret');
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Only owner can update credentials
    if (business.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only business owner can update credentials'
      });
    }
    
    const { accessToken, systemUserToken, appSecret, verifyToken, apiVersion } = req.body;
    
    if (accessToken) business.whatsappConfig.accessToken = accessToken;
    if (systemUserToken) business.whatsappConfig.systemUserToken = systemUserToken;
    if (appSecret) business.whatsappConfig.appSecret = appSecret;
    if (verifyToken) business.whatsappConfig.verifyToken = verifyToken;
    if (apiVersion) business.whatsappConfig.apiVersion = apiVersion;
    
    business.whatsappConfig.tokenLastRefreshedAt = new Date();
    
    await business.save();
    
    res.json({
      success: true,
      message: 'Credentials updated successfully'
    });
  } catch (error) {
    console.error('Error updating credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update credentials'
    });
  }
});

// @route   DELETE /api/business/:id
// @desc    Delete business (soft delete)
// @access  Private (Owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Only owner can delete
    if (business.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only business owner can delete the business'
      });
    }
    
    business.status = 'deleted';
    business.isDeleted = true;
    business.deletedAt = new Date();
    business.deletedBy = req.userId;
    await business.save();
    
    // Remove from all users' businesses array
    await User.updateMany(
      { 'businesses.businessId': business._id },
      { $pull: { businesses: { businessId: business._id } } }
    );
    
    res.json({
      success: true,
      message: 'Business deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete business'
    });
  }
});

// @route   POST /api/business/:id/team
// @desc    Add team member
// @access  Private (Owner/Admin only)
router.post('/:id/team', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Check permission
    if (!business.hasPermission(req.userId, 'manage_team')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to manage team'
      });
    }
    
    const { userId, email, role, permissions } = req.body;
    
    let targetUser;
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase() });
    }
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Add to business team
    await business.addTeamMember(
      targetUser._id,
      role || 'agent',
      permissions || [],
      req.userId
    );
    
    // Add business to user's businesses array
    await User.findByIdAndUpdate(targetUser._id, {
      $push: {
        businesses: {
          businessId: business._id,
          role: role || 'agent',
          joinedAt: new Date()
        }
      }
    });
    
    res.json({
      success: true,
      message: 'Team member added successfully',
      data: business
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add team member'
    });
  }
});

// @route   PUT /api/business/:id/team/:userId
// @desc    Update team member role
// @access  Private (Owner/Admin only)
router.put('/:id/team/:userId', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Check permission
    if (!business.hasPermission(req.userId, 'manage_team')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to manage team'
      });
    }
    
    const { role, permissions } = req.body;
    
    await business.updateTeamMemberRole(req.params.userId, role, permissions);
    
    // Update in user's businesses array
    await User.updateOne(
      {
        _id: req.params.userId,
        'businesses.businessId': business._id
      },
      {
        $set: {
          'businesses.$.role': role
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Team member updated successfully',
      data: business
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update team member'
    });
  }
});

// @route   DELETE /api/business/:id/team/:userId
// @desc    Remove team member
// @access  Private (Owner/Admin only)
router.delete('/:id/team/:userId', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Check permission
    if (!business.hasPermission(req.userId, 'manage_team')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to manage team'
      });
    }
    
    // Can't remove owner
    if (business.owner.toString() === req.params.userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove business owner'
      });
    }
    
    await business.removeTeamMember(req.params.userId);
    
    // Remove from user's businesses array
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: {
        businesses: { businessId: business._id }
      }
    });
    
    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove team member'
    });
  }
});

// @route   POST /api/business/:id/switch
// @desc    Switch current business context
// @access  Private
router.post('/:id/switch', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Check if user has access
    if (!business.hasUser(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Update user's current business
    await User.findByIdAndUpdate(req.userId, {
      currentBusiness: business._id
    });
    
    res.json({
      success: true,
      message: 'Business context switched',
      data: {
        businessId: business._id,
        name: business.name
      }
    });
  } catch (error) {
    console.error('Error switching business:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch business'
    });
  }
});

// @route   GET /api/business/:id/health
// @desc    Check business API health
// @access  Private
router.get('/:id/health', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Check if user has access
    if (!business.hasUser(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Get credentials and make a test API call
    const credentials = await business.getWhatsAppCredentials();
    const axios = require('axios');
    
    try {
      const response = await axios.get(
        `https://graph.facebook.com/${credentials.apiVersion}/${credentials.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`
          }
        }
      );
      
      await business.updateHealth({
        apiStatus: 'healthy',
        phoneNumberStatus: 'connected',
        qualityRating: response.data.quality_rating || 'UNKNOWN',
        messagingLimit: response.data.messaging_limit_tier || 'UNKNOWN'
      });
      
      res.json({
        success: true,
        health: business.health,
        phoneInfo: response.data
      });
    } catch (apiError) {
      await business.recordError(apiError);
      
      res.status(500).json({
        success: false,
        error: 'WhatsApp API connection failed',
        details: apiError.response?.data || apiError.message
      });
    }
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check business health'
    });
  }
});

// @route   GET /api/business/:id/usage
// @desc    Get business usage statistics
// @access  Private
router.get('/:id/usage', auth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Check if user has access
    if (!business.hasUser(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const limits = business.checkUsageLimits();
    
    res.json({
      success: true,
      usage: business.usage,
      limits: limits,
      settings: business.settings.rateLimits
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics'
    });
  }
});

module.exports = router;
