/**
 * Notification Service
 * 
 * Handles push notifications for new messages
 * Integrates with frontend notification system
 */

const logger = require('../../common/helpers/logger');
const { ERROR_CODES, MESSAGE_TYPES } = require('../../common/constants');

/**
 * Notification Service Constants
 */
const MESSAGE_PREVIEW_MAX_LENGTH = 100;

const NOTIFICATION_TYPES = {
  NEW_MESSAGE: 'new_message',
  MESSAGE_STATUS: 'message_status',
  PROFILE_UPDATE: 'profile_update'
};

const MESSAGE_TYPE_ICONS = {
  text: '💬',
  image: '📷',
  video: '🎥',
  audio: '🎤',
  document: '📄',
  sticker: '😊',
  location: '📍',
  contacts: '👤',
  interactive: '🔘'
};

class NotificationService {
  constructor(io) {
    if (!io) {
      throw new Error('Socket.IO instance is required for NotificationService');
    }
    this.io = io;
  }

  /**
   * Send notification for new incoming message
   */
  async notifyNewMessage(userId, conversationId, message, contact) {
    try {
      // Validate inputs
      if (!userId || !conversationId || !message || !contact) {
        logger.error('notifyNewMessage called with invalid parameters', {
          hasUserId: !!userId,
          hasConversationId: !!conversationId,
          hasMessage: !!message,
          hasContact: !!contact,
          code: ERROR_CODES.VALIDATION_ERROR
        });
        return { success: false, error: 'Invalid parameters' };
      }

      logger.info('Sending new message notification', {
        userId: userId.toString(),
        conversationId: conversationId.toString(),
        contactName: contact.name
      });

      // Prepare notification payload
      const notification = {
        type: NOTIFICATION_TYPES.NEW_MESSAGE,
        title: contact.name || contact.phoneNumber,
        body: this.getMessagePreview(message),
        data: {
          conversationId: conversationId.toString(),
          messageId: message._id?.toString(),
          contactName: contact.name,
          contactPhone: contact.phoneNumber,
          messageType: message.type,
          timestamp: message.timestamp
        },
        timestamp: new Date(),
        badge: 1 // Increment unread count
      };

      // Emit to user's room via Socket.io
      if (this.io) {
        this.io.to(`user:${userId}`).emit('notification:new_message', notification);
      }

      logger.info('Notification sent successfully', {
        userId: userId.toString(),
        conversationId: conversationId.toString()
      });
      
      return { success: true, notification };
    } catch (error) {
      logger.error('Notification error', {
        error: error.message,
        userId: userId?.toString(),
        conversationId: conversationId?.toString(),
        code: ERROR_CODES.INTERNAL_ERROR
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get message preview text for notification
   */
  getMessagePreview(message) {
    if (!message || !message.type) {
      return '[Message]';
    }

    switch (message.type) {
      case MESSAGE_TYPES.TEXT:
        const text = message.content?.text || '';
        return text.length > MESSAGE_PREVIEW_MAX_LENGTH 
          ? text.substring(0, MESSAGE_PREVIEW_MAX_LENGTH) + '...' 
          : text;

      case MESSAGE_TYPES.IMAGE:
        return message.content?.caption 
          ? `${MESSAGE_TYPE_ICONS.image} Image: ${message.content.caption}` 
          : `${MESSAGE_TYPE_ICONS.image} Image`;

      case MESSAGE_TYPES.VIDEO:
        return message.content?.caption 
          ? `${MESSAGE_TYPE_ICONS.video} Video: ${message.content.caption}` 
          : `${MESSAGE_TYPE_ICONS.video} Video`;

      case MESSAGE_TYPES.AUDIO:
        return `${MESSAGE_TYPE_ICONS.audio} Audio message`;

      case MESSAGE_TYPES.DOCUMENT:
        return `${MESSAGE_TYPE_ICONS.document} Document: ${message.content?.filename || 'file'}`;

      case MESSAGE_TYPES.STICKER:
        return `${MESSAGE_TYPE_ICONS.sticker} Sticker`;

      case MESSAGE_TYPES.LOCATION:
        return `${MESSAGE_TYPE_ICONS.location} Location: ${message.content?.location?.name || 'Shared location'}`;

      case MESSAGE_TYPES.CONTACTS:
      case MESSAGE_TYPES.CONTACT:
        return `${MESSAGE_TYPE_ICONS.contacts} Contact: ${message.content?.contacts?.[0]?.name?.formatted_name || 'Contact'}`;

      case MESSAGE_TYPES.INTERACTIVE:
        if (message.content?.interactive?.type === 'button') {
          return `${MESSAGE_TYPE_ICONS.interactive} ${message.content.text || 'Button reply'}`;
        } else if (message.content?.interactive?.type === 'list') {
          return `📋 ${message.content.text || 'List reply'}`;
        }
        return 'Interactive message';

      default:
        return `[${message.type}]`;
    }
  }

  /**
   * Send notification for message status update
   */
  async notifyMessageStatus(userId, conversationId, messageId, status) {
    try {
      if (!userId || !conversationId || !messageId) {
        logger.warn('notifyMessageStatus called with missing parameters', {
          code: ERROR_CODES.VALIDATION_ERROR
        });
        return { success: false, error: 'Invalid parameters' };
      }

      const notification = {
        type: NOTIFICATION_TYPES.MESSAGE_STATUS,
        data: {
          conversationId: conversationId.toString(),
          messageId: messageId.toString(),
          status
        },
        timestamp: new Date()
      };

      if (this.io) {
        this.io.to(`user:${userId}`).emit('notification:message_status', notification);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Status notification error', {
        error: error.message,
        userId: userId?.toString(),
        code: ERROR_CODES.INTERNAL_ERROR
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for profile update
   */
  async notifyProfileUpdate(userId, conversationId, contact, changes) {
    try {
      if (!userId || !conversationId || !contact) {
        logger.warn('notifyProfileUpdate called with missing parameters', {
          code: ERROR_CODES.VALIDATION_ERROR
        });
        return { success: false, error: 'Invalid parameters' };
      }

      const changeText = Array.isArray(changes) ? changes.map(c => c.field).join(', ') : 'profile';
      
      const notification = {
        type: NOTIFICATION_TYPES.PROFILE_UPDATE,
        title: `${contact.name || contact.phoneNumber} updated their profile`,
        body: `Changed: ${changeText}`,
        data: {
          conversationId: conversationId.toString(),
          contact,
          changes
        },
        timestamp: new Date()
      };

      if (this.io) {
        this.io.to(`user:${userId}`).emit('notification:profile_update', notification);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Profile notification error', { error: error.message, userId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for account alert
   */
  async notifyAccountAlert(userId, alert) {
    try {
      const notification = {
        type: 'account_alert',
        title: alert.title,
        body: alert.message,
        severity: alert.severity,
        data: {
          alertId: alert._id,
          alertType: alert.alertType,
          severity: alert.severity
        },
        timestamp: new Date()
      };

      this.io.to(`user:${userId}`).emit('notification:account_alert', notification);
      
      return { success: true };
    } catch (error) {
      logger.error('Alert notification error', { error: error.message, userId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      const Conversation = require('../../core/database/models/Conversation');
      
      const conversations = await Conversation.find({
        userId: userId,
        unreadCount: { $gt: 0 },
        isDeleted: false
      }).select('unreadCount');

      const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

      return { success: true, count: totalUnread };
    } catch (error) {
      logger.error('Get unread count error', { error: error.message, userId });
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;
