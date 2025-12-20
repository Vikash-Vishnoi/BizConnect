/**
 * Consolidated Export Routes (Phase 3)
 * @module routes/export/exportRoutes
 * 
 * Consolidates export functionality from 6 routes to 3 routes
 * Supports conversation and contact exports in multiple formats
 */

const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');
const { Conversation, Contact } = require('../../../core/database/models');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');
// ❌ REMOVED: DataExport - model doesn't exist

// ============================================================================
// CONSTANTS
// ============================================================================

// Export Formats
const FORMAT_PDF = 'pdf';
const FORMAT_JSON = 'json';
const FORMAT_CSV = 'csv';

// Valid Formats
const VALID_CONVERSATION_FORMATS = [FORMAT_PDF, FORMAT_JSON, FORMAT_CSV];
const VALID_CONTACT_FORMATS = [FORMAT_CSV, FORMAT_JSON];

// Content Types
const CONTENT_TYPE_PDF = 'application/pdf';
const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_CSV = 'text/csv';

// File Name Prefixes
const FILENAME_PREFIX_CHAT = 'chat-export';
const FILENAME_PREFIX_CONVERSATIONS = 'conversations-export';
const FILENAME_PREFIX_CONTACTS = 'contacts-export';

// CSV Headers
const CSV_HEADERS_CONTACTS = ['Name', 'Phone', 'Email', 'Tags', 'Created At', 'Last Message'];

// Error Messages
const ERROR_INVALID_FORMAT_CONVERSATIONS = 'Format must be pdf, json, or csv';
const ERROR_INVALID_FORMAT_CONTACTS = 'Format must be csv or json';
const ERROR_NO_CONVERSATIONS = 'No conversations found';
const ERROR_NO_CONTACTS = 'No contacts found';
const ERROR_NO_INPUT = 'Must provide conversationId, conversationIds array, or all=true';
const ERROR_NO_CONTACT_INPUT = 'Must provide contactIds, tags, or all=true';
const ERROR_PDF_SINGLE_ONLY = 'PDF format only supports single conversation export. Use json or csv for bulk exports.';
const ERROR_EXPORT_CONVERSATIONS = 'Failed to export conversations';
const ERROR_EXPORT_CONTACTS = 'Failed to export contacts';
const ERROR_EXPORT_STATUS = 'Failed to get export status';
const ERROR_EXPORT_STATS = 'Failed to get export stats';
const ERROR_TRACKING_NOT_IMPLEMENTED = 'Export job tracking not implemented - DataExport model does not exist';

// Success Messages
const SUCCESS_STATS_RETRIEVED = 'Export stats retrieved successfully';

// Default Values
const DEFAULT_FORMAT_JSON = 'json';
const DEFAULT_FORMAT_CSV = 'csv';
const DEFAULT_ALL = false;

// Status Codes
const STATUS_NOT_IMPLEMENTED = 501;

// Query Fields
const QUERY_FIELDS_CONVERSATION = '_id';
const QUERY_FIELDS_CONTACT = 'name phone email tags metadata createdAt lastMessageAt';

// JSON Spacing
const JSON_SPACING = 2;

