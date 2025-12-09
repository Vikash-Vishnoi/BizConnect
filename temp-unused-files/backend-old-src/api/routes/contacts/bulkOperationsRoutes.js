/**
 * Bulk Operations Routes
 * @module routes/bulk/bulkOperationsRoutes
 */

const express = require('express');
const router = express.Router();
const bulkOperationsService = require('../../../services/contact/bulkOperationsService');
const { Conversation } = require('../../../database/models');

// POST /archive - Bulk archive conversations
router.post('/archive', async (req, res) => {
  try { 
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required'
      });
    }

    const result = await bulkOperationsService.bulkArchive(
      conversationIds,
      req.businessId
    );

    res.json({
      success: true,
      message: `${result.modified} conversations archived`,
      result
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

// POST /unarchive - Bulk unarchive conversations
router.post('/unarchive', async (req, res) => {
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required'
      });
    }

    const result = await bulkOperationsService.bulkUnarchive(
      conversationIds,
      req.businessId
    );

    res.json({
      success: true,
      message: `${result.modified} conversations unarchived`,
      result
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

// POST /assign - Bulk assign conversations to agent
router.post('/assign', async (req, res) => {
  try {
    const { conversationIds, agentId } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required'
      });
    }

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'agentId is required'
      });
    }

    const result = await bulkOperationsService.bulkAssign(
      conversationIds,
      agentId,
      req.businessId
    );

    res.json({
      success: true,
      message: `${result.modified} conversations assigned`,
      result
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

// POST /unassign - Bulk unassign conversations
router.post('/unassign', async (req, res) => {
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required'
      });
    }

    const result = await bulkOperationsService.bulkUnassign(
      conversationIds,
      req.businessId
    );

    res.json({
      success: true,
      message: `${result.modified} conversations unassigned`,
      result
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

// POST /status - Bulk change conversation status
router.post('/status', async (req, res) => {
  try {
    const { conversationIds, status } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required'
      });
    }

    const validStatuses = ['open', 'pending', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await bulkOperationsService.bulkChangeStatus(
      conversationIds,
      status,
      req.businessId
    );

    res.json({
      success: true,
      message: `${result.modified} conversations updated to ${status}`,
      result
    });
  } catch (error) {
    console.error('Error bulk status change:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change conversation status',
      error: error.message
    });
  }
});

module.exports = router;
