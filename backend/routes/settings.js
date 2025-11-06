const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Template = require('../models/Template');
const { auth } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

// @route   GET /api/settings/welcome-message
// @desc    Get user's welcome message configuration
// @access  Private
router.get('/welcome-message', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('welcomeMessageConfig.templateId', 'name category status language components')
      .select('welcomeMessageConfig');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      config: user.welcomeMessageConfig || {
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
// @desc    Update user's welcome message configuration
// @access  Private
router.put('/welcome-message', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
        userId: req.userId,
        status: 'approved'
      });

      if (!template) {
        return res.status(400).json({ 
          error: 'Template not found or not approved. Please select an approved template.' 
        });
      }
    }

    // Update configuration
    if (!user.welcomeMessageConfig) {
      user.welcomeMessageConfig = {};
    }

    if (enabled !== undefined) user.welcomeMessageConfig.enabled = enabled;
    if (strategy) user.welcomeMessageConfig.strategy = strategy;
    if (templateId !== undefined) user.welcomeMessageConfig.templateId = templateId;
    if (textMessage) user.welcomeMessageConfig.textMessage = textMessage;
    if (delay !== undefined) user.welcomeMessageConfig.delay = Math.max(0, Math.min(60000, delay));
    if (businessHoursEnabled !== undefined) user.welcomeMessageConfig.businessHoursEnabled = businessHoursEnabled;
    if (businessHours) user.welcomeMessageConfig.businessHours = businessHours;
    if (outsideHoursMessage) user.welcomeMessageConfig.outsideHoursMessage = outsideHoursMessage;

    await user.save();

    // Populate template for response
    await user.populate('welcomeMessageConfig.templateId', 'name category status language components');

    res.json({
      message: 'Welcome message configuration updated successfully',
      config: user.welcomeMessageConfig
    });
  } catch (error) {
    console.error('Update welcome message config error:', error);
    res.status(500).json({ error: 'Failed to update welcome message configuration' });
  }
});

// @route   GET /api/settings/welcome-message/templates
// @desc    Get approved templates suitable for welcome messages
// @access  Private
router.get('/welcome-message/templates', auth, async (req, res) => {
  try {
    const templates = await Template.find({
      userId: req.userId,
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
router.post('/welcome-message/test', auth, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const user = await User.findById(req.userId)
      .populate('welcomeMessageConfig.templateId');

    if (!user || !user.welcomeMessageConfig || !user.welcomeMessageConfig.enabled) {
      return res.status(400).json({ error: 'Welcome message is not enabled' });
    }

    const whatsappService = require('../services/whatsappService');
    const config = user.welcomeMessageConfig;

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
router.get('/business-profile', auth, async (req, res) => {
  try {
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
router.put('/business-profile', auth, async (req, res) => {
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
router.post('/business-profile/photo', auth, async (req, res) => {
  try {
    const { mediaId } = req.body;

    if (!mediaId) {
      return res.status(400).json({ error: 'Media ID is required' });
    }

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
router.get('/account-limits', auth, async (req, res) => {
  try {
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
router.get('/messaging-limits', auth, async (req, res) => {
  try {
    const Conversation = require('../models/Conversation');
    
    // Get account tier limits from WhatsApp
    const limitsResult = await whatsappService.getAccountLimits();
    
    if (!limitsResult.success) {
      return res.status(400).json({ error: limitsResult.error });
    }

    // Calculate today's message count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const conversations = await Conversation.find({
      userId: req.userId,
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
      userId: req.userId,
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

module.exports = router;
