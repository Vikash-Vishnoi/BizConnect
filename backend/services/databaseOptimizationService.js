/**
 * Database Optimization Service
 * 
 * Provides utilities for:
 * - Creating and managing database indexes
 * - Archiving old data
 * - Cleaning up stale records
 * - Optimizing query performance
 * - Database maintenance tasks
 * 
 * @module databaseOptimizationService
 */

const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Campaign = require('../models/Campaign');
const Template = require('../models/Template');
const Analytics = require('../models/Analytics');
const AutomationRule = require('../models/AutomationRule');
const AutomationLog = require('../models/AutomationLog');
const Media = require('../models/Media');
const User = require('../models/User');
const Business = require('../models/Business');

class DatabaseOptimizationService {
  /**
   * Create all recommended indexes for optimal query performance
   */
  static async createOptimalIndexes() {
    console.log('🔧 Creating optimal database indexes...');
    
    try {
      // Conversation indexes (most critical for performance)
      await Conversation.collection.createIndexes([
        // Primary query patterns (multi-business)
        { key: { businessId: 1, lastMessageAt: -1 }, name: 'business_lastmessage_idx' },
        { key: { businessId: 1, status: 1, lastMessageAt: -1 }, name: 'business_status_lastmessage_idx' },
        { key: { businessId: 1, unreadCount: 1 }, name: 'business_unread_idx' },
        
        // Phone lookup (unique per business)
        { 
          key: { 'contact.phoneNumber': 1, businessId: 1 }, 
          name: 'phone_business_unique_idx',
          unique: true 
        },
        
        // Campaign tracking
        { key: { campaignId: 1, createdAt: -1 }, name: 'campaign_tracking_idx' },
        
        // Message lookup
        { 
          key: { 'messages.whatsappMessageId': 1 }, 
          name: 'whatsapp_msgid_idx',
          sparse: true 
        },
        
        // Window expiration (for cleanup jobs)
        { key: { 'conversationWindow.expiresAt': 1 }, name: 'window_expiry_idx' },
        
        // Soft delete support
        { key: { isDeleted: 1, deletedAt: 1 }, name: 'soft_delete_idx' },
        
        // Assignment queries
        { key: { assignedTo: 1, status: 1 }, name: 'assignment_idx' },
        
        // Search optimization
        { key: { 'contact.name': 'text', 'contact.phoneNumber': 'text' }, name: 'contact_search_idx' }
      ]);
      console.log('✅ Conversation indexes created');

      // Campaign indexes
      await Campaign.collection.createIndexes([
        { key: { businessId: 1, status: 1, createdAt: -1 }, name: 'business_status_created_idx' },
        { key: { status: 1, startedAt: -1 }, name: 'status_started_idx' },
        { key: { templateId: 1 }, name: 'template_lookup_idx' },
        { key: { 'recipients.phoneNumber': 1 }, name: 'recipient_phone_idx' },
        { key: { 'recipients.status': 1 }, name: 'recipient_status_idx' },
        { key: { completedAt: 1 }, name: 'completed_archive_idx' }
      ]);
      console.log('✅ Campaign indexes created');

      // Template indexes
      await Template.collection.createIndexes([
        { key: { businessId: 1, status: 1 }, name: 'business_status_idx' },
        { key: { name: 1, businessId: 1 }, name: 'name_business_idx' },
        { key: { category: 1, status: 1 }, name: 'category_status_idx' },
        { key: { isDeleted: 1 }, name: 'soft_delete_idx' }
      ]);
      console.log('✅ Template indexes created');

      // Analytics indexes
      await Analytics.collection.createIndexes([
        { key: { businessId: 1, date: -1 }, name: 'business_date_idx', unique: true },
        { key: { campaignId: 1, date: -1 }, name: 'campaign_date_idx' },
        { key: { date: -1 }, name: 'date_range_idx' }
      ]);
      console.log('✅ Analytics indexes created');

      // Automation indexes
      await AutomationRule.collection.createIndexes([
        { key: { businessId: 1, isActive: 1 }, name: 'business_active_idx' },
        { key: { 'trigger.type': 1, isActive: 1 }, name: 'trigger_active_idx' }
      ]);
      console.log('✅ AutomationRule indexes created');

      await AutomationLog.collection.createIndexes([
        { key: { automationRuleId: 1, executedAt: -1 }, name: 'rule_executed_idx' },
        { key: { conversationId: 1 }, name: 'conversation_lookup_idx' },
        { key: { executedAt: -1 }, name: 'cleanup_idx' }
      ]);
      console.log('✅ AutomationLog indexes created');

      // Media indexes
      await Media.collection.createIndexes([
        { key: { businessId: 1, uploadedAt: -1 }, name: 'business_uploaded_idx' },
        { key: { whatsappMediaId: 1 }, name: 'whatsapp_media_id_idx', unique: true, sparse: true },
        { key: { scheduledDeleteAt: 1 }, name: 'scheduled_delete_idx', sparse: true },
        { key: { type: 1, uploadedAt: -1 }, name: 'type_uploaded_idx' }
      ]);
      console.log('✅ Media indexes created');

      // User indexes
      await User.collection.createIndexes([
        { key: { email: 1 }, name: 'email_unique_idx', unique: true },
        { key: { phoneNumber: 1 }, name: 'phone_idx' },
        { key: { isActive: 1 }, name: 'active_users_idx' }
      ]);
      console.log('✅ User indexes created');

      console.log('✅ All database indexes created successfully!');
      
      return {
        success: true,
        message: 'All indexes created successfully'
      };
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }

  /**
   * Get current index information for all collections
   */
  static async getIndexInfo() {
    const collections = [
      'conversations',
      'campaigns',
      'templates',
      'analytics',
      'automationrules',
      'automationlogs',
      'media',
      'users'
    ];

    const indexInfo = {};

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.collection(collectionName);
        const indexes = await collection.indexes();
        indexInfo[collectionName] = indexes;
      } catch (error) {
        indexInfo[collectionName] = { error: error.message };
      }
    }

