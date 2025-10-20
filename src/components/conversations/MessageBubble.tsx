import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {Message} from '../../types/conversation';

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
        return '';
    }
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
              style={[
                styles.status,
                message.status === 'read' && styles.statusRead,
              ]}>
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
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  incomingContainer: {
    alignItems: 'flex-start',
  },
  outgoingContainer: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginLeft: 12,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  incomingBubble: {
    backgroundColor: '#F0F0F0',
    borderTopLeftRadius: 4,
  },
  outgoingBubble: {
    backgroundColor: '#25D366',
    borderTopRightRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  incomingText: {
    color: '#333',
  },
  outgoingText: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  incomingTime: {
    color: '#999',
  },
  outgoingTime: {
    color: 'rgba(255,255,255,0.8)',
  },
  status: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statusRead: {
    color: '#4FC3F7',
  },
});

export default MessageBubble;
