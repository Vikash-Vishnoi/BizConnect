const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Business = require('../models/Business');
const Template = require('../models/Template');
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const WhatsAppService = require('../services/whatsappService');

// @route   GET /api/settings/welcome-message
// @desc    Get business welcome message configuration
// @access  Private
router.get('/welcome-message', auth, requireBusiness, requireBusinessPermission('manage_settings'), async (req, res) => {
  try {
    const business = await Business.findById(req.businessId)
      .populate('welcomeMessageConfig.templateId', 'name category status language components')
      .select('welcomeMessageConfig');

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({
      config: business.welcomeMessageConfig || {
        enabled: true,
        strategy: 'template',
        templateId: null,
        textMessage: 'Hello! 👋 Thank you for contacting us. We\'ve received your message and will respond shortly.',
        delay: 2000,
        businessHoursEnabled: false,
        businessHours: {},
        outsideHoursMessage: 'Hello! 👋 Thank you for contacting us. We\'re currently outside business hours but will respond when we\'re back.'
      }
    });
  } catch (error) {
    console.error('Get welcome message config error:', error);
    res.status(500).json({ error: 'Failed to get welcome message configuration' });
  }
});

// @route   PUT /api/settings/welcome-message
// @desc    Update business welcome message configuration
// @access  Private
router.put('/welcome-message', auth, requireBusiness, requireBusinessPermission('manage_settings'), async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const {
      enabled,
      strategy,
      templateId,
      textMessage,
      delay,
      businessHoursEnabled,
      businessHours,
      outsideHoursMessage
    } = req.body;

    // Validate template if provided
    if (templateId) {
      const template = await Template.findOne({
        _id: templateId,
        businessId: req.businessId,
        status: 'approved'
      });

      if (!template) {
        return res.status(400).json({ 
          error: 'Template not found or not approved. Please select an approved template.' 
        });
      }
    }

    // Update configuration
    if (!business.welcomeMessageConfig) {
      business.welcomeMessageConfig = {};
    }

    if (enabled !== undefined) business.welcomeMessageConfig.enabled = enabled;
    if (strategy) business.welcomeMessageConfig.strategy = strategy;
    if (templateId !== undefined) business.welcomeMessageConfig.templateId = templateId;
    if (textMessage) business.welcomeMessageConfig.textMessage = textMessage;
    if (delay !== undefined) business.welcomeMessageConfig.delay = Math.max(0, Math.min(60000, delay));
    if (businessHoursEnabled !== undefined) business.welcomeMessageConfig.businessHoursEnabled = businessHoursEnabled;
    if (businessHours) business.welcomeMessageConfig.businessHours = businessHours;
    if (outsideHoursMessage) business.welcomeMessageConfig.outsideHoursMessage = outsideHoursMessage;

    await business.save();

    // Populate template for response
    await business.populate('welcomeMessageConfig.templateId', 'name category status language components');

    res.json({
      message: 'Welcome message configuration updated successfully',
      config: business.welcomeMessageConfig
    });
  } catch (error) {
    console.error('Update welcome message config error:', error);
    res.status(500).json({ error: 'Failed to update welcome message configuration' });
  }
});

