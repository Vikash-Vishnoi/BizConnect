/**
 * Tag Management Routes - Add, remove, rename, merge tags
 * @module routes/tags/tagManagementRoutes
 */

const express = require('express');
const router = express.Router();
const { Conversation } = require('../../../database/models');

// GET / - Get all tags
router.get('/', async (req, res) => {
  try {  
    const tags = await Conversation.distinct('tags', { businessId: req.businessId });

    res.json({
      success: true,
      count: tags.length,
      tags
    });
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tags',
      error: error.message
    });
  }
});

// GET /:tagName/conversations - Get conversations by tag
router.get('/:tagName/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      businessId: req.businessId,
      tags: req.params.tagName
    }).sort({ lastMessageAt: -1 });

    res.json({
      success: true,
      count: conversations.length,
      conversations
    });
  } catch (error) {
    console.error('Error getting tagged conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tagged conversations',
      error: error.message
    });
  }
});

// POST /conversation/:conversationId/add - Add tag to conversation
router.post('/conversation/:conversationId/add', async (req, res) => {
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags array is required'
      });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.tags) conversation.tags = [];
    
    const newTags = tags.filter(tag => !conversation.tags.includes(tag));
    conversation.tags.push(...newTags);

    await conversation.save();

    res.json({
      success: true,
      message: `${newTags.length} tags added`,
      tags: conversation.tags
    });
  } catch (error) {
    console.error('Error adding tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add tags',
      error: error.message
    });
  }
});

// POST /conversation/:conversationId/remove - Remove tag from conversation
router.post('/conversation/:conversationId/remove', async (req, res) => {
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags array is required'
      });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      businessId: req.businessId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    conversation.tags = conversation.tags.filter(tag => !tags.includes(tag));

    await conversation.save();

    res.json({
      success: true,
      message: 'Tags removed successfully',
      tags: conversation.tags
    });
  } catch (error) {
    console.error('Error removing tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove tags',
      error: error.message
    });
  }
});

// PUT /:oldTagName/rename - Rename tag
router.put('/:oldTagName/rename', async (req, res) => {
  try {
    const { newTagName } = req.body;

    if (!newTagName) {
      return res.status(400).json({
        success: false,
        message: 'New tag name is required'
      });
    }

    const result = await Conversation.updateMany(
      {
        businessId: req.businessId,
        tags: req.params.oldTagName
      },
      {
        $set: { 'tags.$': newTagName }
      }
    );

    res.json({
      success: true,
      message: `Tag renamed in ${result.modifiedCount} conversations`,
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error('Error renaming tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rename tag',
      error: error.message
    });
  }
});

// POST /merge - Merge tags
router.post('/merge', async (req, res) => {
  try {
    const { sourceTags, targetTag } = req.body;

    if (!sourceTags || !Array.isArray(sourceTags) || !targetTag) {
      return res.status(400).json({
        success: false,
        message: 'Source tags array and target tag are required'
      });
    }

    const conversations = await Conversation.find({
      businessId: req.businessId,
      tags: { $in: sourceTags }
    });

    let modifiedCount = 0;
    for (const conversation of conversations) {
      conversation.tags = conversation.tags.filter(tag => !sourceTags.includes(tag));
      if (!conversation.tags.includes(targetTag)) {
        conversation.tags.push(targetTag);
      }
      await conversation.save();
      modifiedCount++;
    }

    res.json({
      success: true,
      message: `${sourceTags.length} tags merged into '${targetTag}' in ${modifiedCount} conversations`,
      modified: modifiedCount
    });
  } catch (error) {
    console.error('Error merging tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to merge tags',
      error: error.message
    });
  }
});

module.exports = router;
