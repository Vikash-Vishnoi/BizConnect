/**
 * Message Forwarding Service
 * 
 * Handles forwarding messages between conversations
 * Supports text, media, and other message types
 * 
 * @module messageForwardingService
 */

const Conversation = require('../models/Conversation');
const whatsappService = require('./whatsappService');

class MessageForwardingService {
  /**
   * Forward a message to one or more conversations
   * @param {string} sourceConversationId - Source conversation ID
   * @param {string} messageId - Message ID to forward
   * @param {Array<string>} targetConversationIds - Target conversation IDs
   * @param {string} userId - User ID
   * @param {Object} options - Forward options
   * @returns {Promise<Object>} - Forward results
   */
  async forwardMessage(sourceConversationId, messageId, targetConversationIds, userId, options = {}) {
    try {
      const { addCaption = null, keepOriginalCaption = true } = options;

      console.log(`📤 Forwarding message ${messageId} to ${targetConversationIds.length} conversations`);

      // Get source conversation and message
      const sourceConversation = await Conversation.findOne({
        _id: sourceConversationId,
        userId: userId
      });

      if (!sourceConversation) {
        throw new Error('Source conversation not found');
      }

      const sourceMessage = sourceConversation.messages.id(messageId);
      if (!sourceMessage) {
        throw new Error('Message not found');
      }

      // Validate target conversations
      const targetConversations = await Conversation.find({
        _id: { $in: targetConversationIds },
        userId: userId
      });

      if (targetConversations.length === 0) {
        throw new Error('No valid target conversations found');
      }

      console.log(`✅ Found ${targetConversations.length} target conversations`);

      const results = {
        success: [],
        failed: [],
        total: targetConversations.length
      };

      // Forward to each target conversation
      for (const targetConversation of targetConversations) {
        try {
          const forwardResult = await this.forwardToConversation(
            sourceMessage,
            targetConversation,
            { addCaption, keepOriginalCaption }
          );

          results.success.push({
            conversationId: targetConversation._id,
            contactName: targetConversation.contact.name,
            contactPhone: targetConversation.contact.phoneNumber,
            messageId: forwardResult.messageId,
            whatsappMessageId: forwardResult.whatsappMessageId
          });

          console.log(`✅ Forwarded to: ${targetConversation.contact.name}`);
        } catch (error) {
          results.failed.push({
            conversationId: targetConversation._id,
            contactName: targetConversation.contact.name,
            error: error.message
          });

          console.error(`❌ Failed to forward to ${targetConversation.contact.name}:`, error.message);
        }
      }

      console.log(`✅ Forward complete: ${results.success.length}/${results.total} successful`);

      return {
        success: true,
        results,
        summary: {
          successCount: results.success.length,
          failedCount: results.failed.length,
          totalAttempted: results.total
        }
      };
    } catch (error) {
      console.error('❌ Error forwarding message:', error);
      throw error;
    }
  }

  /**
   * Forward message to a single conversation
   * @private
   */
  async forwardToConversation(sourceMessage, targetConversation, options) {
    const { addCaption, keepOriginalCaption } = options;

    let whatsappResult;
    let newMessageData = {
      whatsappMessageId: null,
      from: targetConversation.userId.toString(),
      to: targetConversation.contact.phoneNumber,
      direction: 'outgoing',
      type: sourceMessage.type,
      timestamp: new Date(),
      status: 'pending',
      content: { ...sourceMessage.content }
    };

    // Handle different message types
    switch (sourceMessage.type) {
      case 'text':
        let textToSend = sourceMessage.content.text;
        
        // Add forwarding caption if specified
        if (addCaption) {
          textToSend = `${addCaption}\n\n${textToSend}`;
        }

        whatsappResult = await whatsappService.sendMessage(
          targetConversation.contact.phoneNumber,
          textToSend
        );

        newMessageData.content.text = textToSend;
        break;

      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        // Forward media message
        const mediaData = {
          type: sourceMessage.type,
          [sourceMessage.type]: {
            id: sourceMessage.content.mediaId,
            caption: keepOriginalCaption ? sourceMessage.content.caption : addCaption
          }
        };

        whatsappResult = await whatsappService.sendMediaMessage(
          targetConversation.contact.phoneNumber,
          mediaData
        );

        if (addCaption && !keepOriginalCaption) {
          newMessageData.content.caption = addCaption;
        }
        break;

      case 'sticker':
        whatsappResult = await whatsappService.sendMediaMessage(
          targetConversation.contact.phoneNumber,
          {
            type: 'sticker',
            sticker: {
              id: sourceMessage.content.mediaId
            }
          }
        );
        break;

      case 'location':
        whatsappResult = await whatsappService.sendMessage(
          targetConversation.contact.phoneNumber,
          '',
          {
            type: 'location',
            location: sourceMessage.content.location
          }
        );
        break;

      case 'contacts':
        whatsappResult = await whatsappService.sendMessage(
          targetConversation.contact.phoneNumber,
          '',
          {
            type: 'contacts',
            contacts: sourceMessage.content.contacts
          }
        );
        break;

      default:
        throw new Error(`Cannot forward message type: ${sourceMessage.type}`);
    }

    if (!whatsappResult.success) {
      throw new Error(whatsappResult.error || 'Failed to send message via WhatsApp');
    }

    // Add message to target conversation
    newMessageData.whatsappMessageId = whatsappResult.messageId;
    newMessageData.status = 'sent';

    const savedMessage = await targetConversation.addMessage(newMessageData);

    return {
      messageId: savedMessage._id,
      whatsappMessageId: whatsappResult.messageId,
      conversationId: targetConversation._id
    };
  }