// @route   GET /api/settings/welcome-message/templates
// @desc    Get approved templates suitable for welcome messages
// @access  Private
router.get('/welcome-message/templates', auth, requireBusiness, requireBusinessPermission('manage_settings'), async (req, res) => {
  try {
    const templates = await Template.find({
      businessId: req.businessId,
      status: 'approved',
      category: { $in: ['UTILITY', 'MARKETING'] }
    })
    .select('name category language components status')
    .sort({ createdAt: -1 });

    res.json({ templates });
  } catch (error) {
    console.error('Get welcome templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// @route   POST /api/settings/welcome-message/test
// @desc    Test welcome message configuration
// @access  Private
router.post('/welcome-message/test', auth, requireBusiness, requireBusinessPermission('manage_settings'), async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const business = await Business.findById(req.businessId)
      .populate('welcomeMessageConfig.templateId');

    if (!business || !business.welcomeMessageConfig || !business.welcomeMessageConfig.enabled) {
      return res.status(400).json({ error: 'Welcome message is not enabled' });
    }

    // Use business credentials
    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    const config = business.welcomeMessageConfig;

    let result;

    if (config.strategy === 'template' && config.templateId) {
      const template = config.templateId;
      result = await whatsappService.sendTemplateMessage(
        phoneNumber,
        template.name,
        template.language || 'en'
      );
    } else {
      result = await whatsappService.sendTextMessage(
        phoneNumber,
        config.textMessage
      );
    }

    if (result.success) {
      res.json({
        success: true,
        message: 'Test message sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to send test message',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Test welcome message error:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

// ===== Business Profile API Routes =====

// @route   GET /api/settings/business-profile
// @desc    Get WhatsApp business profile information
// @access  Private
router.get('/business-profile', auth, requireBusiness, requireBusinessPermission('manage_settings'), async (req, res) => {
  try {
    // Use business credentials
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.getBusinessProfile();
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Get business profile error:', error);
    res.status(500).json({ error: 'Failed to get business profile' });
  }
});

// @route   PUT /api/settings/business-profile
// @desc    Update WhatsApp business profile information
// @access  Private
router.put('/business-profile', auth, requireBusiness, requireBusinessPermission('manage_settings'), async (req, res) => {
  try {
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

    // Use business credentials
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.updateBusinessProfile(profileData);
    
    if (result.success) {
      res.json({
        message: 'Business profile updated successfully',
        data: result.data
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Update business profile error:', error);
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

// @route   POST /api/settings/business-profile/photo
// @desc    Update business profile photo
// @access  Private
router.post('/business-profile/photo', auth, requireBusiness, requireBusinessPermission('manage_settings'), async (req, res) => {
  try {
    const { mediaId } = req.body;

    if (!mediaId) {
      return res.status(400).json({ error: 'Media ID is required' });
    }

    // Use business credentials
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.updateProfilePhoto(mediaId);
    
    if (result.success) {
      res.json({
        message: 'Profile photo updated successfully',
        data: result.data
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Update profile photo error:', error);
    res.status(500).json({ error: 'Failed to update profile photo' });
  }
});

// ===== Account Limits API Routes =====

// @route   GET /api/settings/account-limits
// @desc    Get WhatsApp Business account limits and tier information
// @access  Private
router.get('/account-limits', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    // Use business credentials
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.getAccountLimits();
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Get account limits error:', error);
    res.status(500).json({ error: 'Failed to get account limits' });
  }
});

// @route   GET /api/settings/messaging-limits
// @desc    Get current messaging limits and usage statistics
// @access  Private
router.get('/messaging-limits', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const Conversation = require('../models/Conversation');
    
    // Get account tier limits from WhatsApp using business credentials
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const limitsResult = await whatsappService.getAccountLimits();
    
    if (!limitsResult.success) {
      return res.status(400).json({ error: limitsResult.error });
    }

    // Calculate today's message count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const conversations = await Conversation.find({
      businessId: req.businessId,
      'messages.timestamp': { $gte: today }
    }).select('messages');

    let todayCount = 0;
    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.direction === 'outgoing' && 
            msg.timestamp >= today &&
            msg.type !== 'reaction') {
          todayCount++;
        }
      });
    });

    // Calculate this week's count (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekConversations = await Conversation.find({
      businessId: req.businessId,
      'messages.timestamp': { $gte: weekAgo }
    }).select('messages');

    let weekCount = 0;
    weekConversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.direction === 'outgoing' && 
            msg.timestamp >= weekAgo &&
            msg.type !== 'reaction') {
          weekCount++;
        }
      });
    });

    res.json({
      limits: limitsResult.data,
      usage: {
        today: todayCount,
        week: weekCount,
        todayPercentage: limitsResult.data.messagingLimit ? 
          Math.round((todayCount / limitsResult.data.messagingLimit) * 100) : 0,
        weekAverage: Math.round(weekCount / 7)
      }
    });
  } catch (error) {
    console.error('Get messaging limits error:', error);
    res.status(500).json({ error: 'Failed to get messaging limits' });
  }
});

// @route   GET /api/settings/quality-rating/history
// @desc    Get quality rating history for the business
// @access  Private
router.get('/quality-rating/history', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const QualityRating = require('../models/QualityRating');
    const { startDate, endDate, limit = 100 } = req.query;

    // Build query
    const query = { businessId: req.businessId };

    // Add date filters if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Fetch history
    const history = await QualityRating.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    // Get trend analysis
    const trend = await QualityRating.getRatingTrend(req.userId, 7);

    // Calculate statistics
    const stats = {
      total: history.length,
      trend,
      currentRating: history.length > 0 ? history[0].rating : 'UNKNOWN',
      lastChecked: history.length > 0 ? history[0].timestamp : null
    };

    // Count rating distribution
    const distribution = history.reduce((acc, record) => {
      acc[record.rating] = (acc[record.rating] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      history,
      stats,
      distribution
    });
  } catch (error) {
    console.error('Get quality rating history error:', error);
    res.status(500).json({ error: 'Failed to get quality rating history' });
  }
});

// @route   POST /api/settings/quality-rating/check
// @desc    Manually trigger a quality rating check
// @access  Private
router.post('/quality-rating/check', auth, requireBusiness, requireBusinessPermission('manage_settings'), async (req, res) => {
  try {
    const QualityRating = require('../models/QualityRating');

    // Use business credentials
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Fetch current quality rating from WhatsApp
    const ratingResult = await whatsappService.getQualityRating();
    
    if (!ratingResult.success) {
      return res.status(500).json({ error: 'Failed to fetch quality rating from WhatsApp' });
    }

    // Check if rating changed
    const hasChanged = await QualityRating.hasRatingChanged(req.businessId, ratingResult.rating);

    // Get account limits for additional context
    const limitsResult = await whatsappService.getAccountLimits();

    // Save to database
    const qualityRecord = new QualityRating({
      businessId: req.businessId,
      phoneNumberId: credentials.phoneNumberId,
      rating: ratingResult.rating,
      tier: limitsResult.tier || 'TIER_1K',
      messagingLimit: limitsResult.messagingLimit || 1000,
      nameStatus: limitsResult.nameStatus || 'UNKNOWN',
      codeVerificationStatus: limitsResult.codeVerificationStatus || 'UNKNOWN',
      metadata: {
        source: 'manual_check',
        hasChanged
      }
    });

    await qualityRecord.save();

    res.json({
      success: true,
      rating: ratingResult.rating,
      hasChanged,
      record: qualityRecord
    });
  } catch (error) {
    console.error('Manual quality rating check error:', error);
    res.status(500).json({ error: 'Failed to check quality rating' });
  }
});

module.exports = router;
