/**
 * Export Routes
 * 
 * Endpoints for exporting conversations in various formats
 * Supports PDF, JSON, and CSV exports
 */

const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const exportService = require('../services/exportService');

// @route   POST /api/export/conversation/:id/pdf
// @desc    Export single conversation to PDF
// @access  Private
router.post('/conversation/:id/pdf', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    console.log('📄 Generating PDF export for conversation:', req.params.id);

    const pdfDoc = await exportService.exportConversationToPDF(
      req.params.id,
      req.businessId,
      { startDate, endDate }
    );

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${req.params.id}.pdf"`);

    // Pipe PDF to response
    pdfDoc.pipe(res);
  } catch (error) {
    console.error('Export to PDF error:', error);
    res.status(500).json({ error: error.message || 'Failed to export to PDF' });
  }
});

// @route   POST /api/export/conversation/:id/json
// @desc    Export single conversation to JSON
// @access  Private
router.post('/conversation/:id/json', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    console.log('📦 Generating JSON export for conversation:', req.params.id);

    const jsonData = await exportService.exportConversationToJSON(
      req.params.id,
      req.businessId,
      { startDate, endDate }
    );

    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${req.params.id}.json"`);

    res.send(jsonData);
  } catch (error) {
    console.error('Export to JSON error:', error);
    res.status(500).json({ error: error.message || 'Failed to export to JSON' });
  }
});

// @route   POST /api/export/conversation/:id/csv
// @desc    Export single conversation to CSV
// @access  Private
router.post('/conversation/:id/csv', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    console.log('📊 Generating CSV export for conversation:', req.params.id);

    const csvData = await exportService.exportConversationToCSV(
      req.params.id,
      req.businessId,
      { startDate, endDate }
    );

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${req.params.id}.csv"`);

    res.send(csvData);
  } catch (error) {
    console.error('Export to CSV error:', error);
    res.status(500).json({ error: error.message || 'Failed to export to CSV' });
  }
});

// @route   POST /api/export/bulk
// @desc    Export multiple conversations
// @access  Private
router.post('/bulk', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { conversationIds, format = 'json', startDate, endDate } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ error: 'conversationIds array required' });
    }

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Format must be json or csv' });
    }

    console.log(`📦 Bulk export: ${conversationIds.length} conversations as ${format.toUpperCase()}`);

    const exportData = await exportService.exportBulkConversations(
      conversationIds,
      req.businessId,
      format,
      { startDate, endDate }
    );

    // Set response headers
    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const extension = format;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="bulk-export-${Date.now()}.${extension}"`);

    res.send(exportData);
  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({ error: error.message || 'Failed to export conversations' });
  }
});

// @route   POST /api/export/stats
// @desc    Get export statistics (preview before export)
// @access  Private
router.post('/stats', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { conversationIds = [], startDate, endDate } = req.body;

    console.log('📊 Getting export stats...');

    const stats = await exportService.getExportStats(
      req.businessId,
      conversationIds,
      { startDate, endDate }
    );

    res.json(stats);
  } catch (error) {
    console.error('Get export stats error:', error);
    res.status(500).json({ error: 'Failed to get export stats' });
  }
});

// @route   POST /api/export/all
// @desc    Export all business conversations
// @access  Private
router.post('/all', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.body;

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Format must be json or csv' });
    }

    console.log(`📦 Exporting all conversations as ${format.toUpperCase()}`);

    // Get all conversation IDs for business
    const Conversation = require('../models/Conversation');
    const conversations = await Conversation.find({
      businessId: req.businessId,
      isDeleted: false
    }).select('_id').lean();

    const conversationIds = conversations.map(c => c._id);

    if (conversationIds.length === 0) {
      return res.status(404).json({ error: 'No conversations found' });
    }

    const exportData = await exportService.exportBulkConversations(
      conversationIds,
      req.businessId,
      format,
      { startDate, endDate }
    );

    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const extension = format;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="all-conversations-${Date.now()}.${extension}"`);

    res.send(exportData);
  } catch (error) {
    console.error('Export all error:', error);
    res.status(500).json({ error: error.message || 'Failed to export all conversations' });
  }
});

module.exports = router;
