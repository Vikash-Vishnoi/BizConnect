/**
 * Location Routes - Location and live location message handling
 * @module routes/inbox/locationRoutes
 */

const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../../../core/middlewares/auth');
const Conversation = require('../../../core/database/models/Conversation');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
 
// POST /:id/messages/location - Send static location
router.post('/:id/messages/location', async (req, res) => {
  try {
    const { latitude, longitude, name, address } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      businessId: req.businessId,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
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
      return res.status(500).json({ error: result.error });
    }

    const messageData = {
      whatsappMessageId: result.messageId,
      from: req.business?.whatsappConfig?.phoneNumberId || 'system',
      to: conversation.contact.phoneNumber,
      direction: 'outgoing',
      type: 'location',
      content: {
        location: {
          latitude,
          longitude,
          name: name || 'Location',
          address: address || ''
        }
      },
      status: 'sent',
      timestamp: new Date()
    };

    const savedMessage = await conversation.addMessage(messageData);

    res.status(201).json({ message: savedMessage });
  } catch (error) {
    console.error('Send location error:', error);
    res.status(500).json({ error: 'Failed to send location' });
  }
});

// ❌ REMOVED: Live location routes - WhatsApp API only supports STATIC location, not live tracking
// - POST /:id/messages/live-location
// - PUT /:id/messages/:messageId/live-location
// - DELETE /:id/messages/:messageId/live-location
// Note: Static location (POST /:id/messages/location) is still supported and working above

module.exports = router;
