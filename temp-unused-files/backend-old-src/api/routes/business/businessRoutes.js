/**
 * Business CRUD Routes
 * @module routes/business/businessRoutes
 */

const express = require('express');
const router = express.Router();
const Business = require('../../../database/models/Business');
const User = require('../../../database/models/User');
const { requireBusinessAdmin, requireBusinessAccess, canModify } = require('../../../api/middlewares/userTypeAuth');
const { requireBusinessAdmin: requireBusinessAdminRBAC } = require('../../../api/middlewares/rbac');
const {  
  validateCreateBusiness, 
  validateUpdateBusiness, 
  validateBusinessId 
} = require('../../../api/middlewares/validation');
const { sendError } = require('../../../utils/helpers/errorCodes');
const { successResponse, notFoundResponse, createdResponse } = require('../../../utils/helpers/responseHelper');

// GET / - Get all businesses for current user
router.get('/', async (req, res) => {
  try {
    const businesses = await Business.find({
      $or: [
        { owner: req.userId },
        { 'team.user': req.userId }
      ],
      status: 'active',
      isDeleted: false
    })
      .populate('owner', 'name email')
      .populate('team.user', 'name email')
      .sort({ createdAt: -1 });
    
    return successResponse(res, { businesses, count: businesses.length }, 'Businesses retrieved successfully');
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message);
  }
});

// GET /:id - Get single business
router.get('/:id', validateBusinessId, async (req, res) => {
  try {
    console.log('🔍 GET /business/:id route hit');
    console.log('Params:', req.params);
    console.log('User:', { id: req.userId, userType: req.userType });
    console.log('User object:', req.user);
    
    const business = await Business.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('team.user', 'name email')
      .populate('team.addedBy', 'name email');
    
    if (!business) {
      return sendError(res, 'BUS_NOT_FOUND');
    }
    
    console.log('Business found:', { id: business._id, owner: business.owner?._id });
    
    if (!business.hasUser(req.userId)) {
      console.log('❌ User does not have access to this business');
      return sendError(res, 'AUTHZ_BUSINESS_ACCESS_DENIED');
    }
    
    console.log('✅ User has access to business');
    return successResponse(res, business, 'Business retrieved successfully');
  } catch (error) {
    console.error('Error fetching business:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message);
  }
});

// POST / - Create new business
// RBAC: Business Admin+ can create businesses
router.post('/', requireBusinessAdminRBAC, validateCreateBusiness, async (req, res) => {
  try {
    console.log('📝 Create business request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID:', req.userId);
    
    const {
      name,
      displayName,
      description,
      industry,
      website,
      whatsappConfig,
      profile
    } = req.body;
    
    console.log('✅ Step 1: Data extracted from request');
    
    if (!name || !whatsappConfig?.phoneNumberId || !whatsappConfig?.accessToken || 
        !whatsappConfig?.wabaId || !whatsappConfig?.appSecret) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    console.log('✅ Step 2: Required fields validated');
    
    console.log('🔍 Searching for existing business with phoneNumberId:', whatsappConfig.phoneNumberId);
    
    const existing = await Business.findOne({
      'whatsappConfig.phoneNumberId': whatsappConfig.phoneNumberId
    });
    
    console.log('✅ Step 3: Checked for existing business:', existing ? 'Found' : 'Not found');
    
    if (existing) {
      console.log('📋 Existing business details:');
      console.log('  - Business ID:', existing._id);
      console.log('  - Business Name:', existing.name);
      console.log('  - Owner:', existing.owner);
      console.log('  - Created:', existing.createdAt);
      console.log('❌ Business with this phone number already exists');
      return res.status(400).json({
        success: false,
        error: 'A business with this WhatsApp Phone Number ID already exists'
      });
    }
    
    console.log('✅ Step 4: Creating business object...');
    
    const business = new Business({
      name,
      displayName: displayName || name,
      description,
      industry,
      website,
      owner: req.userId,
      whatsappConfig: {
        ...whatsappConfig,
        phoneNumber: whatsappConfig.phoneNumber || '',
        displayName: whatsappConfig.displayName || name,
      },
      profile: profile || {}
    });
    
    console.log('✅ Step 5: Business object created, attempting to save...');
    
    await business.save();
    
    console.log('✅ Step 6: Business saved successfully, ID:', business._id);
    
    await User.findByIdAndUpdate(req.userId, {
      businessId: business._id,
      userType: 'business_admin'
    });
    
    console.log('✅ Step 7: User updated with business ID');
    
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
    
    res.status(201).json({
      success: true,
      message: 'Business created successfully',
      data: { business: businessResponse }
    });
  } catch (error) {
    console.error('❌ Error creating business:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create business',
      details: error.message
    });
  }
});

// PUT /:id - Update business settings
router.put('/:id', requireBusinessAccess, canModify('settings'), async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    if (!req.user.hasPermission('manage', 'settings')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to manage business settings'
      });
    }
    
    const { name, displayName, description, industry, website, profile, settings } = req.body;
    
    if (name) business.name = name;
    if (displayName) business.displayName = displayName;
    if (description) business.description = description;
    if (industry) business.industry = industry;
    if (website) business.website = website;
    if (profile) business.profile = { ...business.profile, ...profile };
    if (settings) business.settings = { ...business.settings, ...settings };
    
    await business.save();
    
    res.json({
      success: true,
      message: 'Business updated successfully',
      data: business
    });
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update business'
    });
  }
});

// POST /:id/switch - Switch active business
router.post('/:id/switch', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    if (req.user.userType !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admins can switch between businesses'
      });
    }
    
    await User.findByIdAndUpdate(req.userId, {
      businessId: business._id
    });
    
    res.json({
      success: true,
      message: 'Switched to business successfully',
      data: business
    });
  } catch (error) {
    console.error('Error switching business:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch business'
    });
  }
});

module.exports = router;
