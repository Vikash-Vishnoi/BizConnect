/**
 * Business CRUD Routes
 * @module routes/business/businessRoutes
 */

const express = require('express');
const router = express.Router();
const Business = require('../../../core/database/models/Business');
const User = require('../../../core/database/models/User');
const { auth } = require('../../../core/middlewares/auth');
const { requireBusinessAdmin, requireBusinessAccess, canModify } = require('../../../core/middlewares/userTypeAuth');
const { requireBusinessAdmin: requireBusinessAdminRBAC } = require('../../../core/middlewares/rbac');
const {  
  validateCreateBusiness, 
  validateUpdateBusiness, 
  validateBusinessId 
} = require('../../../core/middlewares/validation');
const { sendError } = require('../../../common/helpers/errorCodes');
const { successResponse, notFoundResponse, createdResponse } = require('../../../common/helpers/responseHelper');
const { sanitizePhoneNumber } = require('../../../common/helpers/phoneValidator');

// GET / - Get all businesses for current user
router.get('/', auth, async (req, res) => {
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
router.get('/:id', auth, validateBusinessId, async (req, res) => {
  try {
    console.log('🔍 GET /business/:id route hit');
    console.log('Params:', req.params);
    console.log('User:', { id: req.userId, userType: req.userType });
    console.log('User object:', req.user);
    
    const business = await Business.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('team.user', 'name email');
    
    if (!business) {
      return sendError(res, 'BUS_NOT_FOUND');
    }
    
    console.log('Business found:', { id: business._id, owner: business.owner?._id });
    
    if (!business.hasUser(req.userId)) {
      console.log('❌ User does not have access to this business');
      return sendError(res, 'AUTHZ_BUSINESS_ACCESS_DENIED');
    }
    
    console.log('✅ User has access to business');
    console.log('📦 Returning business data with keys:', Object.keys(business.toObject()));
    console.log('📦 whatsappConfig exists:', !!business.whatsappConfig);
    console.log('📦 whatsappConfig keys:', business.whatsappConfig ? Object.keys(business.whatsappConfig.toObject ? business.whatsappConfig.toObject() : business.whatsappConfig) : 'N/A');
    
    return successResponse(res, business, 'Business retrieved successfully');
  } catch (error) {
    console.error('Error fetching business:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message);
  }
});

// POST / - Create new business
// RBAC: Business Admin+ can create businesses
router.post('/', auth, requireBusinessAdminRBAC, validateCreateBusiness, async (req, res) => {
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
      console.log('  - Owner ID (user):', req.userId);
      console.log('  - Created:', existing.createdAt);
      
      // Check if the user owns this business
      if (existing.owner.toString() === req.userId.toString()) {
        console.log('✅ User owns this business - updating existing business');
        
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
        existing.setupStep = 3;
        
        await existing.save();
        
        // Update user's businessId if not set
        await User.findByIdAndUpdate(req.userId, {
          businessId: existing._id,
          userType: 'business_admin'
        });
        
        console.log('✅ Existing business updated successfully');
        
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
        
        return res.status(200).json({
          success: true,
          message: 'Business updated successfully',
          isExisting: true,
          data: { business: businessResponse },
          setupStatus: {
            setupStep: existing.setupStep,
            isFullyConfigured: existing.setupStep === 4
          }
        });
      } else {
        console.log('❌ Business exists but belongs to another user');
        return res.status(400).json({
          success: false,
          error: 'A business with this WhatsApp Phone Number ID already exists and belongs to another user'
        });
      }
    }
    
    console.log('✅ Step 4: Creating business object...');
    
    // Sanitize phone number (remove spaces and formatting)
    const sanitizedPhoneNumber = whatsappConfig.phoneNumber 
      ? sanitizePhoneNumber(whatsappConfig.phoneNumber)
      : '';
    
    console.log('📞 Phone number sanitized:', {
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
      setupStep: 3  // Part 2 complete, next step is Part 3 (webhook)
    });
    
    console.log('✅ Step 5: Business object created with setupStep=3 (next: webhook), attempting to save...');
    
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
router.put('/:id', auth, requireBusinessAccess, canModify('settings'), async (req, res) => {
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
router.post('/:id/switch', auth, async (req, res) => {
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

// POST /:id/webhook/complete - Mark webhook setup as complete (Part 3)
router.post('/:id/webhook/complete', auth, requireBusinessAccess, async (req, res) => {
  try {
    console.log('📝 Complete webhook setup request received');
    console.log('Business ID:', req.params.id);
    console.log('User ID:', req.userId);
    
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    // Verify user has access to this business
    if (!business.hasUser(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this business'
      });
    }
    
    // Mark webhook as configured and setup complete
    business.whatsappConfig.webhookConfigured = true;
    business.whatsappConfig.webhookConfiguredAt = new Date();
    business.setupStep = 4;  // Mark setup as complete
    await business.save();
    
    console.log('✅ Marked webhookConfigured and setupStep=4 (complete)');
    
    res.json({
      success: true,
      message: 'Webhook setup completed successfully',
      data: {
        business: {
          _id: business._id,
          name: business.name,
          setupStep: business.setupStep,
          webhookConfigured: business.whatsappConfig.webhookConfigured
        }
      }
    });
  } catch (error) {
    console.error('Error completing webhook setup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete webhook setup'
    });
  }
});

module.exports = router;

