const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
const Conversation = require('../models/Conversation');

/**
 * Group Messages Routes
 * 
 * Endpoints for sending messages to WhatsApp groups
 */

// @route   POST /api/groups/send-message
// @desc    Send message to WhatsApp group
// @access  Private
router.post('/send-message', auth, async (req, res) => {
  try {
    const { groupId, message } = req.body;

    // Validation
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      });
    }

    if (!message || !message.type) {
      return res.status(400).json({
        success: false,
        error: 'Message object with type is required'
      });
    }

    // Validate group ID format
    if (!groupId.includes('@g.us')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group ID format. Must be in format: 123456789-1234567890@g.us'
      });
    }

    // Send message to group
    const result = await whatsappService.sendGroupMessage(groupId, message);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Try to find or create conversation for group
    let conversation = await Conversation.findOne({
      userId: req.userId,
      phoneNumber: groupId
    });

    if (!conversation) {
      conversation = new Conversation({
        userId: req.userId,
        phoneNumber: groupId,
        contactName: 'WhatsApp Group',
        isGroup: true,
        lastMessage: message.type === 'text' ? message.text.body : `Sent ${message.type}`,
        lastMessageTime: new Date(),
        status: 'open'
      });
      await conversation.save();
    } else {
      conversation.lastMessage = message.type === 'text' ? message.text.body : `Sent ${message.type}`;
      conversation.lastMessageTime = new Date();
      await conversation.save();
    }

    res.json({
      success: true,
      message: 'Group message sent successfully',
      data: result.data,
      conversationId: conversation._id
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send group message'
    });
  }
});

// @route   POST /api/groups/send-text
// @desc    Send text message to group (convenience endpoint)
// @access  Private
router.post('/send-text', auth, async (req, res) => {
  try {
    const { groupId, text, context } = req.body;

    // Validation
    if (!groupId || !text) {
      return res.status(400).json({
        success: false,
        error: 'Group ID and text are required'
      });
    }

    // Send text message
    const result = await whatsappService.sendGroupTextMessage(groupId, text, context);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Update conversation
    let conversation = await Conversation.findOne({
      userId: req.userId,
      phoneNumber: groupId
    });

    if (!conversation) {
      conversation = new Conversation({
        userId: req.userId,
        phoneNumber: groupId,
        contactName: 'WhatsApp Group',
        isGroup: true,
        lastMessage: text,
        lastMessageTime: new Date(),
        status: 'open'
      });
      await conversation.save();
    } else {
      conversation.lastMessage = text;
      conversation.lastMessageTime = new Date();
      await conversation.save();
    }

    res.json({
      success: true,
      message: 'Text message sent to group',
      data: result.data,
      conversationId: conversation._id
    });
  } catch (error) {
    console.error('Error sending group text message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send text message'
    });
  }
});

// @route   POST /api/groups/send-media
// @desc    Send media to group (convenience endpoint)
// @access  Private
router.post('/send-media', auth, async (req, res) => {
  try {
    const { groupId, mediaType, mediaId, caption } = req.body;

    // Validation
    if (!groupId || !mediaType || !mediaId) {
      return res.status(400).json({
        success: false,
        error: 'Group ID, media type, and media ID are required'
      });
    }

    const validMediaTypes = ['image', 'video', 'audio', 'document'];
    if (!validMediaTypes.includes(mediaType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid media type. Must be one of: ${validMediaTypes.join(', ')}`
      });
    }

    // Send media message
    const result = await whatsappService.sendGroupMediaMessage(
      groupId,
      mediaType,
      mediaId,
      caption
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Update conversation
    let conversation = await Conversation.findOne({
      userId: req.userId,
      phoneNumber: groupId
    });

    const messageText = caption || `Sent ${mediaType}`;

    if (!conversation) {
      conversation = new Conversation({
        userId: req.userId,
        phoneNumber: groupId,
        contactName: 'WhatsApp Group',
        isGroup: true,
        lastMessage: messageText,
        lastMessageTime: new Date(),
        status: 'open'
      });
      await conversation.save();
    } else {
      conversation.lastMessage = messageText;
      conversation.lastMessageTime = new Date();
      await conversation.save();
    }

    res.json({
      success: true,
      message: `${mediaType} sent to group`,
      data: result.data,
      conversationId: conversation._id
    });
  } catch (error) {
    console.error('Error sending group media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send media'
    });
  }
});

// @route   GET /api/groups/:groupId/info
// @desc    Get group information
// @access  Private
router.get('/:groupId/info', auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Get group info from WhatsApp API
    const result = await whatsappService.getGroupInfo(groupId);

    // Even if API call fails, try to get info from our database
    const conversation = await Conversation.findOne({
      userId: req.userId,
      phoneNumber: groupId,
      isGroup: true
    });

    if (!result.success && !conversation) {
      return res.status(404).json({
        success: false,
        error: result.error,
        suggestion: result.suggestion
      });
    }

    // Combine API data with database data
    const groupInfo = {
      groupId: groupId,
      name: conversation?.contactName || 'WhatsApp Group',
      lastMessageTime: conversation?.lastMessageTime,
      messageCount: conversation?.messageCount || 0,
      status: conversation?.status || 'unknown',
      apiData: result.success ? result.data : null,
      source: result.success ? 'api' : 'database'
    };

    res.json({
      success: true,
      data: groupInfo
    });
  } catch (error) {
    console.error('Error getting group info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group information'
    });
  }
});

// @route   GET /api/groups/:groupId/metadata
// @desc    Get group metadata (participants, admins, etc.)
// @access  Private
router.get('/:groupId/metadata', auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const result = await whatsappService.getGroupMetadata(groupId);

    res.json(result);
  } catch (error) {
    console.error('Error getting group metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group metadata'
    });
  }
});

// @route   POST /api/groups/:groupId/leave
// @desc    Leave WhatsApp group
// @access  Private
router.post('/:groupId/leave', auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const result = await whatsappService.leaveGroup(groupId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Update conversation status
    await Conversation.updateOne(
      {
        userId: req.userId,
        phoneNumber: groupId
      },
      {
        $set: {
          status: 'closed',
          isGroup: true,
          notes: 'Left group'
        }
      }
    );

    res.json({
      success: true,
      message: 'Successfully left group',
      data: result.data
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave group'
    });
  }
});

// @route   GET /api/groups
// @desc    Get list of group conversations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Conversation.find({
      userId: req.userId,
      isGroup: true,
      status: { $ne: 'closed' }
    })
      .sort({ lastMessageTime: -1 })
      .limit(50);

    res.json({
      success: true,
      count: groups.length,
      groups: groups.map(group => ({
        groupId: group.phoneNumber,
        name: group.contactName,
        lastMessage: group.lastMessage,
        lastMessageTime: group.lastMessageTime,
        messageCount: group.messageCount || 0,
        unreadCount: group.unreadCount || 0,
        status: group.status
      }))
    });
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get groups'
    });
  }
});

module.exports = router;
