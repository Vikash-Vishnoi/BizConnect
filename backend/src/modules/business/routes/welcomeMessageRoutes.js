/**
 * Welcome Message Settings Routes
 * @module routes/settings/welcomeMessageRoutes
 */

const express = require('express');
const router = express.Router();
const { Business } = require('../../../core/database/models');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { asyncHandler, NotFoundError, ValidationError, ConflictError } = require('../../../core/middlewares/errorHandler');
const logger = require('../../../common/helpers/logger');
const { validateBusiness } = require('../../../common/utils/validators');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_WELCOME_MESSAGE = {
  enabled: false,
  message: '',
  delay: 0,
  conditions: {}
};

const WELCOME_MESSAGE_TEMPLATES = [
  { id: 1, name: 'Professional', message: 'Hello! Thank you for contacting us. How can we help you today?' },
  { id: 2, name: 'Friendly', message: 'Hey there! 👋 Thanks for reaching out. What can we do for you?' },
  { id: 3, name: 'Formal', message: 'Good day. Thank you for your inquiry. Please let us know how we may assist you.' }
];

const ERROR_MESSAGES = {
  PHONE_AND_MESSAGE_REQUIRED: 'Phone number and message are required'
};

// GET /welcome-message - Get welcome message settings
router.get('/welcome-message', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await validateBusiness(req.businessId);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        welcomeMessage: business.settings?.welcomeMessage || DEFAULT_WELCOME_MESSAGE
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    
    logger.error('Error getting welcome message', {
      error: error.message,
      businessId: req.businessId,
      processingTime
    });
    throw error;
  }
});

// PUT /welcome-message - Update welcome message settings
router.put('/welcome-message', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { enabled, message, delay, conditions } = req.body;

    const business = await validateBusiness(req.businessId);

    if (!business.settings) {
      business.settings = {};
    }

    business.settings.welcomeMessage = {
      enabled: enabled !== undefined ? enabled : business.settings.welcomeMessage?.enabled || DEFAULT_WELCOME_MESSAGE.enabled,
      message: message !== undefined ? message : business.settings.welcomeMessage?.message || DEFAULT_WELCOME_MESSAGE.message,
      delay: delay !== undefined ? delay : business.settings.welcomeMessage?.delay || DEFAULT_WELCOME_MESSAGE.delay,
      conditions: conditions !== undefined ? conditions : business.settings.welcomeMessage?.conditions || DEFAULT_WELCOME_MESSAGE.conditions
    };

    await business.save();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        welcomeMessage: business.settings.welcomeMessage
      },
      message: 'Welcome message updated successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    
    logger.error('Error updating welcome message', {
      error: error.message,
      businessId: req.businessId,
      processingTime
    });
    throw error;
  }
});

// GET /welcome-message/templates - Get welcome message templates
router.get('/welcome-message/templates', async (req, res) => {
  const startTime = Date.now();
  try {
    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { templates: WELCOME_MESSAGE_TEMPLATES },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Error getting welcome message templates', {
      error: error.message,
      processingTime
    });
    throw error;
  }
});

// POST /welcome-message/test - Test welcome message
router.post('/welcome-message/test', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      throw new ValidationError(ERROR_MESSAGES.PHONE_AND_MESSAGE_REQUIRED);
    }

    const business = await validateBusiness(req.businessId);

    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    await whatsappService.sendMessage(business, phoneNumber, { text: message });

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: null,
      message: 'Test message sent successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    
    logger.error('Error sending test welcome message', {
      error: error.message,
      businessId: req.businessId,
      processingTime
    });
    throw error;
  }
});

module.exports = router;
