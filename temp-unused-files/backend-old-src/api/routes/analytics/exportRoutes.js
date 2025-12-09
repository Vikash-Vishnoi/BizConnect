/**
 * Consolidated Export Routes (Phase 3)
 * @module routes/export/exportRoutes
 * 
 * Consolidates export functionality from 6 routes to 3 routes
 * Supports conversation and contact exports in multiple formats
 */

const express = require('express');
const router = express.Router();
const exportService = require('../../../services/export/exportService');
const { Conversation, Contact } = require('../../../database/models');
// ❌ REMOVED: DataExport - model doesn't exist
 
// ============================================================================
// CONVERSATION EXPORTS
// ============================================================================

/**
 * POST /conversations - Export conversations
 * @query {string} format - 'pdf' | 'json' | 'csv' (default: json)
 * @body {string} conversationId - Single conversation ID (optional)
 * @body {string[]} conversationIds - Multiple conversation IDs (optional)
 * @body {boolean} all - Export all conversations (optional)
 * @body {string} startDate - Filter start date (optional)
 * @body {string} endDate - Filter end date (optional)
 * 
 * Consolidates:
 * - POST /api/export/conversation/:id/pdf
 * - POST /api/export/conversation/:id/json
 * - POST /api/export/conversation/:id/csv
 * - POST /api/export/bulk
 * - POST /api/export/all
 */
router.post('/conversations', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const { conversationId, conversationIds, all = false, startDate, endDate } = req.body;

    if (!['pdf', 'json', 'csv'].includes(format)) {
      return res.status(400).json({ 
        success: false,
        error: 'Format must be pdf, json, or csv' 
      });
    }

    let targetIds = [];

    // Single conversation export
    if (conversationId) {
      targetIds = [conversationId];
    }
    // Multiple conversations export
    else if (conversationIds && Array.isArray(conversationIds) && conversationIds.length > 0) {
      targetIds = conversationIds;
    }
    // Export all conversations
    else if (all === true) {
      const conversations = await Conversation.find({
        businessId: req.businessId,
        isDeleted: false
      }).select('_id').lean();

      targetIds = conversations.map(c => c._id.toString());

      if (targetIds.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'No conversations found' 
        });
      }
    }
    // No valid input
    else {
      return res.status(400).json({ 
        success: false,
        error: 'Must provide conversationId, conversationIds array, or all=true' 
      });
    }

    console.log(`📦 Exporting ${targetIds.length} conversation(s) as ${format.toUpperCase()}`);

    // Single conversation PDF export (different handling)
    if (targetIds.length === 1 && format === 'pdf') {
      const pdfDoc = await exportService.exportConversationToPDF(
        targetIds[0],
        req.businessId,
        { startDate, endDate }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="chat-export-${targetIds[0]}.pdf"`);
      
      return pdfDoc.pipe(res);
    }

    // Single conversation JSON/CSV export
    if (targetIds.length === 1) {
      let exportData;
      
      if (format === 'json') {
        exportData = await exportService.exportConversationToJSON(
          targetIds[0],
          req.businessId,
          { startDate, endDate }
        );
      } else if (format === 'csv') {
        exportData = await exportService.exportConversationToCSV(
          targetIds[0],
          req.businessId,
          { startDate, endDate }
        );
      }

      const contentType = format === 'json' ? 'application/json' : 'text/csv';
      const filename = `chat-export-${targetIds[0]}.${format}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.send(exportData);
    }

    // Bulk export (multiple conversations)
    if (format === 'pdf') {
      return res.status(400).json({
        success: false,
        error: 'PDF format only supports single conversation export. Use json or csv for bulk exports.'
      });
    }

    const exportData = await exportService.exportBulkConversations(
      targetIds,
      req.businessId,
      format,
      { startDate, endDate }
    );

    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const filename = `conversations-export-${Date.now()}.${format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(exportData);

  } catch (error) {
    console.error('Export conversations error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to export conversations' 
    });
  }
});

// ============================================================================
// CONTACT EXPORTS
// ============================================================================

/**
 * POST /contacts - Export contacts (bulk)
 * @query {string} format - 'csv' | 'json' (default: csv)
 * @body {string[]} contactIds - Specific contact IDs (optional)
 * @body {string[]} tags - Filter by tags (optional)
 * @body {boolean} all - Export all contacts (default: false)
 * 
 * Replaces: POST /api/export/bulk (for contacts)
 */
router.post('/contacts', async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const { contactIds, tags, all = false } = req.body;

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({ 
        success: false,
        error: 'Format must be csv or json' 
      });
    }

    let query = { businessId: req.businessId };

    // Filter by specific contacts
    if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
      query._id = { $in: contactIds };
    }
    // Filter by tags
    else if (tags && Array.isArray(tags) && tags.length > 0) {
      query.tags = { $in: tags };
    }
    // Must explicitly request all
    else if (!all) {
      return res.status(400).json({ 
        success: false,
        error: 'Must provide contactIds, tags, or all=true' 
      });
    }

    const contacts = await Contact.find(query)
      .select('name phone email tags metadata createdAt lastMessageAt')
      .lean();

    if (contacts.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No contacts found' 
      });
    }

    console.log(`📇 Exporting ${contacts.length} contact(s) as ${format.toUpperCase()}`);

    let exportData;

    if (format === 'json') {
      exportData = JSON.stringify(contacts, null, 2);
    } else {
      // CSV format
      const headers = ['Name', 'Phone', 'Email', 'Tags', 'Created At', 'Last Message'];
      const rows = contacts.map(contact => [
        contact.name || '',
        contact.phone || '',
        contact.email || '',
        (contact.tags || []).join('; '),
        contact.createdAt ? new Date(contact.createdAt).toISOString() : '',
        contact.lastMessageAt ? new Date(contact.lastMessageAt).toISOString() : ''
      ]);

      exportData = [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    }

    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const filename = `contacts-export-${Date.now()}.${format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(exportData);

  } catch (error) {
    console.error('Export contacts error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to export contacts' 
    });
  }
});

// ============================================================================
// EXPORT STATUS & MANAGEMENT
// ============================================================================

/**
 * GET /status/:id - Check export job status
 * ❌ REMOVED: DataExport model doesn't exist
 * Export jobs cannot be tracked without the DataExport model
 */
router.get('/status/:id', async (req, res) => {
  try {
    return res.status(501).json({ 
      success: false,
      error: 'Export job tracking not implemented - DataExport model does not exist' 
    });
  } catch (error) {
    console.error('Get export status error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get export status' 
    });
  }
});

/**
 * GET /stats - Get export statistics (preview)
 * @query {string[]} conversationIds - Conversation IDs to preview (optional)
 * @query {string} startDate - Filter start date (optional)
 * @query {string} endDate - Filter end date (optional)
 * 
 * Replaces: POST /api/export/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { conversationIds, startDate, endDate } = req.query;

    const ids = conversationIds ? 
      (Array.isArray(conversationIds) ? conversationIds : conversationIds.split(',')) : 
      [];

    console.log('📊 Getting export stats...');

    const stats = await exportService.getExportStats(
      req.businessId,
      ids,
      { startDate, endDate }
    );

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get export stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get export stats' 
    });
  }
});

module.exports = router;
