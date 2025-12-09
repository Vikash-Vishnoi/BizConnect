const AuditLog = require('../../../core/database/models/AuditLog');
const logger = require('../../../common/helpers/logger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

class AuditExportService {
  /**
   * Export audit logs with advanced filtering
   * @param {Object} filters - Filter criteria
   * @param {String} format - Export format (csv, json, excel, pdf)
   * @returns {Promise<Object>} Export result
   */
  async exportAuditLogs(filters = {}, format = 'csv') {
    try {
      const query = this.buildQuery(filters);

      const auditLogs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .populate('userId', 'email name')
        .populate('businessId', 'name phoneNumber')
        .lean();

      logger.info('Audit logs export requested', {
        filters,
        format,
        recordCount: auditLogs.length
      });

      switch (format.toLowerCase()) {
        case 'csv':
          return await this.exportToCSV(auditLogs);
        case 'json':
          return await this.exportToJSON(auditLogs);
        case 'excel':
          return await this.exportToExcel(auditLogs);
        case 'pdf':
          return await this.exportToPDF(auditLogs);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting audit logs:', error);
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
    if (filters.businessId) {
      query.businessId = filters.businessId;
    }

    // User filter
    if (filters.userId) {
      query.userId = filters.userId;
    }

    // Action filter
    if (filters.action) {
      query.action = filters.action;
    }

    // Resource type filter
    if (filters.resourceType) {
      query.resourceType = filters.resourceType;
    }

    // Status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};

      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }

      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }

    // IP address filter
    if (filters.ipAddress) {
      query.ipAddress = filters.ipAddress;
    }

    // User agent filter (partial match)
    if (filters.userAgent) {
      query.userAgent = new RegExp(filters.userAgent, 'i');
    }

    // Search in details (if MongoDB text index exists)
    if (filters.searchText) {
      query.$text = { $search: filters.searchText };
    }

    return query;
  }

  /**
   * Export to CSV format
   * @param {Array} auditLogs - Audit log records
   * @returns {Promise<Object>} CSV export result
   */
  async exportToCSV(auditLogs) {
    try {
      const fields = [
        { label: 'Timestamp', value: 'timestamp' },
        { label: 'User Email', value: 'userId.email' },
        { label: 'User Name', value: 'userId.name' },
        { label: 'Business Name', value: 'businessId.name' },
        { label: 'Action', value: 'action' },
        { label: 'Resource Type', value: 'resourceType' },
        { label: 'Resource ID', value: 'resourceId' },
        { label: 'Status', value: 'status' },
        { label: 'IP Address', value: 'ipAddress' },
        { label: 'User Agent', value: 'userAgent' },
        { label: 'Details', value: row => JSON.stringify(row.details || {}) }
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(auditLogs);

      return {
        data: csv,
        contentType: 'text/csv',
        filename: `audit_logs_${Date.now()}.csv`,
        recordCount: auditLogs.length
      };
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      throw new Error('CSV export failed');
    }
  }

  /**
   * Export to JSON format
   * @param {Array} auditLogs - Audit log records
   * @returns {Promise<Object>} JSON export result
   */
  async exportToJSON(auditLogs) {
    try {
      const jsonData = JSON.stringify({
        exportDate: new Date().toISOString(),
        recordCount: auditLogs.length,
        auditLogs: auditLogs
      }, null, 2);

      return {
        data: jsonData,
        contentType: 'application/json',
        filename: `audit_logs_${Date.now()}.json`,
        recordCount: auditLogs.length
      };
    } catch (error) {
      logger.error('Error exporting to JSON:', error);
      throw new Error('JSON export failed');
    }
  }

  /**
   * Export to Excel format
   * @param {Array} auditLogs - Audit log records
   * @returns {Promise<Object>} Excel export result
   */
  async exportToExcel(auditLogs) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Audit Logs');

      // Define columns
      worksheet.columns = [
        { header: 'Timestamp', key: 'timestamp', width: 20 },
        { header: 'User Email', key: 'userEmail', width: 25 },
        { header: 'User Name', key: 'userName', width: 20 },
        { header: 'Business Name', key: 'businessName', width: 25 },
        { header: 'Action', key: 'action', width: 20 },
        { header: 'Resource Type', key: 'resourceType', width: 20 },
        { header: 'Resource ID', key: 'resourceId', width: 30 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'IP Address', key: 'ipAddress', width: 20 },
        { header: 'User Agent', key: 'userAgent', width: 40 },
        { header: 'Details', key: 'details', width: 50 }
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add rows
      auditLogs.forEach(log => {
        worksheet.addRow({
          timestamp: new Date(log.timestamp).toISOString(),
          userEmail: log.userId?.email || 'N/A',
          userName: log.userId?.name || 'N/A',
          businessName: log.businessId?.name || 'N/A',
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId?.toString() || '',
          status: log.status,
          ipAddress: log.ipAddress || '',
          userAgent: log.userAgent || '',
          details: JSON.stringify(log.details || {})
        });
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return {
        data: buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `audit_logs_${Date.now()}.xlsx`,
        recordCount: auditLogs.length
      };
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw new Error('Excel export failed');
    }
  }

  /**
   * Export to PDF format
   * @param {Array} auditLogs - Audit log records
   * @returns {Promise<Object>} PDF export result
   */
  async exportToPDF(auditLogs) {
    try {
      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            data: buffer,
            contentType: 'application/pdf',
            filename: `audit_logs_${Date.now()}.pdf`,
            recordCount: auditLogs.length
          });
        });
        doc.on('error', reject);

        // Title
        doc.fontSize(18).text('Audit Log Export', { align: 'center' });
        doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
        doc.fontSize(10).text(`Total Records: ${auditLogs.length}`, { align: 'center' });
        doc.moveDown(2);

        // Table headers
        const startY = doc.y;
        doc.fontSize(8).font('Helvetica-Bold');
        
        // Logs (simplified for PDF)
        doc.font('Helvetica').fontSize(7);
        auditLogs.forEach((log, index) => {
          if (doc.y > 700) {
            doc.addPage();
          }

          doc.text(`${index + 1}. ${new Date(log.timestamp).toLocaleString()}`, { continued: true });
          doc.text(` | ${log.action}`, { continued: true });
          doc.text(` | ${log.userId?.email || 'N/A'}`, { continued: false });
          doc.fontSize(6).text(`   Resource: ${log.resourceType} (${log.resourceId?.toString() || 'N/A'})`, { indent: 15 });
          doc.fontSize(6).text(`   Status: ${log.status} | IP: ${log.ipAddress || 'N/A'}`, { indent: 15 });
          doc.moveDown(0.5);
          doc.fontSize(7);
        });

        doc.end();
      });
    } catch (error) {
      logger.error('Error exporting to PDF:', error);
      throw new Error('PDF export failed');
    }
  }

  /**
   * Get audit log statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Statistics
   */
  async getAuditStats(filters = {}) {
    try {
      const query = this.buildQuery(filters);

      const stats = await AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            failureCount: {
              $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
            },
            actions: { $addToSet: '$action' },
            resourceTypes: { $addToSet: '$resourceType' },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueBusinesses: { $addToSet: '$businessId' }
          }
        }
      ]);

      const actionBreakdown = await AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
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
    } catch (error) {
      logger.error('Error getting audit stats:', error);
      throw new Error('Failed to retrieve audit statistics');
    }
  }
}

module.exports = new AuditExportService();
