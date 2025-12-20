/**
 * Location Routes - Location and live location message handling
 * @module routes/inbox/locationRoutes
 */

const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness, requirePermission } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const Conversation = require('../../../core/database/models/Conversation');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// Constants for location messages
const DEFAULT_LOCATION_NAME = 'Location'; // Default name if not provided
const DEFAULT_LOCATION_ADDRESS = ''; // Default address if not provided
const LATITUDE_MIN = -90; // Minimum valid latitude
const LATITUDE_MAX = 90; // Maximum valid latitude
const LONGITUDE_MIN = -180; // Minimum valid longitude
const LONGITUDE_MAX = 180; // Maximum valid longitude
 
// POST /:id/messages/location - Send static location
router.post('/:id/messages/location', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { latitude, longitude, name, address } = req.body;

    if (!latitude || !longitude) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'latitude and longitude are required'
      });
    }

    // Validate latitude and longitude ranges
    if (latitude < LATITUDE_MIN || latitude > LATITUDE_MAX) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `latitude must be between ${LATITUDE_MIN} and ${LATITUDE_MAX}`
      });
    }

    if (longitude < LONGITUDE_MIN || longitude > LONGITUDE_MAX) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `longitude must be between ${LONGITUDE_MIN} and ${LONGITUDE_MAX}`
      });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Conversation not found'
      });
    }

    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
    const result = await whatsappService.sendLocationMessage(
      conversation.contact.phoneNumber,
      latitude,
      longitude,
      name,
      address
    );

    if (!result.success) {
      logger.error('Failed to send location message', {
        businessId: req.businessId?.toString(),
        conversationId: req.params.id,
        error: result.error
      });
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        error: ERROR_CODES.INTERNAL_ERROR,
        message: result.error || 'Failed to send location message'
      });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'out',
      type: 'location',
      content: {
        location: {
          latitude,
          longitude,
          name: name || DEFAULT_LOCATION_NAME,
          address: address || DEFAULT_LOCATION_ADDRESS
        }
      },
      status: 'sent',
      timestamp: new Date()
    };

    const savedMessage = await conversation.addMessage(messageData);

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.CREATED).json({ 
      message: savedMessage,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Send location message error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to send location message'
    });
  }
});

// ❌ REMOVED: Live location routes - WhatsApp API only supports STATIC location, not live tracking
// - POST /:id/messages/live-location
// - PUT /:id/messages/:messageId/live-location
// - DELETE /:id/messages/:messageId/live-location
// Note: Static location (POST /:id/messages/location) is still supported and working above

module.exports = router;
