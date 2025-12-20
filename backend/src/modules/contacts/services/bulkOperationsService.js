/**
 * Bulk Operations Service
 * 
 * Handles bulk operations on conversations and messages
 * - Bulk archive/unarchive conversations
 * - Bulk tag/untag conversations
 * - Bulk assign conversations
 * - Bulk export conversations
 * 
 * Note: Bulk mark as read and bulk delete functionality excluded per user request
 * 
 * @module bulkOperationsService
 */

const Conversation = require('../../../core/database/models/Conversation');
const mongoose = require('mongoose');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES } = require('../../../common/constants');
const { validateBulkArray, validateNonEmptyString } = require('../../../common/helpers/validationHelpers');

/**
 * Bulk Operations Constants
 */
const MAX_BULK_OPERATIONS = parseInt(process.env.MAX_BULK_OPERATIONS) || 100;
const MAX_TAGS_PER_OPERATION = parseInt(process.env.MAX_TAGS_PER_OPERATION) || 10;
const MAX_BULK_EXPORT = 500;
const MAX_TAG_STATS_LIMIT = 20;

const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  CLOSED: 'closed',
  BLOCKED: 'blocked'
};

const VALID_STATUSES = Object.values(CONVERSATION_STATUS);

class BulkOperationsService {
  constructor() {
    this.maxBulkLimit = MAX_BULK_OPERATIONS;
  }

