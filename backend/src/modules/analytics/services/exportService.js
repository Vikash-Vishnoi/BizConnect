/**
 * Export Service
 * 
 * Handles exporting conversations to various formats:
 * - PDF: Formatted chat history with styling
 * - JSON: Raw data export for backup/analysis
 * - CSV: Spreadsheet-compatible format
 */

const PDFDocument = require('pdfkit');
const logger = require('../../../common/helpers/logger');
const { Parser } = require('json2csv');
const Conversation = require('../../../core/database/models/Conversation');
const Campaign = require('../../../core/database/models/Campaign');
const { ERROR_CODES } = require('../../../common/constants');

// Constants
const EXPORT_CONSTANTS = {
  // PDF Settings
  PDF_PAGE_SIZE: 'A4',
  PDF_MARGIN: 50,
  PDF_TITLE_FONT_SIZE: 20,
  PDF_HEADER_FONT_SIZE: 12,
  PDF_MESSAGE_FONT_SIZE: 11,
  PDF_TIMESTAMP_FONT_SIZE: 9,
  PDF_PAGE_HEIGHT_LIMIT: 700,
  PDF_LINE_Y_START: 50,
  PDF_LINE_Y_END: 545,
  PDF_MESSAGE_INDENT: 30,
  
  // Fonts
  FONT_BOLD: 'Helvetica-Bold',
  FONT_REGULAR: 'Helvetica',
  
  // Colors
  COLOR_GRAY: '#666666',
  COLOR_BLACK: '#000000',
  COLOR_SEPARATOR: '#cccccc',
  
  // Message Directions
  DIRECTION_OUTGOING: 'out',
  DIRECTION_INCOMING: 'in',
  
  // Message Types
  MESSAGE_TYPE_IMAGE: 'image',
  MESSAGE_TYPE_VIDEO: 'video',
  MESSAGE_TYPE_AUDIO: 'audio',
  MESSAGE_TYPE_DOCUMENT: 'document',
  MESSAGE_TYPE_STICKER: 'sticker',
  MESSAGE_TYPE_LOCATION: 'location',
  
  // Message Type Icons
  ICON_IMAGE: '📷',
  ICON_VIDEO: '🎥',
  ICON_AUDIO: '🎤',
  ICON_DOCUMENT: '📄',
  ICON_STICKER: '😊',
  ICON_LOCATION: '📍',
  
  // Export Formats
  FORMAT_PDF: 'pdf',
  FORMAT_JSON: 'json',
  FORMAT_CSV: 'csv',
  
  // CSV Fields
  CSV_FIELDS_SINGLE: ['Timestamp', 'Date', 'Time', 'From', 'To', 'Direction', 'Type', 'Message', 'Status', 'WhatsAppMessageId', 'MediaUrl', 'Caption'],
  CSV_FIELDS_BULK: ['ConversationId', 'ContactName', 'ContactPhone', 'Timestamp', 'Date', 'Time', 'Direction', 'Type', 'Message', 'Status', 'MediaUrl'],
  
  // Labels
  LABEL_YOU: 'You',
  LABEL_UNKNOWN: 'Unknown',
  LABEL_IMAGE_TEXT: 'Image',
  LABEL_VIDEO_TEXT: 'Video',
  LABEL_AUDIO_TEXT: 'Audio',
  LABEL_DOCUMENT_TEXT: 'Document',
  LABEL_STICKER_TEXT: 'Sticker',
  LABEL_LOCATION_TEXT: 'Location',
  LABEL_SHARED_LOCATION: 'Shared location',
  
  // Size Estimates (KB per message)
  SIZE_ESTIMATE_JSON: 0.5,
  SIZE_ESTIMATE_CSV: 0.3,
  SIZE_ESTIMATE_PDF: 1.0,
  
  // Error Messages
  ERROR_CONVERSATION_NOT_FOUND: 'Conversation not found',
  ERROR_NO_CONVERSATIONS_FOUND: 'No conversations found',
  ERROR_UNSUPPORTED_FORMAT: 'Unsupported format for bulk export. Use json or csv.',
  
  // Status
  STATUS_DELETED: false
};

class ExportService {
  /**
   * Export single conversation to PDF
   */
  async exportConversationToPDF(conversationId, userId, options = {}) {
    const startTime = Date.now();
    try {
      logger.info('Exporting conversation to PDF', { 
        conversationId, 
        userId: userId?.toString() 
      });

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId,
        isDeleted: EXPORT_CONSTANTS.STATUS_DELETED
      }).lean();

