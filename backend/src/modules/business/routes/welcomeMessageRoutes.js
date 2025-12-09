/**
 * Welcome Message Settings Routes
 * @module routes/settings/welcomeMessageRoutes
 */

const express = require('express');
const router = express.Router();
const { Business } = require('../../../core/database/models');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const whatsappService = new WhatsAppService();

// GET /welcome-message - Get welcome message settings
router.get('/welcome-message', async (req, res) => {
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
      welcomeMessage: business.settings?.welcomeMessage || {
        enabled: false,
        message: ''
      }
    });
  } catch (error) {
    console.error('Error getting welcome message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get welcome message',
      error: error.message
    });
  }
});

// PUT /welcome-message - Update welcome message settings
router.put('/welcome-message', async (req, res) => {
  try {
    const { enabled, message, delay, conditions } = req.body;

    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (!business.settings) {
      business.settings = {};
    }

    business.settings.welcomeMessage = {
      enabled: enabled !== undefined ? enabled : business.settings.welcomeMessage?.enabled || false,
      message: message !== undefined ? message : business.settings.welcomeMessage?.message || '',
      delay: delay !== undefined ? delay : business.settings.welcomeMessage?.delay || 0,
      conditions: conditions !== undefined ? conditions : business.settings.welcomeMessage?.conditions || {}
    };

    await business.save();

    res.json({
      success: true,
      message: 'Welcome message updated successfully',
      welcomeMessage: business.settings.welcomeMessage
    });
  } catch (error) {
    console.error('Error updating welcome message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update welcome message',
      error: error.message
    });
  }
});

// GET /welcome-message/templates - Get welcome message templates
router.get('/welcome-message/templates', async (req, res) => {
  try {
    const templates = [
      { id: 1, name: 'Professional', message: 'Hello! Thank you for contacting us. How can we help you today?' },
      { id: 2, name: 'Friendly', message: 'Hey there! 👋 Thanks for reaching out. What can we do for you?' },
      { id: 3, name: 'Formal', message: 'Good day. Thank you for your inquiry. Please let us know how we may assist you.' }
    ];

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get templates',
      error: error.message
    });
  }
});

// POST /welcome-message/test - Test welcome message
router.post('/welcome-message/test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    await whatsappService.sendMessage(business, phoneNumber, { text: message });

    res.json({
      success: true,
      message: 'Test message sent successfully'
    });
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test message',
      error: error.message
    });
  }
});

module.exports = router;
