/**
 * Bulk Utility Routes (validation, stats, export)
 * @module routes/bulk/bulkUtilityRoutes
 */

const express = require('express');
const router = express.Router();
const bulkOperationsService = require('../services/bulkOperationsService');
const { Conversation } = require('../../../core/database/models');

// POST /validate - Validate bulk operation
router.post('/validate', async (req, res) => {
  try {
    const { conversationIds } = req.body;
 
    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required'
      });
    }

    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
      businessId: req.businessId
    });

    const validIds = conversations.map(c => c._id.toString());
    const invalidIds = conversationIds.filter(id => !validIds.includes(id.toString()));

    res.json({
      success: true,
      validation: {
        total: conversationIds.length,
        valid: validIds.length,
        invalid: invalidIds.length,
        invalidIds
      }
    });
  } catch (error) {
    console.error('Error validating bulk operation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate bulk operation',
      error: error.message
    });
  }
});

// GET /stats - Get bulk operations statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    const days = parseInt(period) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await bulkOperationsService.getBulkOperationStats(
      req.businessId,
      startDate
    );

    res.json({
      success: true,
      period: `${days} days`,
      stats
    });
  } catch (error) {
    console.error('Error getting bulk stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bulk operation stats',
      error: error.message
    });
  }
});

// POST /export/metadata - Export conversation metadata
router.post('/export/metadata', async (req, res) => {
  try {
    const { conversationIds, format = 'json' } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({
        success: false,
        message: 'conversationIds array is required'
      });
    }

    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
      businessId: req.businessId
    }).select('contactName phoneNumber status tags assignedTo lastMessageAt createdAt');

    if (format === 'csv') {
      const csvHeader = 'ID,Contact Name,Phone Number,Status,Tags,Assigned To,Last Message,Created At\n';
      const csvData = conversations.map(c => 
        `${c._id},${c.contactName},${c.phoneNumber},${c.status},"${c.tags.join(';')}",${c.assignedTo || ''},${c.lastMessageAt},${c.createdAt}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="conversations-${Date.now()}.csv"`);
      res.send(csvHeader + csvData);
    } else {
      res.json({
        success: true,
        count: conversations.length,
        conversations
      });
    }
  } catch (error) {
    console.error('Error exporting metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export conversation metadata',
      error: error.message
    });
  }
});

module.exports = router;
