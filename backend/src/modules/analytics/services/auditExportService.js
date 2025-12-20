const AuditLog = require('../../../core/database/models/AuditLog');
const logger = require('../../../common/helpers/logger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const { ERROR_CODES } = require('../../../common/constants');

// Constants
const AUDIT_EXPORT_CONSTANTS = {
  // Export Formats
  FORMAT_CSV: 'csv',
  FORMAT_JSON: 'json',
  FORMAT_EXCEL: 'excel',
  FORMAT_PDF: 'pdf',
  
  // Content Types
  CONTENT_TYPE_CSV: 'text/csv',
  CONTENT_TYPE_JSON: 'application/json',
  CONTENT_TYPE_EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  CONTENT_TYPE_PDF: 'application/pdf',
  
  // File Extensions
  FILE_EXT_CSV: '.csv',
  FILE_EXT_JSON: '.json',
  FILE_EXT_EXCEL: '.xlsx',
  FILE_EXT_PDF: '.pdf',
  
  // Default Values
  DEFAULT_NA: 'N/A',
  JSON_INDENT: 2,
  
  // CSV Fields
  CSV_FIELD_TIMESTAMP: 'Timestamp',
  CSV_FIELD_USER_EMAIL: 'User Email',
  CSV_FIELD_USER_NAME: 'User Name',
  CSV_FIELD_BUSINESS_NAME: 'Business Name',
  CSV_FIELD_ACTION: 'Action',
  CSV_FIELD_RESOURCE_TYPE: 'Resource Type',
  CSV_FIELD_RESOURCE_ID: 'Resource ID',
  CSV_FIELD_STATUS: 'Status',
  CSV_FIELD_IP_ADDRESS: 'IP Address',
  CSV_FIELD_USER_AGENT: 'User Agent',
  CSV_FIELD_DETAILS: 'Details',
  
  // Excel Settings
  EXCEL_SHEET_NAME: 'Audit Logs',
  EXCEL_HEADER_COLOR: 'FFE0E0E0',
  EXCEL_COLUMN_WIDTH_TIMESTAMP: 20,
  EXCEL_COLUMN_WIDTH_EMAIL: 25,
  EXCEL_COLUMN_WIDTH_NAME: 20,
  EXCEL_COLUMN_WIDTH_BUSINESS: 25,
  EXCEL_COLUMN_WIDTH_ACTION: 20,
  EXCEL_COLUMN_WIDTH_RESOURCE_TYPE: 20,
  EXCEL_COLUMN_WIDTH_RESOURCE_ID: 30,
  EXCEL_COLUMN_WIDTH_STATUS: 15,
  EXCEL_COLUMN_WIDTH_IP: 20,
  EXCEL_COLUMN_WIDTH_USER_AGENT: 40,
  EXCEL_COLUMN_WIDTH_DETAILS: 50,
  
  // PDF Settings
  PDF_PAGE_SIZE: 'A4',
  PDF_MARGIN: 30,
  PDF_TITLE_FONT_SIZE: 18,
  PDF_INFO_FONT_SIZE: 10,
  PDF_HEADER_FONT_SIZE: 8,
  PDF_CONTENT_FONT_SIZE: 7,
  PDF_DETAILS_FONT_SIZE: 6,
  PDF_PAGE_HEIGHT_LIMIT: 700,
  PDF_INDENT: 15,
  
  // Query Field Names
  FIELD_BUSINESS_ID: 'businessId',
  FIELD_USER_ID: 'userId',
  FIELD_ACTION: 'action',
  FIELD_RESOURCE_TYPE: 'resourceType',
  FIELD_STATUS: 'status',
  FIELD_TIMESTAMP: 'timestamp',
  FIELD_IP_ADDRESS: 'ipAddress',
  FIELD_USER_AGENT: 'userAgent',
  FIELD_RESOURCE_ID: 'resourceId',
  FIELD_DETAILS: 'details',
  
  // MongoDB Operators
  OPERATOR_GTE: '$gte',
  OPERATOR_LTE: '$lte',
  OPERATOR_TEXT_SEARCH: '$text',
  OPERATOR_SEARCH: '$search',
  
  // Sort Order
  SORT_DESC: -1,
  SORT_ASC: 1,
  
  // Populate Fields
  POPULATE_USER_FIELDS: 'email name',
  POPULATE_BUSINESS_FIELDS: 'name phoneNumber',
  
  // Status Values
  STATUS_SUCCESS: 'success',
  STATUS_FAILURE: 'failure',
  
  // Error Messages
  ERROR_UNSUPPORTED_FORMAT: 'Unsupported format',
  ERROR_CSV_EXPORT_FAILED: 'CSV export failed',
  ERROR_JSON_EXPORT_FAILED: 'JSON export failed',
  ERROR_EXCEL_EXPORT_FAILED: 'Excel export failed',
  ERROR_PDF_EXPORT_FAILED: 'PDF export failed',
  ERROR_STATS_FAILED: 'Failed to retrieve audit statistics'
};

class AuditExportService {
  /**
   * Export audit logs with advanced filtering
   * @param {Object} filters - Filter criteria
   * @param {String} format - Export format (csv, json, excel, pdf)
   * @returns {Promise<Object>} Export result
   */
  async exportAuditLogs(filters = {}, format = AUDIT_EXPORT_CONSTANTS.FORMAT_CSV) {
    const startTime = Date.now();
    try {
      logger.info('Audit logs export requested', {
        businessId: filters.businessId?.toString(),
        format,
        hasFilters: Object.keys(filters).length > 0
      });
      
      const query = this.buildQuery(filters);

      const auditLogs = await AuditLog.find(query)
        .sort({ [AUDIT_EXPORT_CONSTANTS.FIELD_TIMESTAMP]: AUDIT_EXPORT_CONSTANTS.SORT_DESC })
        .populate(AUDIT_EXPORT_CONSTANTS.FIELD_USER_ID, AUDIT_EXPORT_CONSTANTS.POPULATE_USER_FIELDS)
        .populate(AUDIT_EXPORT_CONSTANTS.FIELD_BUSINESS_ID, AUDIT_EXPORT_CONSTANTS.POPULATE_BUSINESS_FIELDS)
        .lean();

      logger.debug('Audit logs fetched for export', {
        businessId: filters.businessId?.toString(),
        recordCount: auditLogs.length,
        format
      });

      let result;
      const formatLower = format.toLowerCase();
      
      switch (formatLower) {
        case AUDIT_EXPORT_CONSTANTS.FORMAT_CSV:
          result = await this.exportToCSV(auditLogs);
          break;
        case AUDIT_EXPORT_CONSTANTS.FORMAT_JSON:
          result = await this.exportToJSON(auditLogs);
          break;
        case AUDIT_EXPORT_CONSTANTS.FORMAT_EXCEL:
          result = await this.exportToExcel(auditLogs);
          break;
        case AUDIT_EXPORT_CONSTANTS.FORMAT_PDF:
          result = await this.exportToPDF(auditLogs);
          break;
        default:
          const error = new Error(`${AUDIT_EXPORT_CONSTANTS.ERROR_UNSUPPORTED_FORMAT}: ${format}`);
          error.code = ERROR_CODES.VALIDATION_ERROR;
          throw error;
      }
      
      const processingTime = Date.now() - startTime;
      logger.info('Audit logs export completed', {
        businessId: filters.businessId?.toString(),
        format,
        recordCount: auditLogs.length,
        processingTime
      });
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Re-throw known errors
      if (error.code === ERROR_CODES.VALIDATION_ERROR) {
        throw error;
      }
      
      logger.error('Error exporting audit logs', {
        businessId: filters.businessId?.toString(),
        format,
        error: error.message,
        stack: error.stack,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Build MongoDB query from filters
   * @param {Object} filters - Filter criteria
   * @returns {Object} MongoDB query
   */
  buildQuery(filters) {
    const query = {};

    // Business filter
    if (filters[AUDIT_EXPORT_CONSTANTS.FIELD_BUSINESS_ID]) {
      query[AUDIT_EXPORT_CONSTANTS.FIELD_BUSINESS_ID] = filters[AUDIT_EXPORT_CONSTANTS.FIELD_BUSINESS_ID];
    }

    // User filter
    if (filters[AUDIT_EXPORT_CONSTANTS.FIELD_USER_ID]) {
      query[AUDIT_EXPORT_CONSTANTS.FIELD_USER_ID] = filters[AUDIT_EXPORT_CONSTANTS.FIELD_USER_ID];
    }

    // Action filter
    if (filters[AUDIT_EXPORT_CONSTANTS.FIELD_ACTION]) {
      query[AUDIT_EXPORT_CONSTANTS.FIELD_ACTION] = filters[AUDIT_EXPORT_CONSTANTS.FIELD_ACTION];
    }

    // Resource type filter
    if (filters[AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_TYPE]) {
      query[AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_TYPE] = filters[AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_TYPE];
    }

    // Status filter
    if (filters[AUDIT_EXPORT_CONSTANTS.FIELD_STATUS]) {
      query[AUDIT_EXPORT_CONSTANTS.FIELD_STATUS] = filters[AUDIT_EXPORT_CONSTANTS.FIELD_STATUS];
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query[AUDIT_EXPORT_CONSTANTS.FIELD_TIMESTAMP] = {};

      if (filters.startDate) {
        query[AUDIT_EXPORT_CONSTANTS.FIELD_TIMESTAMP][AUDIT_EXPORT_CONSTANTS.OPERATOR_GTE] = new Date(filters.startDate);
      }

      if (filters.endDate) {
        query[AUDIT_EXPORT_CONSTANTS.FIELD_TIMESTAMP][AUDIT_EXPORT_CONSTANTS.OPERATOR_LTE] = new Date(filters.endDate);
      }
    }

    // IP address filter
    if (filters[AUDIT_EXPORT_CONSTANTS.FIELD_IP_ADDRESS]) {
      query[AUDIT_EXPORT_CONSTANTS.FIELD_IP_ADDRESS] = filters[AUDIT_EXPORT_CONSTANTS.FIELD_IP_ADDRESS];
    }

    // User agent filter (partial match)
    if (filters[AUDIT_EXPORT_CONSTANTS.FIELD_USER_AGENT]) {
      query[AUDIT_EXPORT_CONSTANTS.FIELD_USER_AGENT] = new RegExp(filters[AUDIT_EXPORT_CONSTANTS.FIELD_USER_AGENT], 'i');
    }

    // Search in details (if MongoDB text index exists)
    if (filters.searchText) {
      query[AUDIT_EXPORT_CONSTANTS.OPERATOR_TEXT_SEARCH] = { 
        [AUDIT_EXPORT_CONSTANTS.OPERATOR_SEARCH]: filters.searchText 
      };
    }

    return query;
  }

  /**
   * Export to CSV format
   * @param {Array} auditLogs - Audit log records
   * @returns {Promise<Object>} CSV export result
   */
  async exportToCSV(auditLogs) {
    const startTime = Date.now();
    try {
      const fields = [
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_TIMESTAMP, value: AUDIT_EXPORT_CONSTANTS.FIELD_TIMESTAMP },
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_USER_EMAIL, value: `${AUDIT_EXPORT_CONSTANTS.FIELD_USER_ID}.email` },
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_USER_NAME, value: `${AUDIT_EXPORT_CONSTANTS.FIELD_USER_ID}.name` },
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_BUSINESS_NAME, value: `${AUDIT_EXPORT_CONSTANTS.FIELD_BUSINESS_ID}.name` },
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_ACTION, value: AUDIT_EXPORT_CONSTANTS.FIELD_ACTION },
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_RESOURCE_TYPE, value: AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_TYPE },
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_RESOURCE_ID, value: AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_ID },
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_STATUS, value: AUDIT_EXPORT_CONSTANTS.FIELD_STATUS },
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_IP_ADDRESS, value: AUDIT_EXPORT_CONSTANTS.FIELD_IP_ADDRESS },
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_USER_AGENT, value: AUDIT_EXPORT_CONSTANTS.FIELD_USER_AGENT },
        { label: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_DETAILS, value: row => JSON.stringify(row[AUDIT_EXPORT_CONSTANTS.FIELD_DETAILS] || {}) }
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(auditLogs);

      const processingTime = Date.now() - startTime;
      logger.debug('CSV export processing complete', {
        recordCount: auditLogs.length,
        processingTime
      });

      return {
        data: csv,
        contentType: AUDIT_EXPORT_CONSTANTS.CONTENT_TYPE_CSV,
        filename: `audit_logs_${Date.now()}${AUDIT_EXPORT_CONSTANTS.FILE_EXT_CSV}`,
        recordCount: auditLogs.length
      };
    } catch (error) {
      logger.error('Error exporting to CSV', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(AUDIT_EXPORT_CONSTANTS.ERROR_CSV_EXPORT_FAILED);
    }
  }

  /**
   * Export to JSON format
   * @param {Array} auditLogs - Audit log records
   * @returns {Promise<Object>} JSON export result
   */
  async exportToJSON(auditLogs) {
    const startTime = Date.now();
    try {
      const jsonData = JSON.stringify({
        exportDate: new Date().toISOString(),
        recordCount: auditLogs.length,
        auditLogs: auditLogs
      }, null, AUDIT_EXPORT_CONSTANTS.JSON_INDENT);

      const processingTime = Date.now() - startTime;
      logger.debug('JSON export processing complete', {
        recordCount: auditLogs.length,
        processingTime
      });

      return {
        data: jsonData,
        contentType: AUDIT_EXPORT_CONSTANTS.CONTENT_TYPE_JSON,
        filename: `audit_logs_${Date.now()}${AUDIT_EXPORT_CONSTANTS.FILE_EXT_JSON}`,
        recordCount: auditLogs.length
      };
    } catch (error) {
      logger.error('Error exporting to JSON', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(AUDIT_EXPORT_CONSTANTS.ERROR_JSON_EXPORT_FAILED);
    }
  }

  /**
   * Export to Excel format
   * @param {Array} auditLogs - Audit log records
   * @returns {Promise<Object>} Excel export result
   */
  async exportToExcel(auditLogs) {
    const startTime = Date.now();
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(AUDIT_EXPORT_CONSTANTS.EXCEL_SHEET_NAME);

      // Define columns
      worksheet.columns = [
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_TIMESTAMP, key: AUDIT_EXPORT_CONSTANTS.FIELD_TIMESTAMP, width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_TIMESTAMP },
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_USER_EMAIL, key: 'userEmail', width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_EMAIL },
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_USER_NAME, key: 'userName', width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_NAME },
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_BUSINESS_NAME, key: 'businessName', width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_BUSINESS },
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_ACTION, key: AUDIT_EXPORT_CONSTANTS.FIELD_ACTION, width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_ACTION },
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_RESOURCE_TYPE, key: AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_TYPE, width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_RESOURCE_TYPE },
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_RESOURCE_ID, key: AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_ID, width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_RESOURCE_ID },
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_STATUS, key: AUDIT_EXPORT_CONSTANTS.FIELD_STATUS, width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_STATUS },
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_IP_ADDRESS, key: AUDIT_EXPORT_CONSTANTS.FIELD_IP_ADDRESS, width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_IP },
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_USER_AGENT, key: AUDIT_EXPORT_CONSTANTS.FIELD_USER_AGENT, width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_USER_AGENT },
        { header: AUDIT_EXPORT_CONSTANTS.CSV_FIELD_DETAILS, key: AUDIT_EXPORT_CONSTANTS.FIELD_DETAILS, width: AUDIT_EXPORT_CONSTANTS.EXCEL_COLUMN_WIDTH_DETAILS }
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: AUDIT_EXPORT_CONSTANTS.EXCEL_HEADER_COLOR }
      };

      // Add rows
      auditLogs.forEach(log => {
        worksheet.addRow({
          [AUDIT_EXPORT_CONSTANTS.FIELD_TIMESTAMP]: new Date(log[AUDIT_EXPORT_CONSTANTS.FIELD_TIMESTAMP]).toISOString(),
          userEmail: log[AUDIT_EXPORT_CONSTANTS.FIELD_USER_ID]?.email || AUDIT_EXPORT_CONSTANTS.DEFAULT_NA,
          userName: log[AUDIT_EXPORT_CONSTANTS.FIELD_USER_ID]?.name || AUDIT_EXPORT_CONSTANTS.DEFAULT_NA,
          businessName: log[AUDIT_EXPORT_CONSTANTS.FIELD_BUSINESS_ID]?.name || AUDIT_EXPORT_CONSTANTS.DEFAULT_NA,
          [AUDIT_EXPORT_CONSTANTS.FIELD_ACTION]: log[AUDIT_EXPORT_CONSTANTS.FIELD_ACTION],
          [AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_TYPE]: log[AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_TYPE],
          [AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_ID]: log[AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_ID]?.toString() || '',
          [AUDIT_EXPORT_CONSTANTS.FIELD_STATUS]: log[AUDIT_EXPORT_CONSTANTS.FIELD_STATUS],
          [AUDIT_EXPORT_CONSTANTS.FIELD_IP_ADDRESS]: log[AUDIT_EXPORT_CONSTANTS.FIELD_IP_ADDRESS] || '',
          [AUDIT_EXPORT_CONSTANTS.FIELD_USER_AGENT]: log[AUDIT_EXPORT_CONSTANTS.FIELD_USER_AGENT] || '',
          [AUDIT_EXPORT_CONSTANTS.FIELD_DETAILS]: JSON.stringify(log[AUDIT_EXPORT_CONSTANTS.FIELD_DETAILS] || {})
        });
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      const processingTime = Date.now() - startTime;
      logger.debug('Excel export processing complete', {
        recordCount: auditLogs.length,
        processingTime
      });

      return {
        data: buffer,
        contentType: AUDIT_EXPORT_CONSTANTS.CONTENT_TYPE_EXCEL,
        filename: `audit_logs_${Date.now()}${AUDIT_EXPORT_CONSTANTS.FILE_EXT_EXCEL}`,
        recordCount: auditLogs.length
      };
    } catch (error) {
      logger.error('Error exporting to Excel', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(AUDIT_EXPORT_CONSTANTS.ERROR_EXCEL_EXPORT_FAILED);
    }
  }

  /**
   * Export to PDF format
   * @param {Array} auditLogs - Audit log records
   * @returns {Promise<Object>} PDF export result
   */
  async exportToPDF(auditLogs) {
    const startTime = Date.now();
    try {
      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ 
          margin: AUDIT_EXPORT_CONSTANTS.PDF_MARGIN, 
          size: AUDIT_EXPORT_CONSTANTS.PDF_PAGE_SIZE 
        });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const processingTime = Date.now() - startTime;
          
          logger.debug('PDF export processing complete', {
            recordCount: auditLogs.length,
            processingTime
          });
          
          resolve({
            data: buffer,
            contentType: AUDIT_EXPORT_CONSTANTS.CONTENT_TYPE_PDF,
            filename: `audit_logs_${Date.now()}${AUDIT_EXPORT_CONSTANTS.FILE_EXT_PDF}`,
            recordCount: auditLogs.length
          });
        });
        doc.on('error', reject);

        // Title
        doc.fontSize(AUDIT_EXPORT_CONSTANTS.PDF_TITLE_FONT_SIZE)
           .text('Audit Log Export', { align: 'center' });
        doc.fontSize(AUDIT_EXPORT_CONSTANTS.PDF_INFO_FONT_SIZE)
           .text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
        doc.fontSize(AUDIT_EXPORT_CONSTANTS.PDF_INFO_FONT_SIZE)
           .text(`Total Records: ${auditLogs.length}`, { align: 'center' });
        doc.moveDown(2);

        // Table headers
        doc.fontSize(AUDIT_EXPORT_CONSTANTS.PDF_HEADER_FONT_SIZE)
           .font('Helvetica-Bold');
        
        // Logs (simplified for PDF)
        doc.font('Helvetica')
           .fontSize(AUDIT_EXPORT_CONSTANTS.PDF_CONTENT_FONT_SIZE);
           
        auditLogs.forEach((log, index) => {
          if (doc.y > AUDIT_EXPORT_CONSTANTS.PDF_PAGE_HEIGHT_LIMIT) {
            doc.addPage();
          }

          doc.text(`${index + 1}. ${new Date(log[AUDIT_EXPORT_CONSTANTS.FIELD_TIMESTAMP]).toLocaleString()}`, { continued: true });
          doc.text(` | ${log[AUDIT_EXPORT_CONSTANTS.FIELD_ACTION]}`, { continued: true });
          doc.text(` | ${log[AUDIT_EXPORT_CONSTANTS.FIELD_USER_ID]?.email || AUDIT_EXPORT_CONSTANTS.DEFAULT_NA}`, { continued: false });
          doc.fontSize(AUDIT_EXPORT_CONSTANTS.PDF_DETAILS_FONT_SIZE)
             .text(`   Resource: ${log[AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_TYPE]} (${log[AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_ID]?.toString() || AUDIT_EXPORT_CONSTANTS.DEFAULT_NA})`, { indent: AUDIT_EXPORT_CONSTANTS.PDF_INDENT });
          doc.fontSize(AUDIT_EXPORT_CONSTANTS.PDF_DETAILS_FONT_SIZE)
             .text(`   Status: ${log[AUDIT_EXPORT_CONSTANTS.FIELD_STATUS]} | IP: ${log[AUDIT_EXPORT_CONSTANTS.FIELD_IP_ADDRESS] || AUDIT_EXPORT_CONSTANTS.DEFAULT_NA}`, { indent: AUDIT_EXPORT_CONSTANTS.PDF_INDENT });
          doc.moveDown(0.5);
          doc.fontSize(AUDIT_EXPORT_CONSTANTS.PDF_CONTENT_FONT_SIZE);
        });

        doc.end();
      });
    } catch (error) {
      logger.error('Error exporting to PDF', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(AUDIT_EXPORT_CONSTANTS.ERROR_PDF_EXPORT_FAILED);
    }
  }

  /**
   * Get audit log statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Statistics
   */
  async getAuditStats(filters = {}) {
    const startTime = Date.now();
    try {
      logger.info('Getting audit stats', {
        businessId: filters.businessId?.toString(),
        hasFilters: Object.keys(filters).length > 0
      });
      
      const query = this.buildQuery(filters);

      const stats = await AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: [`$${AUDIT_EXPORT_CONSTANTS.FIELD_STATUS}`, AUDIT_EXPORT_CONSTANTS.STATUS_SUCCESS] }, 1, 0] }
            },
            failureCount: {
              $sum: { $cond: [{ $eq: [`$${AUDIT_EXPORT_CONSTANTS.FIELD_STATUS}`, AUDIT_EXPORT_CONSTANTS.STATUS_FAILURE] }, 1, 0] }
            },
            actions: { $addToSet: `$${AUDIT_EXPORT_CONSTANTS.FIELD_ACTION}` },
            resourceTypes: { $addToSet: `$${AUDIT_EXPORT_CONSTANTS.FIELD_RESOURCE_TYPE}` },
            uniqueUsers: { $addToSet: `$${AUDIT_EXPORT_CONSTANTS.FIELD_USER_ID}` },
            uniqueBusinesses: { $addToSet: `$${AUDIT_EXPORT_CONSTANTS.FIELD_BUSINESS_ID}` }
          }
        }
      ]);

      const actionBreakdown = await AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: `$${AUDIT_EXPORT_CONSTANTS.FIELD_ACTION}`,
            count: { $sum: 1 }
          }
        },
        { $sort: { count: AUDIT_EXPORT_CONSTANTS.SORT_DESC } }
      ]);

      const result = {
        overview: stats[0] || {
          totalRecords: 0,
          successCount: 0,
          failureCount: 0,
          actions: [],
          resourceTypes: [],
          uniqueUsers: [],
          uniqueBusinesses: []
        },
        actionBreakdown,
        filters
      };

      const processingTime = Date.now() - startTime;
      logger.info('Audit stats calculated', {
        businessId: filters.businessId?.toString(),
        totalRecords: result.overview.totalRecords,
        processingTime
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error getting audit stats', {
        businessId: filters.businessId?.toString(),
        error: error.message,
        stack: error.stack,
        processingTime
      });
      throw new Error(AUDIT_EXPORT_CONSTANTS.ERROR_STATS_FAILED);
    }
  }
}

module.exports = new AuditExportService();