  /**
   * Forward multiple messages to one or more conversations
   * @param {string} sourceConversationId - Source conversation ID
   * @param {Array<string>} messageIds - Array of message IDs to forward
   * @param {Array<string>} targetConversationIds - Target conversation IDs
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Forward results for all messages
   */
  async forwardMultipleMessages(sourceConversationId, messageIds, targetConversationIds, userId) {
    try {
      console.log(`📤 Forwarding ${messageIds.length} messages to ${targetConversationIds.length} conversations`);

      const allResults = [];

      for (const messageId of messageIds) {
        try {
          const result = await this.forwardMessage(
            sourceConversationId,
            messageId,
            targetConversationIds,
            userId
          );

          allResults.push({
            messageId,
            ...result
          });

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          allResults.push({
            messageId,
            success: false,
            error: error.message
          });
        }
      }

      // Calculate summary
      const successfulMessages = allResults.filter(r => r.success).length;
      const failedMessages = allResults.length - successfulMessages;

      return {
        success: true,
        results: allResults,
        summary: {
          totalMessages: messageIds.length,
          successfulMessages,
          failedMessages,
          totalConversations: targetConversationIds.length
        }
      };
    } catch (error) {
      console.error('❌ Error forwarding multiple messages:', error);
      throw error;
    }
  }

  /**
   * Get forwardable conversations for a user
   * @param {string} userId - User ID
   * @param {string} excludeConversationId - Conversation ID to exclude
   * @returns {Promise<Array>} - List of conversations
   */
  async getForwardableConversations(userId, excludeConversationId = null) {
    try {
      const query = {
        userId: userId,
        status: { $ne: 'blocked' },
        isDeleted: false
      };

      if (excludeConversationId) {
        query._id = { $ne: excludeConversationId };
      }

      const conversations = await Conversation.find(query)
        .select('contact lastMessageAt unreadCount')
        .sort({ lastMessageAt: -1 })
        .limit(100)
        .lean();

      return conversations.map(conv => ({
        id: conv._id,
        name: conv.contact.name || conv.contact.phoneNumber,
        phone: conv.contact.phoneNumber,
        profilePicture: conv.contact.profilePicture,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount
      }));
    } catch (error) {
      console.error('❌ Error getting forwardable conversations:', error);
      throw error;
    }
  }

  /**
   * Check if a message can be forwarded
   * @param {Object} message - Message object
   * @returns {boolean} - Can forward
   */
  canForwardMessage(message) {
    // Check if message type is forwardable
    const forwardableTypes = [
      'text',
      'image',
      'video',
      'audio',
      'document',
      'sticker',
      'location',
      'contacts'
    ];

    if (!forwardableTypes.includes(message.type)) {
      return false;
    }

    // Check if message is not deleted
    if (message.isDeleted) {
      return false;
    }

    // Check if message is not failed
    if (message.status === 'failed') {
      return false;
    }

    return true;
  }
}

module.exports = new MessageForwardingService();