// CSV Delimiter
const CSV_DELIMITER = ',';
const CSV_ROW_SEPARATOR = '\n';
const CSV_FIELD_SEPARATOR = '; ';
const CSV_QUOTE = '"';
const CSV_ESCAPED_QUOTE = '""';
 
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
router.post('/conversations', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { format = DEFAULT_FORMAT_JSON } = req.query;
    const { conversationId, conversationIds, all = DEFAULT_ALL, startDate, endDate } = req.body;

    if (!VALID_CONVERSATION_FORMATS.includes(format)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: ERROR_INVALID_FORMAT_CONVERSATIONS,
        processingTime: Date.now() - startTime
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
      }).select(QUERY_FIELDS_CONVERSATION).lean();

      targetIds = conversations.map(c => c._id.toString());

      if (targetIds.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ 
          success: false,
          error: ERROR_NO_CONVERSATIONS,
          processingTime: Date.now() - startTime
        });
      }
    }
    // No valid input
    else {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: ERROR_NO_INPUT,
        processingTime: Date.now() - startTime
      });
    }

    logger.info('Exporting conversations', {
      count: targetIds.length,
      format: format.toUpperCase(),
      businessId: req.businessId?.toString()
    });

    // Single conversation PDF export (different handling)
    if (targetIds.length === 1 && format === FORMAT_PDF) {
      const pdfDoc = await exportService.exportConversationToPDF(
        targetIds[0],
        req.businessId,
        { startDate, endDate }
      );

      res.setHeader('Content-Type', CONTENT_TYPE_PDF);
      res.setHeader('Content-Disposition', `attachment; filename="${FILENAME_PREFIX_CHAT}-${targetIds[0]}.${FORMAT_PDF}"`);
      
      return pdfDoc.pipe(res);
    }

    // Single conversation JSON/CSV export
    if (targetIds.length === 1) {
      let exportData;
      
      if (format === FORMAT_JSON) {
        exportData = await exportService.exportConversationToJSON(
          targetIds[0],
          req.businessId,
          { startDate, endDate }
        );
      } else if (format === FORMAT_CSV) {
        exportData = await exportService.exportConversationToCSV(
          targetIds[0],
          req.businessId,
          { startDate, endDate }
        );
      }

      const contentType = format === FORMAT_JSON ? CONTENT_TYPE_JSON : CONTENT_TYPE_CSV;
      const filename = `${FILENAME_PREFIX_CHAT}-${targetIds[0]}.${format}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.send(exportData);
    }

    // Bulk export (multiple conversations)
    if (format === FORMAT_PDF) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_PDF_SINGLE_ONLY,
        processingTime: Date.now() - startTime
      });
    }

    const exportData = await exportService.exportBulkConversations(
      targetIds,
      req.businessId,
      format,
      { startDate, endDate }
    );

    const contentType = format === FORMAT_JSON ? CONTENT_TYPE_JSON : CONTENT_TYPE_CSV;
    const filename = `${FILENAME_PREFIX_CONVERSATIONS}-${Date.now()}.${format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(exportData);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      success: false,
      error: error.message || ERROR_EXPORT_CONVERSATIONS,
      processingTime
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
router.post('/contacts', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { format = DEFAULT_FORMAT_CSV } = req.query;
    const { contactIds, tags, all = DEFAULT_ALL } = req.body;

    if (!VALID_CONTACT_FORMATS.includes(format)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: ERROR_INVALID_FORMAT_CONTACTS,
        processingTime: Date.now() - startTime
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
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: ERROR_NO_CONTACT_INPUT,
        processingTime: Date.now() - startTime
      });
    }

    const contacts = await Contact.find(query)
      .select(QUERY_FIELDS_CONTACT)
      .lean();

    if (contacts.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ 
        success: false,
        error: ERROR_NO_CONTACTS,
        processingTime: Date.now() - startTime
      });
    }

    logger.info('Exporting contacts', {
      count: contacts.length,
      format: format.toUpperCase(),
      businessId: req.businessId?.toString()
    });

    let exportData;

    if (format === FORMAT_JSON) {
      exportData = JSON.stringify(contacts, null, JSON_SPACING);
    } else {
      // CSV format
      const headers = CSV_HEADERS_CONTACTS;
      const rows = contacts.map(contact => [
        contact.name || '',
        contact.phone || '',
        contact.email || '',
        (contact.tags || []).join(CSV_FIELD_SEPARATOR),
        contact.createdAt ? new Date(contact.createdAt).toISOString() : '',
        contact.lastMessageAt ? new Date(contact.lastMessageAt).toISOString() : ''
      ]);

      exportData = [headers, ...rows]
        .map(row => row.map(field => `${CSV_QUOTE}${String(field).replace(new RegExp(CSV_QUOTE, 'g'), CSV_ESCAPED_QUOTE)}${CSV_QUOTE}`).join(CSV_DELIMITER))
        .join(CSV_ROW_SEPARATOR);
    }

    const contentType = format === FORMAT_JSON ? CONTENT_TYPE_JSON : CONTENT_TYPE_CSV;
    const filename = `${FILENAME_PREFIX_CONTACTS}-${Date.now()}.${format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(exportData);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      success: false,
      error: error.message || ERROR_EXPORT_CONTACTS,
      processingTime
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
router.get('/status/:id', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const processingTime = Date.now() - startTime;
    return res.status(STATUS_NOT_IMPLEMENTED).json({ 
      success: false,
      error: ERROR_TRACKING_NOT_IMPLEMENTED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      success: false,
      error: ERROR_EXPORT_STATUS,
      processingTime
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
router.get('/stats', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { conversationIds, startDate, endDate } = req.query;

    const ids = conversationIds ? 
      (Array.isArray(conversationIds) ? conversationIds : conversationIds.split(CSV_DELIMITER)) : 
      [];

    logger.info('Getting export stats', { 
      businessId: req.businessId?.toString() 
    });

    const stats = await exportService.getExportStats(
      req.businessId,
      ids,
      { startDate, endDate }
    );

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { stats },
      message: SUCCESS_STATS_RETRIEVED,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      success: false,
      error: ERROR_EXPORT_STATS,
      processingTime
    });
  }
});

module.exports = router;
