/**
 * Message Reactions Service
 * 
 * Handles sending and managing emoji reactions on WhatsApp messages
 * Following WhatsApp Business API v24.0 specifications
 * 
 * @module messageReactionsService
 */

const axios = require('axios');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../../common/constants');
const Conversation = require('../../core/database/models/Conversation');
const { getBusinessCredentials } = require('../../common/helpers/businessContext');
const config = require('../../config/app.config');

/**
 * Reaction Service Constants
 */
const GRAPH_API_TIMEOUT = parseInt(config.whatsapp?.timeout || process.env.WHATSAPP_API_TIMEOUT || '30000');

const MESSAGING_PRODUCT = 'whatsapp';
const RECIPIENT_TYPE = 'individual';
const MESSAGE_TYPE_REACTION = 'reaction';

class MessageReactionsService {
  constructor(businessId = null) {
    this.businessId = businessId;
    this.timeout = GRAPH_API_TIMEOUT;
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
    const startTime = Date.now();
    
    try {
      if (!whatsappMessageId) {
        return {
          success: false,
          error: 'WhatsApp message ID is required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      const { baseURL, accessToken } = await this.getCredentials();
      
      logger.info('Sending reaction to message', {
        whatsappMessageId,
        emoji: emoji || '(remove)',
        businessId: this.businessId?.toString()
      });

      const payload = {
        messaging_product: MESSAGING_PRODUCT,
        recipient_type: RECIPIENT_TYPE,
        to: '', // Will be set by caller or extracted from conversation
        type: MESSAGE_TYPE_REACTION,
        reaction: {
          message_id: whatsappMessageId,
          emoji: emoji // Empty string removes the reaction
        }
      };

      const response = await axios.post(baseURL, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      logger.info('Reaction sent successfully', {
        whatsappMessageId: response.data.messages?.[0]?.id,
        businessId: this.businessId?.toString(),
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      logger.error('Error sending reaction', {
        error: error.response?.data || error.message,
        whatsappMessageId,
        businessId: this.businessId?.toString(),
        code: error.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
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
    const startTime = Date.now();
    
    try {
      if (!conversationId || !messageId || !userId) {
        return {
          success: false,
          error: 'Missing required parameters',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId
      });

      if (!conversation) {
        logger.warn('Conversation not found for reaction', {
          conversationId: conversationId.toString(),
          userId: userId.toString(),
          code: ERROR_CODES.NOT_FOUND
        });
        return {
          success: false,
          error: 'Conversation not found',
          code: ERROR_CODES.NOT_FOUND
        };
      }

      const message = conversation.messages.id(messageId);
      if (!message) {
        logger.warn('Message not found for reaction', {
          conversationId: conversationId.toString(),
          messageId: messageId.toString(),
          code: ERROR_CODES.NOT_FOUND
        });
        return {
          success: false,
          error: 'Message not found',
          code: ERROR_CODES.NOT_FOUND
        };
      }

      // Get the phone number from conversation
      const toPhoneNumber = conversation.contact?.phoneNumber;

      // Send reaction via WhatsApp API
      const reactionResult = await this.sendReaction(message.whatsappMessageId, emoji);

      if (!reactionResult.success) {
        logger.error('Failed to send reaction via WhatsApp API', {
          conversationId: conversationId.toString(),
          messageId: messageId.toString(),
          error: reactionResult.error,
          code: reactionResult.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR
        });
        return reactionResult;
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

      logger.info('Reaction processed successfully', {
        conversationId: conversationId.toString(),
        messageId: messageId.toString(),
        emoji: emoji || '(removed)',
        businessId: this.businessId?.toString(),
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        conversation,
        message,
        whatsappMessageId: reactionResult.messageId
      };
    } catch (error) {
      logger.error('Error adding reaction', {
        error: error.message,
        conversationId: conversationId?.toString(),
        messageId: messageId?.toString(),
        businessId: this.businessId?.toString(),
        code: ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.message,
        code: ERROR_CODES.INTERNAL_ERROR
      };
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
    const startTime = Date.now();
    
    try {
      logger.info('Removing reaction', {
        conversationId: conversationId.toString(),
        messageId: messageId.toString(),
        userId: userId.toString()
      });
      
      const result = await this.addReactionToMessage(conversationId, messageId, '', userId);
      
      logger.info('Reaction removed', {
        conversationId: conversationId.toString(),
        messageId: messageId.toString(),
        success: result.success,
        processingTime: `${Date.now() - startTime}ms`
      });
      
      return result;
    } catch (error) {
      logger.error('Error removing reaction', {
        error: error.message,
        conversationId: conversationId?.toString(),
        messageId: messageId?.toString(),
        code: ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.message,
        code: ERROR_CODES.INTERNAL_ERROR
      };
    }
  }

  /**
   * Get all reactions for a message
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of reactions
   */
  async getMessageReactions(conversationId, messageId, userId) {
    const startTime = Date.now();
    
    try {
      if (!conversationId || !messageId || !userId) {
        return {
          success: false,
          error: 'Missing required parameters',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId
      });

      if (!conversation) {
        logger.warn('Conversation not found for reactions', {
          conversationId: conversationId.toString(),
          userId: userId.toString(),
          code: ERROR_CODES.NOT_FOUND
        });
        return {
          success: false,
          error: 'Conversation not found',
          code: ERROR_CODES.NOT_FOUND
        };
      }

      const message = conversation.messages.id(messageId);
      if (!message) {
        logger.warn('Message not found for reactions', {
          conversationId: conversationId.toString(),
          messageId: messageId.toString(),
          code: ERROR_CODES.NOT_FOUND
        });
        return {
          success: false,
          error: 'Message not found',
          code: ERROR_CODES.NOT_FOUND
        };
      }

      logger.info('Retrieved message reactions', {
        conversationId: conversationId.toString(),
        messageId: messageId.toString(),
        reactionCount: message.reactions?.length || 0,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        reactions: message.reactions || [],
        messageId: messageId.toString(),
        totalReactions: message.reactions?.length || 0
      };
    } catch (error) {
      logger.error('Error getting reactions', {
        error: error.message,
        conversationId: conversationId?.toString(),
        messageId: messageId?.toString(),
        code: ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.message,
        code: ERROR_CODES.INTERNAL_ERROR
      };
    }
  }

  /**
   * Get reaction statistics for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Reaction statistics
   */
  async getConversationReactionStats(conversationId, userId) {
    const startTime = Date.now();
    
    try {
      if (!conversationId || !userId) {
        return {
          success: false,
          error: 'Missing required parameters',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: userId
      });

      if (!conversation) {
        logger.warn('Conversation not found for stats', {
          conversationId: conversationId.toString(),
          userId: userId.toString(),
          code: ERROR_CODES.NOT_FOUND
        });
        return {
          success: false,
          error: 'Conversation not found',
          code: ERROR_CODES.NOT_FOUND
        };
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

      logger.info('Calculated reaction stats', {
        conversationId: conversationId.toString(),
        totalReactions: stats.totalReactions,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        conversationId: conversationId.toString(),
        stats
      };
    } catch (error) {
      logger.error('Error getting reaction stats', {
        error: error.message,
        conversationId: conversationId?.toString(),
        code: ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.message,
        code: ERROR_CODES.INTERNAL_ERROR
      };
    }
  }

  /**
   * Get recent reactions across all conversations
   * @param {string} userId - User ID
   * @param {number} limit - Number of recent reactions to return
   * @returns {Promise<Array>} - Recent reactions
   */
  async getRecentReactions(userId, limit = 20) {
    const startTime = Date.now();
    
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100); // Max 100 reactions

      const conversations = await Conversation.find({
        userId: userId,
        'messages.reactions.0': { $exists: true } // Has at least one reaction
      })
      .select('contact messages')
      .limit(50)
      .lean();

      const recentReactions = [];

      conversations.forEach(conversation => {
        if (!conversation.messages) return;
        
        conversation.messages.forEach(message => {
          if (message.reactions && message.reactions.length > 0) {
            message.reactions.forEach(reaction => {
              recentReactions.push({
                conversationId: conversation._id,
                messageId: message._id,
                contactName: conversation.contact?.name,
                contactPhone: conversation.contact?.phoneNumber,
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

      logger.info('Retrieved recent reactions', {
        userId: userId.toString(),
        totalFound: recentReactions.length,
        returned: Math.min(recentReactions.length, safeLimit),
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        reactions: recentReactions.slice(0, safeLimit),
        total: recentReactions.length
      };
    } catch (error) {
      logger.error('Error getting recent reactions', {
        error: error.message,
        userId: userId?.toString(),
        code: ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return {
        success: false,
        error: error.message,
        code: ERROR_CODES.INTERNAL_ERROR
      };
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
