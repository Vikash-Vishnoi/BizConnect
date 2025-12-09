/**
 * Message Reactions Service
 * 
 * Handles sending and managing emoji reactions on WhatsApp messages
 * Following WhatsApp Business API v24.0 specifications
 * 
 * @module messageReactionsService
 */

const axios = require('axios');
const Conversation = require('../../core/database/models/Conversation');
const { getBusinessCredentials } = require('../../common/helpers/businessContext');

class MessageReactionsService {
  constructor(businessId = null) {
    this.businessId = businessId;
    // ✅ MULTI-BUSINESS: Credentials loaded per-request
  }
  
  async getCredentials() {
    if (!this.businessId) {
      throw new Error('Business ID required for reaction operations');
    }
    const creds = await getBusinessCredentials(this.businessId);
    const apiVersion = creds.apiVersion || 'v22.0';
    return {
      accessToken: creds.accessToken,
      phoneNumberId: creds.phoneNumberId,
      apiVersion,
      baseURL: `https://graph.facebook.com/${apiVersion}/${creds.phoneNumberId}/messages`
    };
  }

  /**
   * Send a reaction to a WhatsApp message
   * @param {string} whatsappMessageId - WhatsApp message ID to react to
   * @param {string} emoji - Emoji to react with (or empty string to remove)
   * @returns {Promise<Object>} - Reaction result
   */
  async sendReaction(whatsappMessageId, emoji) {
    try {
      const { baseURL, accessToken } = await this.getCredentials();
      
      console.log(`😊 Sending reaction to message ${whatsappMessageId}: ${emoji || '(remove)'}`);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '', // Will be set by caller or extracted from conversation
        type: 'reaction',
        reaction: {
          message_id: whatsappMessageId,
          emoji: emoji // Empty string removes the reaction
        }
      };

      const response = await axios.post(baseURL, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Reaction sent successfully');
      console.log('   WhatsApp Message ID:', response.data.messages?.[0]?.id);

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error sending reaction:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Add reaction to a message in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID (MongoDB _id)
   * @param {string} emoji - Emoji to react with
   * @param {string} userId - User ID (for permission check)
   * @returns {Promise<Object>} - Updated conversation
   */
  async addReactionToMessage(conversationId, messageId, emoji, userId) {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const message = conversation.messages.id(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Get the phone number from conversation
      const toPhoneNumber = conversation.contact.phoneNumber;

      // Send reaction via WhatsApp API
      const reactionResult = await this.sendReaction(message.whatsappMessageId, emoji);

      if (!reactionResult.success) {
        throw new Error(reactionResult.error);
      }

      // Add reaction to message
      if (!message.reactions) {
        message.reactions = [];
      }

      // Check if user already reacted
      const existingReactionIndex = message.reactions.findIndex(
        r => r.from === toPhoneNumber
      );

      if (emoji === '') {
        // Remove reaction
        if (existingReactionIndex !== -1) {
          message.reactions.splice(existingReactionIndex, 1);
        }
      } else {
        // Add or update reaction
        if (existingReactionIndex !== -1) {
          message.reactions[existingReactionIndex].emoji = emoji;
          message.reactions[existingReactionIndex].timestamp = new Date();
        } else {
          message.reactions.push({
            from: toPhoneNumber,
            emoji: emoji,
            timestamp: new Date()
          });
        }
      }

      await conversation.save();

      return {
        success: true,
        conversation,
        message,
        whatsappMessageId: reactionResult.messageId
      };
    } catch (error) {
      console.error('❌ Error adding reaction:', error);
      throw error;
    }
  }

  /**
   * Remove reaction from a message
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated conversation
   */
  async removeReaction(conversationId, messageId, userId) {
    return await this.addReactionToMessage(conversationId, messageId, '', userId);
  }

  /**
   * Get all reactions for a message
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of reactions
   */
  async getMessageReactions(conversationId, messageId, userId) {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const message = conversation.messages.id(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      return {
        success: true,
        reactions: message.reactions || [],
        messageId: messageId,
        totalReactions: message.reactions?.length || 0
      };
    } catch (error) {
      console.error('❌ Error getting reactions:', error);
      throw error;
    }
  }

  /**
   * Get reaction statistics for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Reaction statistics
   */
  async getConversationReactionStats(conversationId, userId) {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const stats = {
        totalMessagesWithReactions: 0,
        totalReactions: 0,
        emojiCount: {},
        mostUsedEmojis: []
      };

      conversation.messages.forEach(message => {
        if (message.reactions && message.reactions.length > 0) {
          stats.totalMessagesWithReactions++;
          stats.totalReactions += message.reactions.length;

          message.reactions.forEach(reaction => {
            if (!stats.emojiCount[reaction.emoji]) {
              stats.emojiCount[reaction.emoji] = 0;
            }
            stats.emojiCount[reaction.emoji]++;
          });
        }
      });

      // Sort emojis by usage
      stats.mostUsedEmojis = Object.entries(stats.emojiCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([emoji, count]) => ({ emoji, count }));

      return {
        success: true,
        conversationId,
        stats
      };
    } catch (error) {
      console.error('❌ Error getting reaction stats:', error);
      throw error;
    }
  }

  /**
   * Get recent reactions across all conversations
   * @param {string} userId - User ID
   * @param {number} limit - Number of recent reactions to return
   * @returns {Promise<Array>} - Recent reactions
   */
  async getRecentReactions(userId, limit = 20) {
    try {
      const conversations = await Conversation.find({
        userId: userId,
        'messages.reactions.0': { $exists: true } // Has at least one reaction
      })
      .select('contact messages')
      .limit(50)
      .lean();

      const recentReactions = [];

      conversations.forEach(conversation => {
        conversation.messages.forEach(message => {
          if (message.reactions && message.reactions.length > 0) {
            message.reactions.forEach(reaction => {
              recentReactions.push({
                conversationId: conversation._id,
                messageId: message._id,
                contactName: conversation.contact.name,
                contactPhone: conversation.contact.phoneNumber,
                messageText: message.content?.text || `[${message.type}]`,
                messageType: message.type,
                reaction: {
                  from: reaction.from,
                  emoji: reaction.emoji,
                  timestamp: reaction.timestamp
                }
              });
            });
          }
        });
      });

      // Sort by timestamp and limit
      recentReactions.sort((a, b) => 
        new Date(b.reaction.timestamp) - new Date(a.reaction.timestamp)
      );

      return {
        success: true,
        reactions: recentReactions.slice(0, limit),
        total: recentReactions.length
      };
    } catch (error) {
      console.error('❌ Error getting recent reactions:', error);
      throw error;
    }
  }

  /**
   * Validate emoji (basic validation)
   * @param {string} emoji - Emoji string
   * @returns {boolean} - Is valid emoji
   */
  validateEmoji(emoji) {
    // Allow empty string for removal
    if (emoji === '') return true;

    // Basic emoji validation (you can enhance this)
    const emojiRegex = /\p{Emoji}/u;
    return emojiRegex.test(emoji);
  }

  /**
   * Get supported emoji reactions (commonly used)
   * @returns {Array} - List of supported emojis
   */
  getSupportedEmojis() {
    return [
      { emoji: '👍', name: 'thumbs_up', category: 'positive' },
      { emoji: '❤️', name: 'heart', category: 'love' },
      { emoji: '😂', name: 'laugh', category: 'happy' },
      { emoji: '😮', name: 'wow', category: 'surprised' },
      { emoji: '😢', name: 'sad', category: 'sad' },
      { emoji: '🙏', name: 'pray', category: 'grateful' },
      { emoji: '🔥', name: 'fire', category: 'excited' },
      { emoji: '🎉', name: 'party', category: 'celebrate' },
      { emoji: '👏', name: 'clap', category: 'appreciate' },
      { emoji: '💯', name: 'hundred', category: 'perfect' },
      { emoji: '✅', name: 'check', category: 'agree' },
      { emoji: '❌', name: 'cross', category: 'disagree' }
    ];
  }
}

module.exports = new MessageReactionsService();
