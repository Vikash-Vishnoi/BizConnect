import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import type {Conversation} from '../../types/conversation';
import theme from '../../theme';

interface Props {
  conversation: Conversation;
  onPress: () => void;
}

const ConversationCard: React.FC<Props> = ({conversation, onPress}) => {
  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
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
    } catch (error) {
      return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (conversation.status) {
      case 'open':
        return theme.colors.success;
      case 'assigned':
        return theme.colors.info;
      case 'closed':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textTertiary;
    }
  };

  const getStatusIcon = () => {
    switch (conversation.status) {
      case 'open':
        return '💬';
      case 'assigned':
        return '👤';
      case 'closed':
        return '✓';
      default:
        return '?';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, {backgroundColor: getStatusColor()}]}>
        <Text style={styles.avatarText}>
          {(conversation.patientName || '?').charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.patientName || 'Unknown'}
          </Text>
          <View style={styles.timeContainer}>
            <Text style={styles.clockIcon}>🕐</Text>
            <Text style={styles.time}>{formatTime(conversation.lastActivity)}</Text>
          </View>
        </View>

        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={2}>
            {conversation.lastMessage || 'No messages'}
          </Text>
          {(conversation.unreadCount || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusIcon, {color: getStatusColor()}]}>{getStatusIcon()}</Text>
            <Text style={[styles.statusText, {color: getStatusColor()}]}>
              {conversation.status.charAt(0).toUpperCase() +
                conversation.status.slice(1)}
            </Text>
          </View>
          {conversation.assignedToName && (
            <View style={styles.assignedContainer}>
              <Text style={styles.userIcon}>👤</Text>
              <Text style={styles.assignedText}>
                {conversation.assignedToName}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: {
    ...theme.typography.h3,
    color: theme.colors.textInverse,
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
    ...theme.typography.h4,
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clockIcon: {
    fontSize: 10,
  },
  time: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  lastMessage: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginRight: theme.spacing.xs,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: theme.colors.textInverse,
    ...theme.typography.caption,
    fontWeight: 'bold',
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  statusText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  assignedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: theme.spacing.xs,
    paddingLeft: theme.spacing.xs,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  userIcon: {
    fontSize: 10,
  },
  assignedText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});

export default ConversationCard;
