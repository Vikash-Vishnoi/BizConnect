/**
 * Message Reactions Routes
 * 
 * API endpoints for sending and managing emoji reactions on WhatsApp messages
 * 
 * @route /api/reactions
 */

const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const messageReactionsService = require('../services/messageReactionsService');

/**
 * @route   POST /api/reactions/conversations/:conversationId/messages/:messageId
 * @desc    Add emoji reaction to a message
 * @access  Private
 */
router.post('/conversations/:conversationId/messages/:messageId', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    // Validate emoji
    if (!messageReactionsService.validateEmoji(emoji)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emoji format'
      });
    }

    const result = await messageReactionsService.addReactionToMessage(
      conversationId,
      messageId,
      emoji,
      req.businessId
    );

    // Emit real-time event via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('message:reacted', {
        conversationId,
        messageId,
        emoji,
        from: req.user._id,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: {
        conversationId,
        messageId,
        emoji,
        whatsappMessageId: result.whatsappMessageId
      }
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/reactions/conversations/:conversationId/messages/:messageId
 * @desc    Remove reaction from a message
 * @access  Private
 */
router.delete('/conversations/:conversationId/messages/:messageId', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;

    const result = await messageReactionsService.removeReaction(
      conversationId,
      messageId,
      req.businessId
    );

    // Emit real-time event via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('message:reaction_removed', {
        conversationId,
        messageId,
        from: req.user._id,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Reaction removed successfully',
      data: {
        conversationId,
        messageId
      }
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove reaction',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reactions/conversations/:conversationId/messages/:messageId
 * @desc    Get all reactions for a specific message
 * @access  Private
 */
router.get('/conversations/:conversationId/messages/:messageId', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;

    const result = await messageReactionsService.getMessageReactions(
      conversationId,
      messageId,
      req.businessId
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting message reactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reactions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reactions/conversations/:conversationId/stats
 * @desc    Get reaction statistics for a conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/stats', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await messageReactionsService.getConversationReactionStats(
      conversationId,
      req.businessId
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting reaction stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reaction statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reactions/recent
 * @desc    Get recent reactions across all conversations
 * @access  Private
 */
router.get('/recent', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await messageReactionsService.getRecentReactions(
      req.businessId,
      limit
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting recent reactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent reactions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reactions/emojis
 * @desc    Get list of supported emoji reactions
 * @access  Public
 */
router.get('/emojis', (req, res) => {
  try {
    const allEmojis = messageReactionsService.getSupportedEmojis();
    const quickEmojis = allEmojis.slice(0, 6); // First 6 as quick reactions

    res.json({
      success: true,
      emojis: {
        quick: quickEmojis,
        all: allEmojis
      },
      total: allEmojis.length,
      note: 'Any valid emoji can be used, this is just a suggested list'
    });
  } catch (error) {
    console.error('Error getting supported emojis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported emojis',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/reactions/quick
 * @desc    Quick reaction (commonly used emojis with shortcuts)
 * @access  Private
 */
router.post('/quick', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationId, messageId, reactionType } = req.body;

    if (!conversationId || !messageId || !reactionType) {
      return res.status(400).json({
        success: false,
        message: 'conversationId, messageId, and reactionType are required'
      });
    }

    // Map reaction types to emojis
    const quickReactions = {
      'like': '👍',
      'love': '❤️',
      'laugh': '😂',
      'wow': '😮',
      'sad': '😢',
      'thanks': '🙏',
      'fire': '🔥',
      'party': '🎉',
      'clap': '👏',
      'perfect': '💯'
    };

    const emoji = quickReactions[reactionType];

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reaction type',
        availableTypes: Object.keys(quickReactions)
      });
    }

    const result = await messageReactionsService.addReactionToMessage(
      conversationId,
      messageId,
      emoji,
      req.businessId
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('message:reacted', {
        conversationId,
        messageId,
        emoji,
        reactionType,
        from: req.user._id,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Quick reaction added successfully',
      data: {
        conversationId,
        messageId,
        emoji,
        reactionType,
        whatsappMessageId: result.whatsappMessageId
      }
    });
  } catch (error) {
    console.error('Error adding quick reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add quick reaction',
      error: error.message
    });
  }
});

module.exports = router;
