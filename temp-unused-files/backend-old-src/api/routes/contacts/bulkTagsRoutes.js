/**
 * Bulk Tags Routes
 * @module routes/bulk/bulkTagsRoutes
 */

const express = require('express');
const router = express.Router();
const bulkOperationsService = require('../../../services/contact/bulkOperationsService');

// POST /tags/add - Bulk add tags to conversations
router.post('/tags/add', async (req, res) => {
  try {
    const { conversationIds, tags } = req.body;
 
    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required'
      });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tags array is required and cannot be empty'
      });
    }

    const result = await bulkOperationsService.bulkAddTags(
      conversationIds,
      tags,
      req.businessId
    );

    res.json({
      success: true,
      message: `Tags added to ${result.modified} conversations`,
      result
    });
  } catch (error) {
    console.error('Error bulk adding tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add tags',
      error: error.message
    });
  }
});

// POST /tags/remove - Bulk remove tags from conversations
router.post('/tags/remove', async (req, res) => {
  try {
    const { conversationIds, tags } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required'
      });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tags array is required and cannot be empty'
      });
    }

    const result = await bulkOperationsService.bulkRemoveTags(
      conversationIds,
      tags,
      req.businessId
    );

    res.json({
      success: true,
      message: `Tags removed from ${result.modified} conversations`,
      result
    });
  } catch (error) {
    console.error('Error bulk removing tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove tags',
      error: error.message
    });
  }
});

module.exports = router;
