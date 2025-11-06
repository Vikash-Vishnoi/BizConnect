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

const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');

class BulkOperationsService {
  /**
   * Bulk archive conversations
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Operation results
   */
  async bulkArchiveConversations(conversationIds, userId) {
    try {
      console.log(`📦 Bulk archiving ${conversationIds.length} conversations...`);

      if (!conversationIds || conversationIds.length === 0) {
        throw new Error('No conversation IDs provided');
      }

      if (conversationIds.length > 100) {
        throw new Error('Cannot archive more than 100 conversations at once');
      }

      const result = await Conversation.updateMany(
        {
          _id: { $in: conversationIds },
          userId: userId,
          status: { $ne: 'archived' } // Only archive non-archived conversations
        },
        {
          $set: {
            status: 'archived',
            archivedAt: new Date()
          }
        }
      );

      console.log(`✅ Archived ${result.modifiedCount} conversations`);

      return {
        success: true,
        archivedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error bulk archiving conversations:', error);
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
      console.log(`📂 Bulk unarchiving ${conversationIds.length} conversations...`);

      if (!conversationIds || conversationIds.length === 0) {
        throw new Error('No conversation IDs provided');
      }

      if (conversationIds.length > 100) {
        throw new Error('Cannot unarchive more than 100 conversations at once');
      }

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

      console.log(`✅ Unarchived ${result.modifiedCount} conversations`);

      return {
        success: true,
        unarchivedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error bulk unarchiving conversations:', error);
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
      console.log(`👤 Bulk assigning ${conversationIds.length} conversations to ${assignToUserName}...`);

      if (!conversationIds || conversationIds.length === 0) {
        throw new Error('No conversation IDs provided');
      }

      if (conversationIds.length > 100) {
        throw new Error('Cannot assign more than 100 conversations at once');
      }

      if (!assignToUserId || !assignToUserName) {
        throw new Error('Assignment target user ID and name are required');
      }

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

      console.log(`✅ Assigned ${result.modifiedCount} conversations to ${assignToUserName}`);

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
      console.error('❌ Error bulk assigning conversations:', error);
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
      console.log(`👤 Bulk unassigning ${conversationIds.length} conversations...`);

      if (!conversationIds || conversationIds.length === 0) {
        throw new Error('No conversation IDs provided');
      }

      if (conversationIds.length > 100) {
        throw new Error('Cannot unassign more than 100 conversations at once');
      }

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

      console.log(`✅ Unassigned ${result.modifiedCount} conversations`);

      return {
        success: true,
        unassignedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error bulk unassigning conversations:', error);
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
      console.log(`🏷️  Bulk adding tags to ${conversationIds.length} conversations...`);

      if (!conversationIds || conversationIds.length === 0) {
        throw new Error('No conversation IDs provided');
      }

      if (!tags || tags.length === 0) {
        throw new Error('No tags provided');
      }

      if (conversationIds.length > 100) {
        throw new Error('Cannot tag more than 100 conversations at once');
      }

      if (tags.length > 10) {
        throw new Error('Cannot add more than 10 tags at once');
      }

      // Ensure tags array exists in schema, then add unique tags
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

      console.log(`✅ Added tags to ${result.modifiedCount} conversations`);

      return {
        success: true,
        taggedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        tags: tags,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error bulk adding tags:', error);
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
      console.log(`🏷️  Bulk removing tags from ${conversationIds.length} conversations...`);

      if (!conversationIds || conversationIds.length === 0) {
        throw new Error('No conversation IDs provided');
      }

      if (!tags || tags.length === 0) {
        throw new Error('No tags provided');
      }

      if (conversationIds.length > 100) {
        throw new Error('Cannot untag more than 100 conversations at once');
      }

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

      console.log(`✅ Removed tags from ${result.modifiedCount} conversations`);

      return {
        success: true,
        untaggedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        tags: tags,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error bulk removing tags:', error);
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
    try {
      console.log(`📊 Bulk updating status to "${status}" for ${conversationIds.length} conversations...`);

      if (!conversationIds || conversationIds.length === 0) {
        throw new Error('No conversation IDs provided');
      }

      if (!status) {
        throw new Error('Status is required');
      }

      const validStatuses = ['active', 'archived', 'closed', 'blocked'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      if (conversationIds.length > 100) {
        throw new Error('Cannot update more than 100 conversations at once');
      }

      const updateData = { status };
      
      // Add timestamp for archived status
      if (status === 'archived') {
        updateData.archivedAt = new Date();
      } else if (status === 'closed') {
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

      console.log(`✅ Updated status for ${result.modifiedCount} conversations`);

      return {
        success: true,
        updatedCount: result.modifiedCount,
        totalRequested: conversationIds.length,
        newStatus: status,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error bulk updating status:', error);
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
        Conversation.countDocuments({ userId, isDeleted: false }),
        Conversation.countDocuments({ userId, status: 'archived', isDeleted: false }),
        Conversation.countDocuments({ userId, assignedTo: { $exists: true, $ne: null }, isDeleted: false }),
        Conversation.countDocuments({ userId, tags: { $exists: true, $ne: [] }, isDeleted: false }),
        Conversation.countDocuments({ userId, assignedTo: { $exists: false }, isDeleted: false })
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
      console.error('❌ Error getting bulk operation stats:', error);
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
      console.error('❌ Error validating conversation IDs:', error);
      throw error;
    }
  }

  /**
   * Bulk export conversation metadata (for reporting)
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Conversation metadata
   */
  async bulkExportMetadata(conversationIds, userId) {
    try {
      console.log(`📊 Bulk exporting metadata for ${conversationIds.length} conversations...`);

      if (!conversationIds || conversationIds.length === 0) {
        throw new Error('No conversation IDs provided');
      }

      if (conversationIds.length > 500) {
        throw new Error('Cannot export more than 500 conversations at once');
      }

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

      console.log(`✅ Exported metadata for ${exportData.length} conversations`);

      return {
        success: true,
        data: exportData,
        total: exportData.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error bulk exporting metadata:', error);
      throw error;
    }
  }
}

module.exports = new BulkOperationsService();