      if (!conversation) {
        const error = new Error(EXPORT_CONSTANTS.ERROR_CONVERSATION_NOT_FOUND);
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      // Filter messages by date if provided
      let messages = conversation.messages || [];
      if (options.startDate || options.endDate) {
        messages = messages.filter(msg => {
          const msgDate = new Date(msg.timestamp);
          if (options.startDate && msgDate < new Date(options.startDate)) return false;
          if (options.endDate && msgDate > new Date(options.endDate)) return false;
          return true;
        });
      }

      // Create PDF document
      const doc = new PDFDocument({ 
        size: EXPORT_CONSTANTS.PDF_PAGE_SIZE, 
        margin: EXPORT_CONSTANTS.PDF_MARGIN 
      });
      
      // Title
      doc.fontSize(EXPORT_CONSTANTS.PDF_TITLE_FONT_SIZE)
         .font(EXPORT_CONSTANTS.FONT_BOLD)
         .text('WhatsApp Chat Export', { align: 'center' });
      doc.moveDown();

      // Contact Information
      doc.fontSize(EXPORT_CONSTANTS.PDF_HEADER_FONT_SIZE)
         .font(EXPORT_CONSTANTS.FONT_REGULAR);
      doc.text(`Contact: ${conversation.contact.name || EXPORT_CONSTANTS.LABEL_UNKNOWN}`, { continued: true });
      doc.text(` (${conversation.contact.phoneNumber})`);
      doc.text(`Exported: ${new Date().toLocaleString()}`);
      doc.text(`Messages: ${messages.length}`);
      doc.moveDown();

      // Separator
      doc.strokeColor(EXPORT_CONSTANTS.COLOR_SEPARATOR)
         .lineWidth(1)
         .moveTo(EXPORT_CONSTANTS.PDF_MARGIN, doc.y)
         .lineTo(EXPORT_CONSTANTS.PDF_LINE_Y_END, doc.y)
         .stroke();
      doc.moveDown();

      // Messages
      for (const message of messages) {
        // Check if we need a new page
        if (doc.y > EXPORT_CONSTANTS.PDF_PAGE_HEIGHT_LIMIT) {
          doc.addPage();
        }

        const timestamp = new Date(message.timestamp).toLocaleString();
        const isOutgoing = message.direction === EXPORT_CONSTANTS.DIRECTION_OUTGOING;
        
        // Message header
        doc.fontSize(EXPORT_CONSTANTS.PDF_TIMESTAMP_FONT_SIZE)
           .font(EXPORT_CONSTANTS.FONT_REGULAR)
           .fillColor(EXPORT_CONSTANTS.COLOR_GRAY);
        doc.text(timestamp, { continued: true });
        doc.text(` - ${isOutgoing ? EXPORT_CONSTANTS.LABEL_YOU : conversation.contact.name}`, { continued: true });
        
        if (message.status) {
          doc.text(` [${message.status}]`);
        } else {
          doc.text('');
        }
        
        // Message content
        doc.fontSize(EXPORT_CONSTANTS.PDF_MESSAGE_FONT_SIZE)
           .font(EXPORT_CONSTANTS.FONT_REGULAR)
           .fillColor(EXPORT_CONSTANTS.COLOR_BLACK);
        
        let contentText = '';
        if (message.content.text) {
          contentText = message.content.text;
        } else if (message.type === EXPORT_CONSTANTS.MESSAGE_TYPE_IMAGE) {
          contentText = `${EXPORT_CONSTANTS.ICON_IMAGE} ${EXPORT_CONSTANTS.LABEL_IMAGE_TEXT}`;
          if (message.content.caption) contentText += `: ${message.content.caption}`;
        } else if (message.type === EXPORT_CONSTANTS.MESSAGE_TYPE_VIDEO) {
          contentText = `${EXPORT_CONSTANTS.ICON_VIDEO} ${EXPORT_CONSTANTS.LABEL_VIDEO_TEXT}`;
          if (message.content.caption) contentText += `: ${message.content.caption}`;
        } else if (message.type === EXPORT_CONSTANTS.MESSAGE_TYPE_AUDIO) {
          contentText = `${EXPORT_CONSTANTS.ICON_AUDIO} ${EXPORT_CONSTANTS.LABEL_AUDIO_TEXT}`;
        } else if (message.type === EXPORT_CONSTANTS.MESSAGE_TYPE_DOCUMENT) {
          contentText = `${EXPORT_CONSTANTS.ICON_DOCUMENT} ${EXPORT_CONSTANTS.LABEL_DOCUMENT_TEXT}: ${message.content.filename || 'file'}`;
        } else if (message.type === EXPORT_CONSTANTS.MESSAGE_TYPE_STICKER) {
          contentText = `${EXPORT_CONSTANTS.ICON_STICKER} ${EXPORT_CONSTANTS.LABEL_STICKER_TEXT}`;
        } else if (message.type === EXPORT_CONSTANTS.MESSAGE_TYPE_LOCATION) {
          contentText = `${EXPORT_CONSTANTS.ICON_LOCATION} ${EXPORT_CONSTANTS.LABEL_LOCATION_TEXT}: ${message.content.location?.name || EXPORT_CONSTANTS.LABEL_SHARED_LOCATION}`;
        } else {
          contentText = `[${message.type}]`;
        }

        doc.text(contentText, { 
          indent: isOutgoing ? EXPORT_CONSTANTS.PDF_MESSAGE_INDENT : 0,
          align: isOutgoing ? 'right' : 'left'
        });
        
        doc.moveDown(0.5);
      }

      // End document
      doc.end();

      const processingTime = Date.now() - startTime;
      logger.info('PDF export complete', { 
        conversationId, 
        userId: userId?.toString(),
        messageCount: messages.length,
        processingTime 
      });
      return doc;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Re-throw known errors
      if (error.code === ERROR_CODES.NOT_FOUND || error.code === ERROR_CODES.VALIDATION_ERROR) {
        throw error;
      }
      
      logger.error('PDF export error', {
        conversationId,
        userId: userId?.toString(),
        error: error.message,
        stack: error.stack,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Export single conversation to JSON
   */
  async exportConversationToJSON(conversationId, userId, options = {}) {
    const startTime = Date.now();
    try {
      logger.info('Exporting conversation to JSON', { 
        conversationId, 
        userId: userId?.toString() 
      });

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId,
        isDeleted: EXPORT_CONSTANTS.STATUS_DELETED
      }).lean();

      if (!conversation) {
        const error = new Error(EXPORT_CONSTANTS.ERROR_CONVERSATION_NOT_FOUND);
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      // Filter messages by date if provided
      let messages = conversation.messages || [];
      if (options.startDate || options.endDate) {
        messages = messages.filter(msg => {
          const msgDate = new Date(msg.timestamp);
          if (options.startDate && msgDate < new Date(options.startDate)) return false;
          if (options.endDate && msgDate > new Date(options.endDate)) return false;
          return true;
        });
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        contact: {
          name: conversation.contact.name,
          phoneNumber: conversation.contact.phoneNumber,
          email: conversation.contact.email
        },
        conversation: {
          id: conversation._id,
          status: conversation.status,
          createdAt: conversation.createdAt,
          lastMessageAt: conversation.lastMessageAt
        },
        messages: messages.map(msg => ({
          id: msg._id,
          whatsappMessageId: msg.whatsappMessageId,
          timestamp: msg.timestamp,
          direction: msg.direction,
          type: msg.type,
          status: msg.status,
          content: msg.content,
          from: msg.from,
          to: msg.to
        })),
        metadata: {
          totalMessages: messages.length,
          dateRange: {
            start: options.startDate || (messages.length > 0 ? messages[0].timestamp : null),
            end: options.endDate || (messages.length > 0 ? messages[messages.length - 1].timestamp : null)
          }
        }
      };

      const processingTime = Date.now() - startTime;
      logger.info('JSON export complete', { 
        conversationId,
        userId: userId?.toString(),
        messageCount: messages.length,
        processingTime 
      });
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Re-throw known errors
      if (error.code === ERROR_CODES.NOT_FOUND || error.code === ERROR_CODES.VALIDATION_ERROR) {
        throw error;
      }
      
      logger.error('JSON export error', {
        conversationId,
        userId: userId?.toString(),
        error: error.message,
        stack: error.stack,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Export single conversation to CSV
   */
  async exportConversationToCSV(conversationId, userId, options = {}) {
    const startTime = Date.now();
    try {
      logger.info('Exporting conversation to CSV', { 
        conversationId, 
        userId: userId?.toString() 
      });

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId,
        isDeleted: EXPORT_CONSTANTS.STATUS_DELETED
      }).lean();

      if (!conversation) {
        const error = new Error(EXPORT_CONSTANTS.ERROR_CONVERSATION_NOT_FOUND);
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      // Filter messages by date if provided
      let messages = conversation.messages || [];
      if (options.startDate || options.endDate) {
        messages = messages.filter(msg => {
          const msgDate = new Date(msg.timestamp);
          if (options.startDate && msgDate < new Date(options.startDate)) return false;
          if (options.endDate && msgDate > new Date(options.endDate)) return false;
          return true;
        });
      }

      // Prepare data for CSV
      const csvData = messages.map(msg => ({
        Timestamp: new Date(msg.timestamp).toISOString(),
        Date: new Date(msg.timestamp).toLocaleDateString(),
        Time: new Date(msg.timestamp).toLocaleTimeString(),
        From: msg.direction === EXPORT_CONSTANTS.DIRECTION_OUTGOING ? EXPORT_CONSTANTS.LABEL_YOU : conversation.contact.name,
        To: msg.direction === EXPORT_CONSTANTS.DIRECTION_INCOMING ? EXPORT_CONSTANTS.LABEL_YOU : conversation.contact.name,
        Direction: msg.direction,
        Type: msg.type,
        Message: msg.content.text || `[${msg.type}]`,
        Status: msg.status || '',
        WhatsAppMessageId: msg.whatsappMessageId || '',
        MediaUrl: msg.content.mediaUrl || '',
        Caption: msg.content.caption || ''
      }));

      // Convert to CSV
      const parser = new Parser({
        fields: EXPORT_CONSTANTS.CSV_FIELDS_SINGLE
      });

      const csv = parser.parse(csvData);

      const processingTime = Date.now() - startTime;
      logger.info('CSV export complete', { 
        conversationId,
        userId: userId?.toString(),
        messageCount: messages.length,
        processingTime 
      });
      return csv;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Re-throw known errors
      if (error.code === ERROR_CODES.NOT_FOUND || error.code === ERROR_CODES.VALIDATION_ERROR) {
        throw error;
      }
      
      logger.error('CSV export error', {
        conversationId,
        userId: userId?.toString(),
        error: error.message,
        stack: error.stack,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Export multiple conversations (bulk export)
   */
  async exportBulkConversations(conversationIds, userId, format = EXPORT_CONSTANTS.FORMAT_JSON, options = {}) {
    const startTime = Date.now();
    try {
      logger.info('Bulk exporting conversations', {
        count: conversationIds.length,
        format: format.toUpperCase(),
        userId: userId?.toString()
      });

      const conversations = await Conversation.find({
        _id: { $in: conversationIds },
        userId: userId,
        isDeleted: EXPORT_CONSTANTS.STATUS_DELETED
      }).lean();

      if (conversations.length === 0) {
        const error = new Error(EXPORT_CONSTANTS.ERROR_NO_CONVERSATIONS_FOUND);
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      if (format === EXPORT_CONSTANTS.FORMAT_JSON) {
        // Export all as single JSON file
        const exportData = {
          exportedAt: new Date().toISOString(),
          conversationsCount: conversations.length,
          conversations: conversations.map(conv => {
            let messages = conv.messages || [];
            
            // Filter by date
            if (options.startDate || options.endDate) {
              messages = messages.filter(msg => {
                const msgDate = new Date(msg.timestamp);
                if (options.startDate && msgDate < new Date(options.startDate)) return false;
                if (options.endDate && msgDate > new Date(options.endDate)) return false;
                return true;
              });
            }

            return {
              contact: {
                name: conv.contact.name,
                phoneNumber: conv.contact.phoneNumber
              },
              status: conv.status,
              messagesCount: messages.length,
              messages: messages.map(msg => ({
                timestamp: msg.timestamp,
                direction: msg.direction,
                type: msg.type,
                content: msg.content,
                status: msg.status
              }))
            };
          })
        };

        return JSON.stringify(exportData, null, 2);
      } else if (format === EXPORT_CONSTANTS.FORMAT_CSV) {
        // Export all messages to single CSV
        const allMessages = [];

        for (const conv of conversations) {
          let messages = conv.messages || [];
          
          // Filter by date
          if (options.startDate || options.endDate) {
            messages = messages.filter(msg => {
              const msgDate = new Date(msg.timestamp);
              if (options.startDate && msgDate < new Date(options.startDate)) return false;
              if (options.endDate && msgDate > new Date(options.endDate)) return false;
              return true;
            });
          }

          messages.forEach(msg => {
            allMessages.push({
              ConversationId: conv._id.toString(),
              ContactName: conv.contact.name,
              ContactPhone: conv.contact.phoneNumber,
              Timestamp: new Date(msg.timestamp).toISOString(),
              Date: new Date(msg.timestamp).toLocaleDateString(),
              Time: new Date(msg.timestamp).toLocaleTimeString(),
              Direction: msg.direction,
              Type: msg.type,
              Message: msg.content.text || `[${msg.type}]`,
              Status: msg.status || '',
              MediaUrl: msg.content.mediaUrl || ''
            });
          });
        }

        const parser = new Parser({
          fields: EXPORT_CONSTANTS.CSV_FIELDS_BULK
        });

        const result = parser.parse(allMessages);
        
        const processingTime = Date.now() - startTime;
        logger.info('Bulk CSV export complete', {
          userId: userId?.toString(),
          conversationCount: conversations.length,
          messageCount: allMessages.length,
          processingTime
        });
        
        return result;
      } else {
        const error = new Error(EXPORT_CONSTANTS.ERROR_UNSUPPORTED_FORMAT);
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Re-throw known errors
      if (error.code === ERROR_CODES.NOT_FOUND || error.code === ERROR_CODES.VALIDATION_ERROR) {
        throw error;
      }
      
      logger.error('Bulk export error', {
        count: conversationIds?.length,
        userId: userId?.toString(),
        format,
        error: error.message,
        stack: error.stack,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Get export statistics
   */
  async getExportStats(userId, conversationIds = [], options = {}) {
    const startTime = Date.now();
    try {
      logger.debug('Getting export stats', {
        userId: userId?.toString(),
        conversationCount: conversationIds.length
      });
      
      let query = { userId, isDeleted: EXPORT_CONSTANTS.STATUS_DELETED };
      
      if (conversationIds.length > 0) {
        query._id = { $in: conversationIds };
      }

      const conversations = await Conversation.find(query).lean();

      let totalMessages = 0;
      let dateRange = { earliest: null, latest: null };
      const messageTypes = {};

      for (const conv of conversations) {
        let messages = conv.messages || [];

        // Filter by date
        if (options.startDate || options.endDate) {
          messages = messages.filter(msg => {
            const msgDate = new Date(msg.timestamp);
            if (options.startDate && msgDate < new Date(options.startDate)) return false;
            if (options.endDate && msgDate > new Date(options.endDate)) return false;
            return true;
          });
        }

        totalMessages += messages.length;

        messages.forEach(msg => {
          // Track date range
          const msgDate = new Date(msg.timestamp);
          if (!dateRange.earliest || msgDate < dateRange.earliest) {
            dateRange.earliest = msgDate;
          }
          if (!dateRange.latest || msgDate > dateRange.latest) {
            dateRange.latest = msgDate;
          }

          // Track message types
          messageTypes[msg.type] = (messageTypes[msg.type] || 0) + 1;
        });
      }

      const stats = {
        conversations: conversations.length,
        totalMessages,
        dateRange: {
          earliest: dateRange.earliest?.toISOString() || null,
          latest: dateRange.latest?.toISOString() || null
        },
        messageTypes,
        estimatedSize: {
          json: Math.round(totalMessages * EXPORT_CONSTANTS.SIZE_ESTIMATE_JSON),
          csv: Math.round(totalMessages * EXPORT_CONSTANTS.SIZE_ESTIMATE_CSV),
          pdf: Math.round(totalMessages * EXPORT_CONSTANTS.SIZE_ESTIMATE_PDF)
        }
      };
      
      const processingTime = Date.now() - startTime;
      logger.info('Export stats calculated', {
        userId: userId?.toString(),
        conversationCount: stats.conversations,
        totalMessages,
        processingTime
      });
      
      return stats;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Get export stats error', { 
        userId: userId?.toString(),
        error: error.message,
        stack: error.stack,
        processingTime
      });
      throw error;
    }
  }
}

module.exports = new ExportService();
