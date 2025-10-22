import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {Message} from '../../types/conversation';
import theme from '../../theme';

interface Props {
  message: Message;
}

const MessageBubble: React.FC<Props> = ({message}) => {
  const isIncoming = message.direction === 'incoming';

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
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
      {isIncoming && message.senderName && (
        <Text style={styles.senderName}>{message.senderName}</Text>
      )}
      <View
        style={[
          styles.bubble,
          isIncoming ? styles.incomingBubble : styles.outgoingBubble,
        ]}>
        <Text
          style={[
            styles.text,
            isIncoming ? styles.incomingText : styles.outgoingText,
          ]}>
          {message.content}
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
