import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {Message} from '../../types/conversation';
import theme from '../../theme';

interface Props {
  message: Message;
}

const MessageBubble: React.FC<Props> = ({message}) => {
  const isIncoming = message.direction === 'incoming';

  const formatTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getMessageText = () => {
    // Handle different message content types
    if (typeof message.content === 'string') {
      return message.content;
    }
    
    if (message.content?.text) {
      return message.content.text;
    }
    
    if (message.content?.interactive?.body) {
      return message.content.interactive.body;
    }
    
    if (message.content?.template?.name) {
      return `Template: ${message.content.template.name}`;
    }
    
    if (message.content?.contacts) {
      return `👤 Contact shared`;
    }

    if (message.type === 'location' && message.content?.location) {
      return `📍 Location: ${message.content.location.name || 'Shared location'}`;
    }

    if (message.type === 'document' && message.content?.filename) {
      return `📎 ${message.content.filename}`;
    }

    if (message.type === 'image') {
      return message.content?.caption || '📷 Image';
    }

    if (message.type === 'video') {
      return message.content?.caption || '🎥 Video';
    }

    if (message.type === 'audio') {
      return '🎵 Audio message';
    }
    
    // Fallback for other message types
    return `[${message.type || 'Message'}]`;
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '⏰';
    }
  };

  const getStatusColor = () => {
    if (message.status === 'read') {
      return theme.colors.info;
    }
    return 'rgba(255,255,255,0.7)';
  };

  return (
    <View
      style={[
        styles.container,
        isIncoming ? styles.incomingContainer : styles.outgoingContainer,
      ]}>
      <View
        style={[
          styles.bubble,
          isIncoming ? styles.incomingBubble : styles.outgoingBubble,
        ]}>
        {message.type === 'image' && message.content?.mediaUrl && (
          <Text style={[styles.text, isIncoming ? styles.incomingText : styles.outgoingText]}>
            🖼️ [Image preview not available in this view]
          </Text>
        )}
        <Text
          style={[
            styles.text,
            isIncoming ? styles.incomingText : styles.outgoingText,
          ]}>
          {getMessageText()}
        </Text>
        <View style={styles.footer}>
          <Text
            style={[
              styles.time,
              isIncoming ? styles.incomingTime : styles.outgoingTime,
            ]}>
            {formatTime(message.timestamp)}
          </Text>
          {!isIncoming && (
            <Text
              style={[styles.statusIcon, {color: getStatusColor()}]}>
              {getStatusIcon()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 3,
    paddingHorizontal: theme.spacing.sm,
  },
  incomingContainer: {
    alignItems: 'flex-start',
  },
  outgoingContainer: {
    alignItems: 'flex-end',
  },
  senderName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    marginLeft: theme.spacing.sm,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  incomingBubble: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 4,
  },
  outgoingBubble: {
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 4,
  },
  text: {
    ...theme.typography.body,
    lineHeight: 20,
  },
  incomingText: {
    color: theme.colors.text,
  },
  outgoingText: {
    color: theme.colors.textInverse,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 10,
  },
  incomingTime: {
    color: theme.colors.textTertiary,
  },
  outgoingTime: {
    color: 'rgba(255,255,255,0.8)',
  },
  statusIcon: {
    fontSize: 12,
    marginLeft: 2,
  },
});

export default MessageBubble;
