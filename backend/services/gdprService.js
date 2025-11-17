const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const DataExport = require('../models/DataExport');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Template = require('../models/Template');
const Campaign = require('../models/Campaign');
const Analytics = require('../models/Analytics');
const AutomationRule = require('../models/AutomationRule');

/**
 * GDPR Service
 * Handles data export and deletion requests for GDPR compliance
 */

class GDPRService {
  /**
   * Process a data export request
   */
  async processExportRequest(requestId) {
    try {
      const request = await DataExport.findById(requestId).populate('userId');
      if (!request || request.status !== 'PENDING') {
        throw new Error('Invalid or already processed request');
      }

      await request.markAsProcessing();

      // Collect data based on requested types
      const userData = await this.collectUserData(request.userId._id, request.dataTypes);

      // Generate export file
      const exportPath = await this.generateExportFile(request, userData);

      // Get file size
      const stats = await fs.stat(exportPath);

      await request.markAsCompleted({
        exportUrl: exportPath,
        fileSize: stats.size
      });

      return {
        success: true,
        requestId,
        exportUrl: exportPath,
        fileSize: stats.size
      };
    } catch (error) {
      console.error('Export processing error:', error);
      
      const request = await DataExport.findById(requestId);
      if (request) {
        await request.markAsFailed(error.message);
      }

      throw error;
    }
  }

  /**
   * Collect user data based on requested types
   */
  async collectUserData(userId, dataTypes) {
    const data = {};

    for (const dataType of dataTypes) {
      switch (dataType) {
        case 'profile':
          data.profile = await this.exportProfile(userId);
          break;
        case 'conversations':
          data.conversations = await this.exportConversations(userId);
          break;
        case 'messages':
          data.messages = await this.exportMessages(userId);
          break;
        case 'contacts':
          data.contacts = await this.exportContacts(userId);
          break;
        case 'templates':
          data.templates = await this.exportTemplates(userId);
          break;
        case 'campaigns':
          data.campaigns = await this.exportCampaigns(userId);
          break;
        case 'analytics':
          data.analytics = await this.exportAnalytics(userId);
          break;
        case 'automations':
          data.automations = await this.exportAutomations(userId);
          break;
        case 'settings':
          data.settings = await this.exportSettings(userId);
          break;
        case 'audit_logs':
          data.auditLogs = await this.exportAuditLogs(userId);
          break;
      }
    }

    return data;
  }

  /**
   * Export user profile
   */
  async exportProfile(userId) {
    const user = await User.findById(userId).select('-password -__v');
    return user ? user.toObject() : null;
  }

  /**
   * Export conversations
   */
  async exportConversations(userId) {
    const Conversation = require('../models/Conversation');
    const conversations = await Conversation.find({ userId })
      .select('-__v')
      .lean();
    return conversations;
  }

  /**
   * Export messages
   */
  async exportMessages(userId) {
    const Conversation = require('../models/Conversation');
    const conversations = await Conversation.find({ userId })
      .select('messages')
      .lean();
    
    const allMessages = [];
    conversations.forEach(conv => {
      if (conv.messages) {
        allMessages.push(...conv.messages);
      }
    });
    
    return allMessages;
  }

  /**
   * Export contacts
   */
  async exportContacts(userId) {
    // Assuming contacts are stored in conversations
    const Conversation = require('../models/Conversation');
    const conversations = await Conversation.find({ userId })
      .select('contact phoneNumber name')
      .lean();
    
    return conversations.map(conv => ({
      phoneNumber: conv.phoneNumber,
      name: conv.contact?.name || conv.name,
      profilePic: conv.contact?.profilePic
    }));
  }

  /**
   * Export templates
   */
  async exportTemplates(userId) {
    const templates = await Template.find({ userId })
      .select('-__v')
      .lean();
    return templates;
  }

  /**
   * Export campaigns
   */
  async exportCampaigns(userId) {
    const campaigns = await Campaign.find({ userId })
      .select('-__v')
      .lean();
    return campaigns;
  }

  /**
   * Export analytics
   */
  async exportAnalytics(userId) {
    const analytics = await Analytics.find({ userId })
      .select('-__v')
      .lean();
    return analytics;
  }

  /**
   * Export automations
   */
  async exportAutomations(userId) {
    const automations = await AutomationRule.find({ userId })
      .select('-__v')
      .lean();
    return automations;
  }

