/**
 * Export Service
 * 
 * Handles exporting conversations to various formats:
 * - PDF: Formatted chat history with styling
 * - JSON: Raw data export for backup/analysis
 * - CSV: Spreadsheet-compatible format
 */

const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const Conversation = require('../../database/models/Conversation');
const Campaign = require('../../database/models/Campaign');

class ExportService {
  /**
   * Export single conversation to PDF
   */
  async exportConversationToPDF(conversationId, userId, options = {}) {
    try {
      console.log('📄 Exporting conversation to PDF:', conversationId);

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId,
        isDeleted: false
      }).lean();

      if (!conversation) {
        throw new Error('Conversation not found');
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
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      
      // Title
      doc.fontSize(20).font('Helvetica-Bold').text('WhatsApp Chat Export', { align: 'center' });
      doc.moveDown();

      // Contact Information
      doc.fontSize(12).font('Helvetica');
      doc.text(`Contact: ${conversation.contact.name || 'Unknown'}`, { continued: true });
      doc.text(` (${conversation.contact.phoneNumber})`);
      doc.text(`Exported: ${new Date().toLocaleString()}`);
      doc.text(`Messages: ${messages.length}`);
      doc.moveDown();

      // Separator
      doc.strokeColor('#cccccc').lineWidth(1)
         .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      // Messages
      for (const message of messages) {
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        const timestamp = new Date(message.timestamp).toLocaleString();
        const isOutgoing = message.direction === 'outgoing';
        
        // Message header
        doc.fontSize(9).font('Helvetica').fillColor('#666666');
        doc.text(timestamp, { continued: true });
        doc.text(` - ${isOutgoing ? 'You' : conversation.contact.name}`, { continued: true });
        
        if (message.status) {
          doc.text(` [${message.status}]`);
        } else {
          doc.text('');
        }
        
        // Message content
        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        
        let contentText = '';
        if (message.content.text) {
          contentText = message.content.text;
        } else if (message.type === 'image') {
          contentText = '📷 Image';
          if (message.content.caption) contentText += `: ${message.content.caption}`;
        } else if (message.type === 'video') {
          contentText = '🎥 Video';
          if (message.content.caption) contentText += `: ${message.content.caption}`;
        } else if (message.type === 'audio') {
          contentText = '🎤 Audio';
        } else if (message.type === 'document') {
          contentText = `📄 Document: ${message.content.filename || 'file'}`;
        } else if (message.type === 'sticker') {
          contentText = '😊 Sticker';
        } else if (message.type === 'location') {
          contentText = `📍 Location: ${message.content.location?.name || 'Shared location'}`;
        } else {
          contentText = `[${message.type}]`;
        }

        doc.text(contentText, { 
          indent: isOutgoing ? 30 : 0,
          align: isOutgoing ? 'right' : 'left'
        });
        
        doc.moveDown(0.5);
      }

      // End document
      doc.end();

      console.log('✅ PDF export complete');
      return doc;
    } catch (error) {
      console.error('❌ PDF export error:', error);
      throw error;
    }
  }

  /**
   * Export single conversation to JSON
   */
  async exportConversationToJSON(conversationId, userId, options = {}) {
    try {
      console.log('📦 Exporting conversation to JSON:', conversationId);

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId,
        isDeleted: false
      }).lean();

      if (!conversation) {
        throw new Error('Conversation not found');
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

      console.log('✅ JSON export complete');
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ JSON export error:', error);
      throw error;
    }
  }

  /**
   * Export single conversation to CSV
   */
  async exportConversationToCSV(conversationId, userId, options = {}) {
    try {
      console.log('📊 Exporting conversation to CSV:', conversationId);

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId,
        isDeleted: false
      }).lean();

      if (!conversation) {
        throw new Error('Conversation not found');
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
        From: msg.direction === 'outgoing' ? 'You' : conversation.contact.name,
        To: msg.direction === 'incoming' ? 'You' : conversation.contact.name,
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
        fields: ['Timestamp', 'Date', 'Time', 'From', 'To', 'Direction', 'Type', 'Message', 'Status', 'WhatsAppMessageId', 'MediaUrl', 'Caption']
      });

      const csv = parser.parse(csvData);

      console.log('✅ CSV export complete');
      return csv;
    } catch (error) {
      console.error('❌ CSV export error:', error);
      throw error;
    }
  }

  /**
   * Export multiple conversations (bulk export)
   */
  async exportBulkConversations(conversationIds, userId, format = 'json', options = {}) {
    try {
      console.log(`📦 Bulk exporting ${conversationIds.length} conversations to ${format.toUpperCase()}`);

      const conversations = await Conversation.find({
        _id: { $in: conversationIds },
        userId: userId,
        isDeleted: false
      }).lean();

      if (conversations.length === 0) {
        throw new Error('No conversations found');
      }

      if (format === 'json') {
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
      } else if (format === 'csv') {
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
          fields: ['ConversationId', 'ContactName', 'ContactPhone', 'Timestamp', 'Date', 'Time', 'Direction', 'Type', 'Message', 'Status', 'MediaUrl']
        });

        return parser.parse(allMessages);
      } else {
        throw new Error('Unsupported format for bulk export. Use json or csv.');
      }
    } catch (error) {
      console.error('❌ Bulk export error:', error);
      throw error;
    }
  }

  /**
   * Get export statistics
   */
  async getExportStats(userId, conversationIds = [], options = {}) {
    try {
      let query = { userId, isDeleted: false };
      
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

      return {
        conversations: conversations.length,
        totalMessages,
        dateRange: {
          earliest: dateRange.earliest?.toISOString() || null,
          latest: dateRange.latest?.toISOString() || null
        },
        messageTypes,
        estimatedSize: {
          json: Math.round(totalMessages * 0.5), // KB
          csv: Math.round(totalMessages * 0.3),  // KB
          pdf: Math.round(totalMessages * 1.0)   // KB
        }
      };
    } catch (error) {
      console.error('❌ Get export stats error:', error);
      throw error;
    }
  }
}

module.exports = new ExportService();
