/**
 * Tag Analytics Routes - Suggestions, analytics, validation
 * @module routes/tags/tagAnalyticsRoutes
 */

const express = require('express');
const router = express.Router();
const { Conversation } = require('../../../database/models');

// GET /suggestions - Get tag suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const suggestionsLimit = parseInt(process.env.TAG_SUGGESTIONS_LIMIT || '10');
    const tagCounts = await Conversation.aggregate([
      { $match: { businessId: req.businessId } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: suggestionsLimit }
    ]);

    const suggestions = tagCounts.map(t => ({ tag: t._id, count: t.count }));

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error getting tag suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tag suggestions',
      error: error.message
    });
  }
});

// GET /analytics - Get tag analytics
router.get('/analytics', async (req, res) => {
  try {
    const tagStats = await Conversation.aggregate([
      { $match: { businessId: req.businessId } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          lastUsed: { $max: '$lastMessageAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      count: tagStats.length,
      analytics: tagStats.map(s => ({
        tag: s._id,
        conversationCount: s.count,
        lastUsed: s.lastUsed
      }))
    });
  } catch (error) {
    console.error('Error getting tag analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tag analytics',
      error: error.message
    });
  }
});

// POST /validate - Validate tag name
router.post('/validate', async (req, res) => {
  try {
    const { tagName } = req.body;

    if (!tagName) {
      return res.status(400).json({
        success: false,
        message: 'Tag name is required'
      });
    }

    const maxTagLength = parseInt(process.env.TAG_NAME_MAX_LENGTH || '50');
    const tagPattern = new RegExp(process.env.TAG_NAME_PATTERN || '^[a-zA-Z0-9_-]{1,50}$');
    const isValid = tagPattern.test(tagName) && tagName.length <= maxTagLength;
    const exists = await Conversation.exists({
      businessId: req.businessId,
      tags: tagName
    });

    res.json({
      success: true,
      valid: isValid,
      exists: !!exists,
      message: isValid ? 'Valid tag name' : 'Invalid tag name format'
    });
  } catch (error) {
    console.error('Error validating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate tag',
      error: error.message
    });
  }
});

module.exports = router;
