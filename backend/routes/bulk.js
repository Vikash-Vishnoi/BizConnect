/**
 * Bulk Operations Routes
 * 
 * API endpoints for bulk operations on conversations
 * - Bulk archive/unarchive
 * - Bulk assign/unassign
 * - Bulk tag/untag
 * - Bulk status updates
 * - Bulk export metadata
 * 
 * Note: Bulk mark as read and bulk delete excluded per user request
 * 
 * @route /api/bulk
 */

const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const bulkOperationsService = require('../services/bulkOperationsService');

/**
 * @route   POST /api/bulk/archive
 * @desc    Bulk archive conversations
 * @access  Private
 */
router.post('/archive', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required and must not be empty'
      });
    }

    if (conversationIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot archive more than 100 conversations at once'
      });
    }

    const result = await bulkOperationsService.bulkArchiveConversations(
      conversationIds,
      req.businessId
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('conversations:bulk_archived', {
        conversationIds,
        count: result.archivedCount,
        timestamp: result.timestamp
      });
    }

    res.json({
      success: true,
      message: `Archived ${result.archivedCount} conversation(s)`,
      data: result
    });
  } catch (error) {
    console.error('Error bulk archiving:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive conversations',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/bulk/unarchive
 * @desc    Bulk unarchive conversations
 * @access  Private
 */
router.post('/unarchive', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required and must not be empty'
      });
    }

    if (conversationIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unarchive more than 100 conversations at once'
      });
    }

    const result = await bulkOperationsService.bulkUnarchiveConversations(
      conversationIds,
      req.businessId
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('conversations:bulk_unarchived', {
        conversationIds,
        count: result.unarchivedCount,
        timestamp: result.timestamp
      });
    }

    res.json({
      success: true,
      message: `Unarchived ${result.unarchivedCount} conversation(s)`,
      data: result
    });
  } catch (error) {
    console.error('Error bulk unarchiving:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unarchive conversations',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/bulk/assign
 * @desc    Bulk assign conversations to a user
 * @access  Private
 */
router.post('/assign', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationIds, assignToUserId, assignToUserName } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required and must not be empty'
      });
    }

    if (!assignToUserId || !assignToUserName) {
      return res.status(400).json({
        success: false,
        message: 'assignToUserId and assignToUserName are required'
      });
    }

    if (conversationIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign more than 100 conversations at once'
      });
    }

    const result = await bulkOperationsService.bulkAssignConversations(
      conversationIds,
      req.businessId,
      assignToUserId,
      assignToUserName
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('conversations:bulk_assigned', {
        conversationIds,
        count: result.assignedCount,
        assignedTo: result.assignedTo,
        timestamp: result.timestamp
      });
    }

    res.json({
      success: true,
      message: `Assigned ${result.assignedCount} conversation(s) to ${assignToUserName}`,
      data: result
    });
  } catch (error) {
    console.error('Error bulk assigning:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign conversations',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/bulk/unassign
 * @desc    Bulk unassign conversations
 * @access  Private
 */
router.post('/unassign', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required and must not be empty'
      });
    }

    if (conversationIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unassign more than 100 conversations at once'
      });
    }

    const result = await bulkOperationsService.bulkUnassignConversations(
      conversationIds,
      req.businessId
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('conversations:bulk_unassigned', {
        conversationIds,
        count: result.unassignedCount,
        timestamp: result.timestamp
      });
    }

    res.json({
      success: true,
      message: `Unassigned ${result.unassignedCount} conversation(s)`,
      data: result
    });
  } catch (error) {
    console.error('Error bulk unassigning:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign conversations',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/bulk/tags/add
 * @desc    Bulk add tags to conversations
 * @access  Private
 */
router.post('/tags/add', auth, async (req, res) => {
  try {
    const { conversationIds, tags } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required and must not be empty'
      });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tags array is required and must not be empty'
      });
    }

    if (conversationIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot tag more than 100 conversations at once'
      });
    }

    if (tags.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add more than 10 tags at once'
      });
    }

    const result = await bulkOperationsService.bulkAddTags(
      conversationIds,
      req.businessId,
      tags
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('conversations:bulk_tagged', {
        conversationIds,
        count: result.taggedCount,
        tags: result.tags,
        timestamp: result.timestamp
      });
    }

    res.json({
      success: true,
      message: `Added tags to ${result.taggedCount} conversation(s)`,
      data: result
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

/**
 * @route   POST /api/bulk/tags/remove
 * @desc    Bulk remove tags from conversations
 * @access  Private
 */
router.post('/tags/remove', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationIds, tags } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required and must not be empty'
      });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tags array is required and must not be empty'
      });
    }

    if (conversationIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot untag more than 100 conversations at once'
      });
    }

    const result = await bulkOperationsService.bulkRemoveTags(
      conversationIds,
      req.businessId,
      tags
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('conversations:bulk_untagged', {
        conversationIds,
        count: result.untaggedCount,
        tags: result.tags,
        timestamp: result.timestamp
      });
    }

    res.json({
      success: true,
      message: `Removed tags from ${result.untaggedCount} conversation(s)`,
      data: result
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

/**
 * @route   POST /api/bulk/status
 * @desc    Bulk update conversation status
 * @access  Private
 */
router.post('/status', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationIds, status } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required and must not be empty'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required'
      });
    }

    const validStatuses = ['active', 'archived', 'closed', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    if (conversationIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update more than 100 conversations at once'
      });
    }

    const result = await bulkOperationsService.bulkUpdateStatus(
      conversationIds,
      req.businessId,
      status
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`business:${req.businessId}`).emit('conversations:bulk_status_updated', {
        conversationIds,
        count: result.updatedCount,
        newStatus: status,
        timestamp: result.timestamp
      });
    }

    res.json({
      success: true,
      message: `Updated status for ${result.updatedCount} conversation(s)`,
      data: result
    });
  } catch (error) {
    console.error('Error bulk updating status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/bulk/stats
 * @desc    Get bulk operation statistics
 * @access  Private
 */
router.get('/stats', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const stats = await bulkOperationsService.getBulkOperationStats(req.businessId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting bulk stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bulk operation statistics',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/bulk/validate
 * @desc    Validate conversation IDs
 * @access  Private
 */
router.post('/validate', auth, requireBusiness, async (req, res) => {
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required and must not be empty'
      });
    }

    const validation = await bulkOperationsService.validateConversationIds(
      conversationIds,
      req.businessId
    );

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating conversation IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate conversation IDs',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/bulk/export/metadata
 * @desc    Bulk export conversation metadata
 * @access  Private
 */
router.post('/export/metadata', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required and must not be empty'
      });
    }

    if (conversationIds.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Cannot export more than 500 conversations at once'
      });
    }

    const result = await bulkOperationsService.bulkExportMetadata(
      conversationIds,
      req.businessId
    );

    res.json({
      success: true,
      message: `Exported metadata for ${result.total} conversation(s)`,
      data: result
    });
  } catch (error) {
    console.error('Error bulk exporting metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export metadata',
      error: error.message
    });
  }
});

module.exports = router;