  /**
   * Bulk archive conversations
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Operation results
   */
  async bulkArchiveConversations(conversationIds, userId) {
    const startTime = Date.now();
    
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      logger.info('Bulk archiving conversations', { 
        count: conversationIds.length, 
        userId: userId.toString() 
      });

      validateBulkArray(conversationIds, 'conversation IDs', this.maxBulkLimit);

      const result = await Conversation.updateMany(
        {
          _id: { $in: conversationIds },
          userId: userId,
          status: { $ne: CONVERSATION_STATUS.ARCHIVED } // Only archive non-archived conversations
        },
        {
          $set: {
            status: CONVERSATION_STATUS.ARCHIVED,
            archivedAt: new Date()
          }
        }
      );

      logger.info('Bulk archive completed', { 
        archivedCount: result.modifiedCount, 
        requested: conversationIds.length,
        userId: userId.toString(),
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        archivedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Bulk archive failed', { 
        error: error.message, 
        userId: userId?.toString(),
        code: ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      throw error;
    }
  }

  /**
   * Bulk unarchive conversations
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Operation results
   */
  async bulkUnarchiveConversations(conversationIds, userId) {
    try {
      logger.info('Bulk unarchiving conversations', { count: conversationIds.length, userId });

      validateBulkArray(conversationIds, 'conversation IDs', this.maxBulkLimit);

      const result = await Conversation.updateMany(
        {
          _id: { $in: conversationIds },
          userId: userId,
          status: 'archived'
        },
        {
          $set: {
            status: 'active'
          },
          $unset: {
            archivedAt: ''
          }
        }
      );

      logger.info('Bulk unarchive completed', { unarchivedCount: result.modifiedCount });

      return {
        success: true,
        unarchivedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Bulk unarchive failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Bulk assign conversations to a user/team member
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID (owner)
   * @param {string} assignToUserId - User ID to assign to
   * @param {string} assignToUserName - User name to assign to
   * @returns {Promise<Object>} - Operation results
   */
  async bulkAssignConversations(conversationIds, userId, assignToUserId, assignToUserName) {
    try {
      logger.info('Bulk assigning conversations', { count: conversationIds.length, assignTo: assignToUserName });

      validateBulkArray(conversationIds, 'conversation IDs', this.maxBulkLimit);
      validateNonEmptyString(assignToUserId, 'Assignment target user ID');
      validateNonEmptyString(assignToUserName, 'Assignment target user name');

      const result = await Conversation.updateMany(
        {
          _id: { $in: conversationIds },
          userId: userId
        },
        {
          $set: {
            assignedTo: assignToUserId,
            assignedToName: assignToUserName,
            assignedAt: new Date()
          }
        }
      );

      logger.info('Bulk assign completed', { assignedCount: result.modifiedCount, assignTo: assignToUserName });

      return {
        success: true,
        assignedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        assignedTo: {
          id: assignToUserId,
          name: assignToUserName
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Bulk assign failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Bulk unassign conversations
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Operation results
   */
  async bulkUnassignConversations(conversationIds, userId) {
    try {
      logger.info('Bulk unassigning conversations', { count: conversationIds.length, userId });

      validateBulkArray(conversationIds, 'conversation IDs', this.maxBulkLimit);

      const result = await Conversation.updateMany(
        {
          _id: { $in: conversationIds },
          userId: userId
        },
        {
          $unset: {
            assignedTo: '',
            assignedToName: '',
            assignedAt: ''
          }
        }
      );

      logger.info('Bulk unassign completed', { unassignedCount: result.modifiedCount });

      return {
        success: true,
        unassignedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Bulk unassign failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Bulk add tags to conversations
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID
   * @param {Array<string>} tags - Array of tag names
   * @returns {Promise<Object>} - Operation results
   */
  async bulkAddTags(conversationIds, userId, tags) {
    try {
      logger.info('Bulk adding tags', { count: conversationIds.length, tags, userId });

      validateBulkArray(conversationIds, 'conversation IDs', this.maxBulkLimit);
      validateBulkArray(tags, 'tags', parseInt(process.env.MAX_TAGS_PER_OPERATION) || 10);

      // Add tags to conversations
      const result = await Conversation.updateMany(
        {
          _id: { $in: conversationIds },
          userId: userId
        },
        {
          $addToSet: {
            tags: { $each: tags }
          }
        }
      );

      logger.info('Bulk add tags completed', { taggedCount: result.modifiedCount, tags });

      return {
        success: true,
        taggedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        tags: tags,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Bulk add tags failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Bulk remove tags from conversations
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID
   * @param {Array<string>} tags - Array of tag names to remove
   * @returns {Promise<Object>} - Operation results
   */
  async bulkRemoveTags(conversationIds, userId, tags) {
    try {
      logger.info('Bulk removing tags', { count: conversationIds.length, tags, userId });

      validateBulkArray(conversationIds, 'conversation IDs', this.maxBulkLimit);
      validateBulkArray(tags, 'tags', parseInt(process.env.MAX_TAGS_PER_OPERATION) || 10);

      const result = await Conversation.updateMany(
        {
          _id: { $in: conversationIds },
          userId: userId
        },
        {
          $pull: {
            tags: { $in: tags }
          }
        }
      );

      logger.info('Bulk remove tags completed', { untaggedCount: result.modifiedCount, tags });

      return {
        success: true,
        untaggedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        tags: tags,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Bulk remove tags failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Bulk update conversation status
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID
   * @param {string} status - New status (active, archived, closed)
   * @returns {Promise<Object>} - Operation results
   */
  async bulkUpdateStatus(conversationIds, userId, status) {
    const startTime = Date.now();
    
    try {
      logger.info('Bulk updating conversation status', {
        count: conversationIds.length,
        status,
        userId: userId.toString()
      });

      validateBulkArray(conversationIds, 'conversation IDs', this.maxBulkLimit);
      validateNonEmptyString(status, 'Status');
      
      if (!VALID_STATUSES.includes(status)) {
        const error = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const updateData = { status };
      
      if (status === CONVERSATION_STATUS.CLOSED) {
        updateData.closedAt = new Date();
      }

      const result = await Conversation.updateMany(
        {
          _id: { $in: conversationIds },
          userId: userId
        },
        {
          $set: updateData
        }
      );

      logger.info('Bulk update status completed', { 
        updatedCount: result.modifiedCount, 
        status,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        updatedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        newStatus: status,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Bulk update status failed', { 
        error: error.message, 
        userId: userId?.toString(),
        code: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      throw error;
    }
  }

  /**
   * Get bulk operation statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Operation statistics
   */
  async getBulkOperationStats(userId) {
    try {
      const [
        totalConversations,
        archivedConversations,
        assignedConversations,
        taggedConversations,
        unassignedConversations
      ] = await Promise.all([
        Conversation.countDocuments({ userId }),
        Conversation.countDocuments({ userId, status: 'archived' }),
        Conversation.countDocuments({ userId, assignedTo: { $exists: true, $ne: null } }),
        Conversation.countDocuments({ userId, tags: { $exists: true, $ne: [] } }),
        Conversation.countDocuments({ userId, assignedTo: { $exists: false } })
      ]);

      // Get tag statistics
      const tagStats = await Conversation.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            tags: { $exists: true, $ne: [] },
            isDeleted: false
          }
        },
        {
          $unwind: '$tags'
        },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 20
        }
      ]);

      // Get assignment statistics
      const assignmentStats = await Conversation.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            assignedTo: { $exists: true, $ne: null },
            isDeleted: false
          }
        },
        {
          $group: {
            _id: {
              userId: '$assignedTo',
              userName: '$assignedToName'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return {
        success: true,
        stats: {
          total: totalConversations,
          archived: archivedConversations,
          assigned: assignedConversations,
          tagged: taggedConversations,
          unassigned: unassignedConversations,
          active: totalConversations - archivedConversations
        },
        tagStats: tagStats.map(t => ({ tag: t._id, count: t.count })),
        assignmentStats: assignmentStats.map(a => ({
          userId: a._id.userId,
          userName: a._id.userName,
          count: a.count
        }))
      };
    } catch (error) {
      logger.error('Get bulk stats failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate conversation IDs belong to user
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Validation results
   */
  async validateConversationIds(conversationIds, userId) {
    try {
      const validConversations = await Conversation.find({
        _id: { $in: conversationIds },
        userId: userId,
        isDeleted: false
      }).select('_id');

      const validIds = validConversations.map(c => c._id.toString());
      const invalidIds = conversationIds.filter(id => !validIds.includes(id.toString()));

      return {
        valid: validIds,
        invalid: invalidIds,
        totalValid: validIds.length,
        totalInvalid: invalidIds.length
      };
    } catch (error) {
      logger.error('Conversation ID validation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Bulk export conversation metadata (for reporting)
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Conversation metadata
   */
  async bulkExportMetadata(conversationIds, userId, format = 'json') {
    const startTime = Date.now();
    
    try {
      logger.info('Bulk exporting metadata', { 
        count: conversationIds.length, 
        format, 
        userId: userId.toString() 
      });

      validateBulkArray(conversationIds, 'conversation IDs', MAX_BULK_EXPORT);

      const conversations = await Conversation.find({
        _id: { $in: conversationIds },
        userId: userId,
        isDeleted: false
      })
      .select('contact status lastMessageAt unreadCount metrics quality assignedTo assignedToName tags createdAt')
      .lean();

      const exportData = conversations.map(conv => ({
        id: conv._id,
        contactName: conv.contact?.name || 'Unknown',
        contactPhone: conv.contact?.phoneNumber,
        status: conv.status,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount,
        totalMessages: conv.metrics?.totalMessages || 0,
        incomingMessages: conv.metrics?.incomingMessages || 0,
        outgoingMessages: conv.metrics?.outgoingMessages || 0,
        responseRate: conv.metrics?.responseRate || 0,
        avgResponseTime: conv.metrics?.avgResponseTime || 0,
        hasReplied: conv.quality?.hasReplied || false,
        qualityScore: conv.quality?.qualityScore || 0,
        assignedTo: conv.assignedToName || 'Unassigned',
        tags: conv.tags || [],
        createdAt: conv.createdAt
      }));

      logger.info('Bulk export completed', { 
        exportedCount: exportData.length, 
        format,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        data: exportData,
        total: exportData.length,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Bulk export failed', { 
        error: error.message, 
        userId: userId?.toString(),
        code: ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      throw error;
    }
  }
}

module.exports = new BulkOperationsService();