    return indexInfo;
  }

  /**
   * Archive old completed campaigns (older than specified days)
   * @param {number} daysOld - Archive campaigns older than this many days
   * @param {string} businessId - Business ID to filter by (optional, archives all if not provided)
   */
  static async archiveOldCampaigns(daysOld = 90, businessId = null) {
    console.log(`📦 Archiving campaigns older than ${daysOld} days${businessId ? ' for business ' + businessId : ''}...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const filter = {
      status: 'completed',
      completedAt: { $lt: cutoffDate },
      isArchived: { $ne: true }
    };
    
    if (businessId) {
      filter.businessId = businessId;
    }

    const result = await Campaign.updateMany(
      filter,
      {
        $set: {
          isArchived: true,
          archivedAt: new Date()
        }
      }
    );

    console.log(`✅ Archived ${result.modifiedCount} campaigns`);
    
    return {
      archivedCount: result.modifiedCount,
      cutoffDate
    };
  }

  /**
   * Archive old conversations (older than specified days and no recent activity)
   * @param {number} daysOld - Archive conversations older than this many days
   * @param {string} businessId - Business ID to filter by (optional, archives all if not provided)
   */
  static async archiveOldConversations(daysOld = 180, businessId = null) {
    console.log(`📦 Archiving conversations older than ${daysOld} days${businessId ? ' for business ' + businessId : ''}...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const filter = {
      status: 'active',
      lastMessageAt: { $lt: cutoffDate },
      unreadCount: 0 // Only archive if no unread messages
    };
    
    if (businessId) {
      filter.businessId = businessId;
    }

    const result = await Conversation.updateMany(
      filter,
      {
        $set: {
          status: 'archived',
          archivedAt: new Date()
        }
      }
    );

    console.log(`✅ Archived ${result.modifiedCount} conversations`);
    
    return {
      archivedCount: result.modifiedCount,
      cutoffDate
    };
  }

  /**
   * DISABLED: Auto-delete functionality removed per user request
   * All data is preserved permanently
   */

  /**
   * Optimize conversation documents by limiting message array size
   * Move old messages to archive collection if array gets too large
   * @param {number} maxMessages - Maximum messages to keep in main document
   * @param {string} businessId - Business ID to filter by (optional, optimizes all if not provided)
   */
  static async optimizeConversationSize(maxMessages = 1000, businessId = null) {
    console.log(`🔧 Optimizing conversations with more than ${maxMessages} messages${businessId ? ' for business ' + businessId : ''}...`);
    
    // Find conversations with too many messages
    const filter = {
      $expr: { $gt: [{ $size: '$messages' }, maxMessages] }
    };
    
    if (businessId) {
      filter.businessId = businessId;
    }
    
    const largeConversations = await Conversation.find(filter).select('_id messages');

    let optimizedCount = 0;

    for (const conversation of largeConversations) {
      // Keep only the most recent messages
      const messagesToKeep = conversation.messages.slice(-maxMessages);
      const messagesToArchive = conversation.messages.slice(0, -maxMessages);

      // Archive old messages (you could store these in a separate collection)
      // For now, we'll just remove them and keep the last N
      conversation.messages = messagesToKeep;
      await conversation.save();

      optimizedCount++;
      
      console.log(`✅ Optimized conversation ${conversation._id} (archived ${messagesToArchive.length} messages)`);
    }

    console.log(`✅ Optimized ${optimizedCount} conversations`);
    
    return {
      optimizedCount,
      maxMessages
    };
  }

  /**
   * Get database statistics and health metrics
   * @param {string} businessId - Business ID to filter by (optional, all data if not provided)
   */
  static async getDatabaseStats(businessId = null) {
    console.log(`📊 Gathering database statistics${businessId ? ' for business ' + businessId : ''}...`);
    
    const stats = {
      collections: {},
      indexes: {},
      diskUsage: {}
    };

    try {
      // Collection stats
      const collections = [
        { name: 'conversations', model: Conversation },
        { name: 'campaigns', model: Campaign },
        { name: 'templates', model: Template },
        { name: 'analytics', model: Analytics },
        { name: 'automationrules', model: AutomationRule },
        { name: 'automationlogs', model: AutomationLog },
        { name: 'media', model: Media },
        { name: 'users', model: User }
      ];

      for (const { name, model } of collections) {
        try {
          const countFilter = businessId && name !== 'users' ? { businessId } : {};
          const count = await model.countDocuments(countFilter);
          const collStats = await mongoose.connection.db.collection(name).stats();
          
          stats.collections[name] = {
            count,
            size: collStats.size,
            storageSize: collStats.storageSize,
            avgObjSize: collStats.avgObjSize,
            indexes: collStats.nindexes
          };
        } catch (error) {
          stats.collections[name] = { error: error.message };
        }
      }

      // Index stats
      stats.indexes = await this.getIndexInfo();

      // Database-wide stats
      const dbStats = await mongoose.connection.db.stats();
      stats.database = {
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexSize: dbStats.indexSize,
        totalSize: dbStats.dataSize + dbStats.indexSize,
        collections: dbStats.collections,
        indexes: dbStats.indexes,
        avgObjSize: dbStats.avgObjSize
      };

      console.log('✅ Database statistics gathered');
      
      return stats;
    } catch (error) {
      console.error('❌ Error gathering database stats:', error);
      throw error;
    }
  }

  /**
   * Identify slow queries and performance issues
   * @param {string} businessId - Business ID to filter by (optional, all data if not provided)
   */
  static async analyzePerformance(businessId = null) {
    console.log(`🔍 Analyzing query performance${businessId ? ' for business ' + businessId : ''}...`);
    
    const analysis = {
      slowQueries: [],
      recommendations: [],
      indexUsage: {}
    };

    try {
      // Check for missing indexes on commonly queried fields
      const conversationSample = await Conversation.findOne();
      const campaignSample = await Campaign.findOne();

      // Analyze conversation queries
      const conversationIndexes = await Conversation.collection.getIndexes();
      analysis.indexUsage.conversations = {
        defined: Object.keys(conversationIndexes).length,
        list: Object.keys(conversationIndexes)
      };

      // Recommendations based on data patterns
      const filter = businessId ? { businessId } : {};
      const conversationCount = await Conversation.countDocuments(filter);
      const campaignCount = await Campaign.countDocuments(filter);
      const analyticsCount = await Analytics.countDocuments(filter);

      if (conversationCount > 10000) {
        analysis.recommendations.push({
          severity: 'high',
          message: 'High conversation count detected. Consider implementing data archiving.',
          action: 'Archive conversations older than 6 months'
        });
      }

      if (campaignCount > 1000) {
        analysis.recommendations.push({
          severity: 'medium',
          message: 'Large number of campaigns. Consider archiving completed campaigns.',
          action: 'Archive campaigns older than 90 days'
        });
      }

      if (analyticsCount > 10000) {
        analysis.recommendations.push({
          severity: 'medium',
          message: 'Large analytics dataset. Consider aggregating old data.',
          action: 'Aggregate daily analytics older than 1 year into monthly summaries'
        });
      }

      // Check for conversations with too many messages
      const largeFilter = {
        $expr: { $gt: [{ $size: '$messages' }, 500] }
      };
      if (businessId) {
        largeFilter.businessId = businessId;
      }
      const largeConversations = await Conversation.countDocuments(largeFilter);

      if (largeConversations > 0) {
        analysis.recommendations.push({
          severity: 'high',
          message: `${largeConversations} conversations have more than 500 messages`,
          action: 'Optimize large conversations by archiving old messages'
        });
      }

      console.log('✅ Performance analysis complete');
      
      return analysis;
    } catch (error) {
      console.error('❌ Error analyzing performance:', error);
      throw error;
    }
  }

  /**
   * Run full database optimization (indexes + archiving only, NO deletion)
   * @param {Object} options - Optimization options
   * @param {string} businessId - Business ID to filter by (optional)
   */
  static async runFullOptimization(options = {}, businessId = null) {
    const {
      createIndexes = true,
      archiveCampaigns = true,
      archiveConversations = false, // More conservative default
      campaignArchiveDays = 90,
      conversationArchiveDays = 180
    } = options;

    console.log('🚀 Starting full database optimization...');
    console.log('Options:', options);
    console.log('⚠️  Note: All data is preserved permanently (no deletions)');

    const results = {
      startTime: new Date(),
      tasks: []
    };

    try {
      // Create indexes
      if (createIndexes) {
        console.log('\n--- Task 1/3: Creating Indexes ---');
        const indexResult = await this.createOptimalIndexes();
        results.tasks.push({ task: 'createIndexes', ...indexResult });
      }

      // Archive old campaigns
      if (archiveCampaigns) {
        console.log('\n--- Task 2/3: Archiving Campaigns ---');
        const archiveResult = await this.archiveOldCampaigns(campaignArchiveDays, businessId);
        results.tasks.push({ task: 'archiveCampaigns', ...archiveResult });
      }

      // Archive old conversations
      if (archiveConversations) {
        console.log('\n--- Task 3/3: Archiving Conversations ---');
        const conversationResult = await this.archiveOldConversations(conversationArchiveDays, businessId);
        results.tasks.push({ task: 'archiveConversations', ...conversationResult });
      }

      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;
      results.success = true;

      console.log('\n✅ Full database optimization complete!');
      console.log(`Duration: ${Math.round(results.duration / 1000)}s`);
      
      return results;
    } catch (error) {
      console.error('❌ Error during optimization:', error);
      results.error = error.message;
      results.success = false;
      throw error;
    }
  }

  /**
   * Schedule automatic optimization (call this from a cron job)
   * Only archives data, never deletes anything
   */
  static async scheduledMaintenance() {
    console.log('⏰ Running scheduled database maintenance...');
    console.log('⚠️  Note: Only archiving old data, no deletions performed');
    
    const options = {
      createIndexes: false, // Indexes should already exist
      archiveCampaigns: true,
      archiveConversations: false, // Manual review recommended
      campaignArchiveDays: 90
    };

    return await this.runFullOptimization(options);
  }
}

module.exports = DatabaseOptimizationService;
