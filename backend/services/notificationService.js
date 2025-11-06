/**
 * Notification Service
 * 
 * Handles push notifications for new messages
 * Integrates with frontend notification system
 */

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send notification for new incoming message
   */
  async notifyNewMessage(userId, conversationId, message, contact) {
    try {
      console.log('🔔 Sending new message notification...');
      console.log('   User:', userId);
      console.log('   Conversation:', conversationId);
      console.log('   From:', contact.name);

      // Prepare notification payload
      const notification = {
        type: 'new_message',
        title: contact.name || contact.phoneNumber,
        body: this.getMessagePreview(message),
        data: {
          conversationId: conversationId,
          messageId: message._id,
          contactName: contact.name,
          contactPhone: contact.phoneNumber,
          messageType: message.type,
          timestamp: message.timestamp
        },
        timestamp: new Date(),
        badge: 1 // Increment unread count
      };

      // Emit to user's room via Socket.io
      this.io.to(`user:${userId}`).emit('notification:new_message', notification);

      console.log('✅ Notification sent successfully');
      
      return { success: true, notification };
    } catch (error) {
      console.error('❌ Notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get message preview text for notification
   */
  getMessagePreview(message) {
    const maxLength = 100;

    switch (message.type) {
      case 'text':
        const text = message.content.text || '';
        return text.length > maxLength 
          ? text.substring(0, maxLength) + '...' 
          : text;

      case 'image':
        return message.content.caption 
          ? `📷 Image: ${message.content.caption}` 
          : '📷 Image';

      case 'video':
        return message.content.caption 
          ? `🎥 Video: ${message.content.caption}` 
          : '🎥 Video';

      case 'audio':
        return '🎤 Audio message';

      case 'document':
        return `📄 Document: ${message.content.filename || 'file'}`;

      case 'sticker':
        return '😊 Sticker';

      case 'location':
        return `📍 Location: ${message.content.location?.name || 'Shared location'}`;

      case 'contacts':
        return `👤 Contact: ${message.content.contacts?.[0]?.name?.formatted_name || 'Contact'}`;

      case 'interactive':
        if (message.content.interactive?.type === 'button') {
          return `🔘 ${message.content.text || 'Button reply'}`;
        } else if (message.content.interactive?.type === 'list') {
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
      const notification = {
        type: 'message_status',
        data: {
          conversationId,
          messageId,
          status
        },
        timestamp: new Date()
      };

      this.io.to(`user:${userId}`).emit('notification:message_status', notification);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Status notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for profile update
   */
  async notifyProfileUpdate(userId, conversationId, contact, changes) {
    try {
      const changeText = changes.map(c => c.field).join(', ');
      
      const notification = {
        type: 'profile_update',
        title: `${contact.name} updated their profile`,
        body: `Changed: ${changeText}`,
        data: {
          conversationId,
          contact,
          changes
        },
        timestamp: new Date()
      };

      this.io.to(`user:${userId}`).emit('notification:profile_update', notification);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Profile notification error:', error);
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
      console.error('❌ Alert notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      const Conversation = require('../models/Conversation');
      
      const conversations = await Conversation.find({
        userId: userId,
        unreadCount: { $gt: 0 },
        isDeleted: false
      }).select('unreadCount');

      const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

      return { success: true, count: totalUnread };
    } catch (error) {
      console.error('❌ Get unread count error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;
