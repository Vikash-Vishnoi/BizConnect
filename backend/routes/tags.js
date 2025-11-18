/**
 * Contact Tags Routes
 * 
 * API endpoints for managing conversation tags:
 * - Get all tags
 * - Get conversations by tag
 * - Add/remove tags
 * - Rename, delete, merge tags
 * - Tag suggestions and analytics
 * 
 * @module routes/tags
 */

const express = require('express');
const router = express.Router();
const contactTagsService = require('../services/contactTagsService');
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');

/**
 * @route   GET /api/tags
 * @desc    Get all tags for the business
 * @access  Private
 */
router.get('/', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const result = await contactTagsService.getAllTags(req.businessId);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tags',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tags/:tagName/conversations
 * @desc    Get conversations with a specific tag
 * @access  Private
 */
router.get('/:tagName/conversations', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { tagName } = req.params;
    const { page, limit } = req.query;
    
    const result = await contactTagsService.getConversationsByTag(
      req.businessId,
      tagName,
      { page: parseInt(page) || 1, limit: parseInt(limit) || 20 }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error getting conversations by tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/tags/conversation/:conversationId/add
 * @desc    Add a tag to a conversation
 * @access  Private
 * @body    { tagName: string }
 */
router.post('/conversation/:conversationId/add', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { tagName } = req.body;
    
    if (!tagName) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required'
      });
    }
    
    // Validate tag name
    const validation = contactTagsService.validateTagName(tagName);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    const result = await contactTagsService.addTagToConversation(
      conversationId,
      req.businessId,
      tagName
    );
    
    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('conversation:tag:added', {
        conversationId,
        tag: result.tag,
        tags: result.conversation.tags,
        timestamp: new Date()
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error adding tag:', error);
    
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to add tag',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/tags/conversation/:conversationId/remove
 * @desc    Remove a tag from a conversation
 * @access  Private
 * @body    { tagName: string }
 */
router.post('/conversation/:conversationId/remove', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { tagName } = req.body;
    
    if (!tagName) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required'
      });
    }
    
    const result = await contactTagsService.removeTagFromConversation(
      conversationId,
      req.businessId,
      tagName
    );
    
    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('conversation:tag:removed', {
        conversationId,
        tag: result.tag,
        tags: result.conversation.tags,
        timestamp: new Date()
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error removing tag:', error);
    
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to remove tag',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/tags/:oldTagName/rename
 * @desc    Rename a tag across all conversations
 * @access  Private
 * @body    { newTagName: string }
 */
router.put('/:oldTagName/rename', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { oldTagName } = req.params;
    const { newTagName } = req.body;
    
    if (!newTagName) {
      return res.status(400).json({
        success: false,
        error: 'New tag name is required'
      });
    }
    
    // Validate new tag name
    const validation = contactTagsService.validateTagName(newTagName);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    const result = await contactTagsService.renameTag(
      req.businessId,
      oldTagName,
      newTagName
    );
    
    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('tag:renamed', {
        oldTag: result.oldTag,
        newTag: result.newTag,
        updatedCount: result.updatedCount,
        timestamp: new Date()
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error renaming tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rename tag',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/tags/:tagName
 * @desc    Delete a tag from all conversations
 * @access  Private
 */
router.delete('/:tagName', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { tagName } = req.params;
    
    const result = await contactTagsService.deleteTag(
      req.businessId,
      tagName
    );
    
    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('tag:deleted', {
        tag: result.tag,
        deletedFromCount: result.deletedFromCount,
        timestamp: new Date()
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tag',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/tags/merge
 * @desc    Merge multiple tags into one
 * @access  Private
 * @body    { tagsToMerge: string[], targetTag: string }
 */
router.post('/merge', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { tagsToMerge, targetTag } = req.body;
    
    if (!tagsToMerge || !Array.isArray(tagsToMerge)) {
      return res.status(400).json({
        success: false,
        error: 'tagsToMerge must be an array'
      });
    }
    
    if (tagsToMerge.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 tags are required for merging'
      });
    }
    
    if (!targetTag) {
      return res.status(400).json({
        success: false,
        error: 'Target tag name is required'
      });
    }
    
    // Validate target tag name
    const validation = contactTagsService.validateTagName(targetTag);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    const result = await contactTagsService.mergeTags(
      req.businessId,
      tagsToMerge,
      targetTag
    );
    
    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('tags:merged', {
        mergedTags: result.mergedTags,
        targetTag: result.targetTag,
        updatedCount: result.updatedCount,
        timestamp: new Date()
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error merging tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to merge tags',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tags/suggestions
 * @desc    Get tag suggestions based on query
 * @access  Private
 * @query   { q: string, limit: number }
 */
router.get('/suggestions', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { q, limit } = req.query;
    
    const result = await contactTagsService.getTagSuggestions(
      req.businessId,
      q || '',
      parseInt(limit) || 10
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error getting tag suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tags/analytics
 * @desc    Get tag analytics and statistics
 * @access  Private
 */
router.get('/analytics', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const result = await contactTagsService.getTagAnalytics(req.businessId);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting tag analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/tags/validate
 * @desc    Validate a tag name
 * @access  Private
 * @body    { tagName: string }
 */
router.post('/validate', auth, async (req, res) => {
  try {
    const { tagName } = req.body;
    
    if (!tagName) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required'
      });
    }
    
    const validation = contactTagsService.validateTagName(tagName);
    
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Error validating tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate tag',
      message: error.message
    });
  }
});

module.exports = router;
