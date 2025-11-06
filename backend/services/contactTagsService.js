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

const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');

class ContactTagsService {
  /**
   * Get all tags used by a user with usage statistics
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of tags with stats
   */
  async getAllTags(userId) {
    try {
      console.log(`🏷️  Getting all tags for user ${userId}...`);

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

      console.log(`✅ Found ${tags.length} tags`);

      return {
        success: true,
        tags,
        total: tags.length
      };
    } catch (error) {
      console.error('❌ Error getting tags:', error);
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
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      console.log(`🔍 Finding conversations with tag "${tagName}"...`);

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

      console.log(`✅ Found ${conversations.length} conversations with tag "${tagName}"`);

      return {
        success: true,
        conversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        tag: tagName
      };
    } catch (error) {
      console.error('❌ Error getting conversations by tag:', error);
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
    try {
      console.log(`🏷️  Adding tag "${tagName}" to conversation ${conversationId}...`);

      // Normalize tag name
      const normalizedTag = this.normalizeTagName(tagName);

      if (!normalizedTag) {
        throw new Error('Invalid tag name');
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
        throw new Error('Conversation not found');
      }

      console.log(`✅ Tag added to conversation`);

      return {
        success: true,
        conversation,
        tag: normalizedTag
      };
    } catch (error) {
      console.error('❌ Error adding tag:', error);
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
    try {
      console.log(`🏷️  Removing tag "${tagName}" from conversation ${conversationId}...`);

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

      console.log(`✅ Tag removed from conversation`);

      return {
        success: true,
        conversation,
        tag: normalizedTag
      };
    } catch (error) {
      console.error('❌ Error removing tag:', error);
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
    try {
      console.log(`🏷️  Renaming tag "${oldTagName}" to "${newTagName}"...`);

      const oldTag = this.normalizeTagName(oldTagName);
      const newTag = this.normalizeTagName(newTagName);

      if (!oldTag || !newTag) {
        throw new Error('Invalid tag names');
      }

      if (oldTag === newTag) {
        throw new Error('Old and new tag names are the same');
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

      console.log(`✅ Renamed tag in ${updatedCount} conversations`);

      return {
        success: true,
        oldTag,
        newTag,
        updatedCount
      };
    } catch (error) {
      console.error('❌ Error renaming tag:', error);
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
    try {
      console.log(`🗑️  Deleting tag "${tagName}" from all conversations...`);

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

      console.log(`✅ Deleted tag from ${result.modifiedCount} conversations`);

      return {
        success: true,
        tag: normalizedTag,
        deletedFromCount: result.modifiedCount
      };
    } catch (error) {
      console.error('❌ Error deleting tag:', error);
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
    try {
      console.log(`🔀 Merging tags [${tagsToMerge.join(', ')}] into "${targetTag}"...`);

      if (!tagsToMerge || tagsToMerge.length < 2) {
        throw new Error('At least 2 tags are required for merging');
      }

      const normalizedTagsToMerge = tagsToMerge.map(t => this.normalizeTagName(t));
      const normalizedTargetTag = this.normalizeTagName(targetTag);

      if (!normalizedTargetTag) {
        throw new Error('Invalid target tag name');
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

      console.log(`✅ Merged tags in ${updatedCount} conversations`);

      return {
        success: true,
        mergedTags: normalizedTagsToMerge,
        targetTag: normalizedTargetTag,
        updatedCount
      };
    } catch (error) {
      console.error('❌ Error merging tags:', error);
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
  async getTagSuggestions(userId, query = '', limit = 10) {
    try {
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

      return {
        success: true,
        suggestions,
        query
      };
    } catch (error) {
      console.error('❌ Error getting tag suggestions:', error);
      throw error;
    }
  }

  /**
   * Get tag analytics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Tag analytics
   */
  async getTagAnalytics(userId) {
    try {
      console.log(`📊 Getting tag analytics for user ${userId}...`);

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

      console.log(`✅ Tag analytics generated`);

      return {
        success: true,
        analytics
      };
    } catch (error) {
      console.error('❌ Error getting tag analytics:', error);
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
      .substring(0, 50); // Max length
  }

  /**
   * Generate consistent color for a tag based on its name
   * @private
   */
  generateTagColor(tagName) {
    const colors = [
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

    // Generate consistent index from tag name
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
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

    if (tagName.length > 50) {
      return { valid: false, error: 'Tag name cannot exceed 50 characters' };
    }

    const normalized = this.normalizeTagName(tagName);
    if (!normalized || normalized.length === 0) {
      return { valid: false, error: 'Tag name contains only invalid characters' };
    }

    return { valid: true, normalized };
  }
}

module.exports = new ContactTagsService();
