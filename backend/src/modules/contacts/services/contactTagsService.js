/**
 * Contact Tags Service
 * 
 * Manages tags and labels for conversations/contacts
 * - Create, update, delete tags
 * - Apply tags to conversations
 * - Tag analytics and statistics
 * - Tag-based filtering and search
 * 
 * @module contactTagsService
 */

const Conversation = require('../../../core/database/models/Conversation');
const mongoose = require('mongoose');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// Constants for tag management
const TAG_NAME_MAX_LENGTH = 50;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SUGGESTIONS_LIMIT = 10;
const MIN_TAG_QUERY_LENGTH = 0;
const DEFAULT_PAGE_NUMBER = 1;

// Tag color palette for consistent color generation
const TAG_COLOR_PALETTE = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#14B8A6', // teal
  '#6366F1', // indigo
];

class ContactTagsService {
  constructor() {
    // Validate required dependencies
    if (!Conversation) {
      throw new Error(ERROR_CODES.CONFIGURATION_ERROR + ': Conversation model is required');
    }
    if (!logger) {
      throw new Error(ERROR_CODES.CONFIGURATION_ERROR + ': Logger is required');
    }
  }

  /**
   * Get all tags used by a user with usage statistics
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of tags with stats
   */
  async getAllTags(userId) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!userId) {
        const error = new Error('userId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      logger.info('Getting all tags', { userId: userId.toString() });

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
            count: { $sum: 1 },
            lastUsed: { $max: '$updatedAt' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const tags = tagStats.map(t => ({
        name: t._id,
        count: t.count,
        lastUsed: t.lastUsed,
        color: this.generateTagColor(t._id) // Generate consistent color for tag
      }));

      logger.info('Found tags', { userId: userId.toString(), tagCount: tags.length });

      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        tags,
        total: tags.length,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error getting tags', { 
        userId: userId.toString(), 
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * Get conversations by tag
   * @param {string} userId - User ID
   * @param {string} tagName - Tag name
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} - Conversations with tag
   */
  async getConversationsByTag(userId, tagName, options = {}) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!userId) {
        const error = new Error('userId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!tagName) {
        const error = new Error('tagName is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const { page = DEFAULT_PAGE_NUMBER, limit = DEFAULT_PAGE_SIZE } = options;
      const skip = (page - 1) * limit;

      logger.info('Finding conversations by tag', { userId: userId.toString(), tagName, page, limit });

      const query = {
        userId: userId,
        tags: tagName,
        isDeleted: false
      };

      const [conversations, total] = await Promise.all([
        Conversation.find(query)
          .select('contact lastMessageAt unreadCount status tags assignedTo assignedToName')
          .sort({ lastMessageAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Conversation.countDocuments(query)
      ]);

      logger.info('Found conversations by tag', { userId: userId.toString(), tagName, count: conversations.length, total });

      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        conversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        tag: tagName,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error getting conversations by tag', { 
        userId: userId.toString(), 
        tagName, 
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * Add tag to a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {string} tagName - Tag name
   * @returns {Promise<Object>} - Updated conversation
   */
  async addTagToConversation(conversationId, userId, tagName) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!conversationId) {
        const error = new Error('conversationId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!userId) {
        const error = new Error('userId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!tagName) {
        const error = new Error('tagName is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      logger.info('Adding tag to conversation', { 
        conversationId: conversationId.toString(), 
        userId: userId.toString(), 
        tagName 
      });

      // Normalize tag name
      const normalizedTag = this.normalizeTagName(tagName);

      if (!normalizedTag) {
        const error = new Error('Invalid tag name');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const conversation = await Conversation.findOneAndUpdate(
        {
          _id: conversationId,
          userId: userId
        },
        {
          $addToSet: { tags: normalizedTag }
        },
        {
          new: true,
          select: 'contact tags'
        }
      );

      if (!conversation) {
        const error = new Error('Conversation not found');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      const processingTime = Date.now() - startTime;
      logger.info('Tag added to conversation', { 
        conversationId: conversationId.toString(), 
        tag: normalizedTag,
        processingTime
      });

      return {
        success: true,
        conversation,
        tag: normalizedTag,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error adding tag', { 
        conversationId: conversationId.toString(), 
        userId: userId.toString(), 
        tagName, 
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * Remove tag from a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {string} tagName - Tag name
   * @returns {Promise<Object>} - Updated conversation
   */
  async removeTagFromConversation(conversationId, userId, tagName) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!conversationId) {
        const error = new Error('conversationId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!userId) {
        const error = new Error('userId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!tagName) {
        const error = new Error('tagName is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      logger.info('Removing tag from conversation', { 
        conversationId: conversationId.toString(), 
        userId: userId.toString(), 
        tagName 
      });

      const normalizedTag = this.normalizeTagName(tagName);

      const conversation = await Conversation.findOneAndUpdate(
        {
          _id: conversationId,
          userId: userId
        },
        {
          $pull: { tags: normalizedTag }
        },
        {
          new: true,
          select: 'contact tags'
        }
      );

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      logger.info('Tag removed from conversation', { conversationId, tag: normalizedTag });

      if (!conversation) {
        const error = new Error('Conversation not found');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      const processingTime = Date.now() - startTime;
      logger.info('Tag removed from conversation', { 
        conversationId: conversationId.toString(), 
        tag: normalizedTag,
        processingTime
      });

      return {
        success: true,
        conversation,
        tag: normalizedTag,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error removing tag', { 
        conversationId: conversationId.toString(), 
        userId: userId.toString(), 
        tagName, 
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * Rename a tag across all conversations
   * @param {string} userId - User ID
   * @param {string} oldTagName - Old tag name
   * @param {string} newTagName - New tag name
   * @returns {Promise<Object>} - Rename results
   */
  async renameTag(userId, oldTagName, newTagName) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!userId) {
        const error = new Error('userId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!oldTagName || !newTagName) {
        const error = new Error('oldTagName and newTagName are required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      logger.info('Renaming tag', { userId: userId.toString(), oldTagName, newTagName });

      const oldTag = this.normalizeTagName(oldTagName);
      const newTag = this.normalizeTagName(newTagName);

      if (!oldTag || !newTag) {
        const error = new Error('Invalid tag names');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      if (oldTag === newTag) {
        const error = new Error('Old and new tag names are the same');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      // Find all conversations with the old tag
      const conversations = await Conversation.find({
        userId: userId,
        tags: oldTag,
        isDeleted: false
      });

      let updatedCount = 0;

      for (const conversation of conversations) {
        // Remove old tag and add new tag
        conversation.tags = conversation.tags.filter(t => t !== oldTag);
        if (!conversation.tags.includes(newTag)) {
          conversation.tags.push(newTag);
        }
        await conversation.save();
        updatedCount++;
      }

      const processingTime = Date.now() - startTime;
      logger.info('Tag renamed', { 
        userId: userId.toString(), 
        oldTag, 
        newTag, 
        updatedCount,
        processingTime
      });

      return {
        success: true,
        oldTag,
        newTag,
        updatedCount,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error renaming tag', { 
        userId: userId.toString(), 
        oldTagName, 
        newTagName, 
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * Delete a tag from all conversations
   * @param {string} userId - User ID
   * @param {string} tagName - Tag name to delete
   * @returns {Promise<Object>} - Delete results
   */
  async deleteTag(userId, tagName) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!userId) {
        const error = new Error('userId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!tagName) {
        const error = new Error('tagName is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      logger.info('Deleting tag', { userId: userId.toString(), tagName });

      const normalizedTag = this.normalizeTagName(tagName);

      const result = await Conversation.updateMany(
        {
          userId: userId,
          tags: normalizedTag,
          isDeleted: false
        },
        {
          $pull: { tags: normalizedTag }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Tag deleted', { 
        userId: userId.toString(), 
        tag: normalizedTag, 
        deletedFromCount: result.modifiedCount,
        processingTime
      });

      return {
        success: true,
        tag: normalizedTag,
        deletedFromCount: result.modifiedCount,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error deleting tag', { 
        userId: userId.toString(), 
        tagName, 
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * Merge multiple tags into one
   * @param {string} userId - User ID
   * @param {Array<string>} tagsToMerge - Tags to merge
   * @param {string} targetTag - Target tag name
   * @returns {Promise<Object>} - Merge results
   */
  async mergeTags(userId, tagsToMerge, targetTag) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!userId) {
        const error = new Error('userId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!tagsToMerge || tagsToMerge.length < 2) {
        const error = new Error('At least 2 tags are required for merging');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      if (!targetTag) {
        const error = new Error('targetTag is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      logger.info('Merging tags', { userId: userId.toString(), tagsToMerge, targetTag });

      const normalizedTagsToMerge = tagsToMerge.map(t => this.normalizeTagName(t));
      const normalizedTargetTag = this.normalizeTagName(targetTag);

      if (!normalizedTargetTag) {
        const error = new Error('Invalid target tag name');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      // Find all conversations with any of the tags to merge
      const conversations = await Conversation.find({
        userId: userId,
        tags: { $in: normalizedTagsToMerge },
        isDeleted: false
      });

      let updatedCount = 0;

      for (const conversation of conversations) {
        // Remove all tags to merge
        conversation.tags = conversation.tags.filter(
          t => !normalizedTagsToMerge.includes(t)
        );
        
        // Add target tag if not already present
        if (!conversation.tags.includes(normalizedTargetTag)) {
          conversation.tags.push(normalizedTargetTag);
        }
        
        await conversation.save();
        updatedCount++;
      }

      const processingTime = Date.now() - startTime;
      logger.info('Tags merged', { 
        userId: userId.toString(), 
        targetTag: normalizedTargetTag, 
        updatedCount,
        processingTime
      });

      return {
        success: true,
        mergedTags: normalizedTagsToMerge,
        targetTag: normalizedTargetTag,
        updatedCount,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error merging tags', { 
        userId: userId.toString(), 
        tagsToMerge, 
        targetTag, 
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * Get tag suggestions based on existing tags
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {number} limit - Max suggestions
   * @returns {Promise<Array>} - Tag suggestions
   */
  async getTagSuggestions(userId, query = '', limit = DEFAULT_SUGGESTIONS_LIMIT) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!userId) {
        const error = new Error('userId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      const allTags = await this.getAllTags(userId);
      
      let suggestions = allTags.tags;

      // Filter by query if provided
      if (query) {
        const lowerQuery = query.toLowerCase();
        suggestions = suggestions.filter(t => 
          t.name.toLowerCase().includes(lowerQuery)
        );
      }

      // Sort by usage count and limit
      suggestions = suggestions
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        suggestions,
        query,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error getting tag suggestions', { 
        userId: userId.toString(), 
        query, 
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * Get tag analytics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Tag analytics
   */
  async getTagAnalytics(userId) {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!userId) {
        const error = new Error('userId is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      logger.info('Getting tag analytics', { userId: userId.toString() });

      const [
        totalTags,
        totalTaggedConversations,
        totalUntaggedConversations,
        tagDistribution
      ] = await Promise.all([
        // Total unique tags
        Conversation.aggregate([
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
            $group: { _id: '$tags' }
          },
          {
            $count: 'total'
          }
        ]),
        
        // Total conversations with tags
        Conversation.countDocuments({
          userId: userId,
          tags: { $exists: true, $ne: [] },
          isDeleted: false
        }),
        
        // Total conversations without tags
        Conversation.countDocuments({
          userId: userId,
          $or: [
            { tags: { $exists: false } },
            { tags: [] }
          ],
          isDeleted: false
        }),
        
        // Tag distribution (conversations per tag count)
        Conversation.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              isDeleted: false
            }
          },
          {
            $project: {
              tagCount: { $size: { $ifNull: ['$tags', []] } }
            }
          },
          {
            $group: {
              _id: '$tagCount',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { _id: 1 }
          }
        ])
      ]);

      const analytics = {
        totalUniqueTags: totalTags[0]?.total || 0,
        totalTaggedConversations,
        totalUntaggedConversations,
        tagCoverage: totalTaggedConversations + totalUntaggedConversations > 0
          ? Math.round((totalTaggedConversations / (totalTaggedConversations + totalUntaggedConversations)) * 100)
          : 0,
        distribution: tagDistribution.map(d => ({
          tagCount: d._id,
          conversations: d.count
        }))
      };

      const processingTime = Date.now() - startTime;
      logger.info('Tag analytics generated', { 
        userId: userId.toString(), 
        totalUniqueTags: analytics.totalUniqueTags,
        processingTime
      });

      return {
        success: true,
        analytics,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error getting tag analytics', { 
        userId: userId.toString(), 
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime
      });
      error.code = error.code || ERROR_CODES.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * Normalize tag name (lowercase, trim, remove special chars)
   * @private
   */
  normalizeTagName(tagName) {
    if (!tagName || typeof tagName !== 'string') {
      return null;
    }

    return tagName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .substring(0, TAG_NAME_MAX_LENGTH); // Max length
  }

  /**
   * Generate consistent color for a tag based on its name
   * @private
   */
  generateTagColor(tagName) {
    // Generate consistent index from tag name
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % TAG_COLOR_PALETTE.length;
    return TAG_COLOR_PALETTE[index];
  }

  /**
   * Validate tag name
   * @param {string} tagName - Tag name to validate
   * @returns {Object} - Validation result
   */
  validateTagName(tagName) {
    if (!tagName || typeof tagName !== 'string') {
      return { valid: false, error: 'Tag name is required' };
    }

    if (tagName.trim().length === 0) {
      return { valid: false, error: 'Tag name cannot be empty' };
    }

    if (tagName.length > TAG_NAME_MAX_LENGTH) {
      return { valid: false, error: `Tag name cannot exceed ${TAG_NAME_MAX_LENGTH} characters` };
    }

    const normalized = this.normalizeTagName(tagName);
    if (!normalized || normalized.length === 0) {
      return { valid: false, error: 'Tag name contains only invalid characters' };
    }

    return { valid: true, normalized };
  }
}

module.exports = new ContactTagsService();