  /**
   * Export user settings
   */
  async exportSettings(userId) {
    const user = await User.findById(userId).select('settings preferences notifications');
    return user ? {
      settings: user.settings,
      preferences: user.preferences,
      notifications: user.notifications
    } : null;
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(userId) {
    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find({ userId })
      .select('-__v')
      .limit(10000)  // Limit to last 10k logs
      .sort({ createdAt: -1 })
      .lean();
    return logs;
  }

  /**
   * Generate export file based on format
   */
  async generateExportFile(request, userData) {
    const exportDir = path.join(__dirname, '../exports');
    await fs.mkdir(exportDir, { recursive: true });

    const filename = `gdpr_export_${request.userId}_${Date.now()}`;
    
    switch (request.format) {
      case 'JSON':
        return await this.generateJSONExport(exportDir, filename, userData);
      case 'CSV':
        return await this.generateCSVExport(exportDir, filename, userData);
      case 'PDF':
        return await this.generatePDFExport(exportDir, filename, userData);
      default:
        return await this.generateJSONExport(exportDir, filename, userData);
    }
  }

  /**
   * Generate JSON export
   */
  async generateJSONExport(exportDir, filename, userData) {
    const filepath = path.join(exportDir, `${filename}.json`);
    await fs.writeFile(filepath, JSON.stringify(userData, null, 2));
    return filepath;
  }

  /**
   * Generate CSV export (simplified)
   */
  async generateCSVExport(exportDir, filename, userData) {
    const archivePath = path.join(exportDir, `${filename}.zip`);
    const output = require('fs').createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(archivePath));
      archive.on('error', reject);

      archive.pipe(output);

      // Add each data type as separate CSV
      for (const [type, data] of Object.entries(userData)) {
        if (Array.isArray(data)) {
          const csv = this.arrayToCSV(data);
          archive.append(csv, { name: `${type}.csv` });
        } else if (data) {
          const csv = this.objectToCSV(data);
          archive.append(csv, { name: `${type}.csv` });
        }
      }

      archive.finalize();
    });
  }

  /**
   * Generate PDF export (placeholder)
   */
  async generatePDFExport(exportDir, filename, userData) {
    // For now, generate JSON and return
    // TODO: Implement PDF generation with PDFKit or similar
    return await this.generateJSONExport(exportDir, filename, userData);
  }

  /**
   * Convert array to CSV
   */
  arrayToCSV(array) {
    if (!array || array.length === 0) return '';
    
    const headers = Object.keys(array[0]).join(',');
    const rows = array.map(obj => 
      Object.values(obj).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }

  /**
   * Convert object to CSV
   */
  objectToCSV(obj) {
    const rows = Object.entries(obj).map(([key, value]) => 
      `"${key}","${typeof value === 'string' ? value.replace(/"/g, '""') : value}"`
    );
    return ['Key,Value', ...rows].join('\n');
  }

  /**
   * Process a deletion request
   */
  async processDeletionRequest(requestId) {
    try {
      const request = await DataExport.findById(requestId).populate('userId');
      if (!request || request.status !== 'PENDING') {
        throw new Error('Invalid or already processed request');
      }

      await request.markAsProcessing();

      // Delete data based on requested types
      const deletedRecords = await this.deleteUserData(request.userId._id, request.deleteDataTypes);

      await request.markAsCompleted({ deletedRecords });

      return {
        success: true,
        requestId,
        deletedRecords
      };
    } catch (error) {
      console.error('Deletion processing error:', error);
      
      const request = await DataExport.findById(requestId);
      if (request) {
        await request.markAsFailed(error.message);
      }

      throw error;
    }
  }

  /**
   * Delete user data based on requested types
   */
  async deleteUserData(userId, deleteDataTypes) {
    const deletedRecords = {};

    for (const dataType of deleteDataTypes) {
      switch (dataType) {
        case 'conversations':
          deletedRecords.conversations = await this.deleteConversations(userId);
          break;
        case 'messages':
          deletedRecords.messages = await this.deleteMessages(userId);
          break;
        case 'contacts':
          deletedRecords.contacts = await this.deleteContacts(userId);
          break;
        case 'templates':
          deletedRecords.templates = await this.deleteTemplates(userId);
          break;
        case 'campaigns':
          deletedRecords.campaigns = await this.deleteCampaigns(userId);
          break;
        case 'analytics':
          deletedRecords.analytics = await this.deleteAnalytics(userId);
          break;
        case 'automations':
          deletedRecords.automations = await this.deleteAutomations(userId);
          break;
        case 'audit_logs':
          deletedRecords.auditLogs = await this.deleteAuditLogs(userId);
          break;
      }
    }

    return deletedRecords;
  }

  async deleteConversations(userId) {
    const Conversation = require('../models/Conversation');
    const result = await Conversation.deleteMany({ userId });
    return result.deletedCount;
  }

  async deleteMessages(userId) {
    const Conversation = require('../models/Conversation');
    const result = await Conversation.updateMany(
      { userId },
      { $set: { messages: [] } }
    );
    return result.modifiedCount;
  }

  async deleteContacts(userId) {
    // Contacts are embedded in conversations, already handled
    return 0;
  }

  async deleteTemplates(userId) {
    const result = await Template.deleteMany({ userId });
    return result.deletedCount;
  }

  async deleteCampaigns(userId) {
    const result = await Campaign.deleteMany({ userId });
    return result.deletedCount;
  }

  async deleteAnalytics(userId) {
    const result = await Analytics.deleteMany({ userId });
    return result.deletedCount;
  }

  async deleteAutomations(userId) {
    const result = await AutomationRule.deleteMany({ userId });
    return result.deletedCount;
  }

  async deleteAuditLogs(userId) {
    const AuditLog = require('../models/AuditLog');
    const result = await AuditLog.deleteMany({ userId });
    return result.deletedCount;
  }
}

module.exports = new GDPRService();
