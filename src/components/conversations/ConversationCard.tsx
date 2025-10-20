import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import type {Conversation} from '../../types/conversation';

interface Props {
  conversation: Conversation;
  onPress: () => void;
}

const ConversationCard: React.FC<Props> = ({conversation, onPress}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  };

  const getStatusColor = () => {
    switch (conversation.status) {
      case 'open':
        return '#4CAF50';
      case 'assigned':
        return '#2196F3';
      case 'closed':
        return '#757575';
      default:
        return '#999';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {conversation.patientName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.patientName}
          </Text>
          <Text style={styles.time}>{formatTime(conversation.lastActivity)}</Text>
        </View>

        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={2}>
            {conversation.lastMessage}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View
            style={[styles.statusDot, {backgroundColor: getStatusColor()}]}
          />
          <Text style={styles.statusText}>
            {conversation.status.charAt(0).toUpperCase() +
              conversation.status.slice(1)}
          </Text>
          {conversation.assignedToName && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.assignedText}>
                {conversation.assignedToName}
              </Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    marginHorizontal: 6,
    color: '#CCC',
    fontSize: 12,
  },
  assignedText: {
    fontSize: 12,
    color: '#666',
  },
});

export default ConversationCard;
