import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Clipboard} from 'react-native';
import type {Message} from '../../types/conversation';
import theme from '../../theme';

interface Props {
  message: Message;
  onReaction?: (messageId: string, emoji: string) => void;
  onLongPress?: (messageId: string) => void;
  onCopy?: (text: string) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

const MessageBubble: React.FC<Props> = ({message, onReaction, onLongPress, onCopy, onPin, onUnpin}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const isIncoming = message.direction === 'incoming';
  const isDeleted = message.isDeleted || false;

  const formatTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getMessageText = () => {
    // Show deleted message indicator
    if (isDeleted) {
      return '🗑️ This message was deleted';
    }
    
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
    
    if (message.type === 'contacts' || message.content?.contacts) {
      const contacts = message.content?.contacts;
      if (contacts && Array.isArray(contacts) && contacts.length > 0) {
        const contact = contacts[0];
        const name = contact.name?.formatted_name || 'Contact';
        const phone = contact.phones?.[0]?.phone || '';
        return `👤 Contact: ${name}${phone ? ' - ' + phone : ''}`;
      }
      return `👤 Contact card shared`;
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

  const handleReaction = (emoji: string) => {
    setShowReactionPicker(false);
    if (onReaction) {
      onReaction(message._id, emoji);
    }
  };

  const handleLongPressMessage = () => {
    if (!isDeleted) {
      setShowActionMenu(true);
      if (onLongPress) {
        onLongPress(message._id);
      }
    }
  };

  const handleCopyMessage = () => {
    const textToCopy = getMessageText();
    if (textToCopy && !textToCopy.startsWith('[') && !textToCopy.startsWith('🗑️')) {
      Clipboard.setString(textToCopy);
      Alert.alert('Copied', 'Message copied to clipboard');
      setShowActionMenu(false);
      if (onCopy) {
        onCopy(textToCopy);
      }
    }
  };

  const handlePinToggle = () => {
    setShowActionMenu(false);
    if (message.isPinned && onUnpin) {
      onUnpin(message._id);
    } else if (!message.isPinned && onPin) {
      onPin(message._id);
    }
  };

  const quickReactions = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={handleLongPressMessage}
        style={[
          styles.container,
          isIncoming ? styles.incomingContainer : styles.outgoingContainer,
        ]}>
        <View
          style={[
            styles.bubble,
            isIncoming ? styles.incomingBubble : styles.outgoingBubble,
            isDeleted && styles.deletedBubble,
          ]}>
          {message.isPinned && !isDeleted && (
            <View style={styles.pinnedIndicator}>
              <Text style={styles.pinnedIcon}>📌</Text>
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          )}
          {/* Poll Message Display */}
          {message.type === 'interactive' && message.content?.interactive?.type === 'poll' && !isDeleted && (
            <View style={styles.pollContainer}>
              <Text style={[styles.pollQuestion, isIncoming ? styles.incomingText : styles.outgoingText]}>
                📊 {message.content.interactive.body || message.content.text}
              </Text>
              <View style={styles.pollOptions}>
                {message.content.interactive.options?.map((option: string, index: number) => (
                  <View key={index} style={styles.pollOption}>
                    <Text style={styles.pollOptionNumber}>{index + 1}</Text>
                    <Text style={[styles.pollOptionText, isIncoming ? styles.incomingText : styles.outgoingText]}>
                      {option}
                    </Text>
                  </View>
                ))}
              </View>
              {message.content.interactive.votes && message.content.interactive.votes.length > 0 && (
                <Text style={[styles.pollVoteCount, isIncoming ? styles.incomingText : styles.outgoingText]}>
                  {message.content.interactive.votes.length} vote(s)
                </Text>
              )}
            </View>
          )}
          {/* CTA Message Display */}
          {message.type === 'interactive' && message.content?.interactive?.type === 'cta' && !isDeleted && (
            <View style={styles.ctaContainer}>
              <Text style={[styles.text, isIncoming ? styles.incomingText : styles.outgoingText]}>
                {message.content.interactive.body || message.content.text}
              </Text>
              <View style={styles.ctaButtons}>
                {message.content.interactive.ctaButtons?.map((button, index) => (
                  <View key={index} style={styles.ctaButton}>
                    <Text style={styles.ctaButtonIcon}>
                      {button.type === 'PHONE_NUMBER' ? '📞' : '🔗'}
                    </Text>
                    <Text style={[styles.ctaButtonText, isIncoming ? styles.incomingText : styles.outgoingText]}>
                      {button.title}
                    </Text>
                    <Text style={[styles.ctaButtonValue, isIncoming ? styles.incomingText : styles.outgoingText]}>
                      {button.type === 'PHONE_NUMBER' ? button.phone_number : button.url}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {message.type === 'image' && message.content?.mediaUrl && !isDeleted && (
            <Text style={[styles.text, isIncoming ? styles.incomingText : styles.outgoingText]}>
              🖼️ [Image preview not available in this view]
            </Text>
          )}
          <Text
            style={[
              styles.text,
              isIncoming ? styles.incomingText : styles.outgoingText,
              isDeleted && styles.deletedText,
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
            {!isIncoming && !isDeleted && (
              <Text
                style={[styles.statusIcon, {color: getStatusColor()}]}>
                {getStatusIcon()}
              </Text>
            )}
            {isDeleted && (
              <Text style={styles.deletedIcon}>🗑️</Text>
            )}
          </View>
          
          {/* Reactions - don't show on deleted messages */}
          {!isDeleted && message.reactions && message.reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {message.reactions.map((reaction, index) => (
                <View key={index} style={styles.reactionBubble}>
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <Text style={styles.reactionFrom}>
                    {reaction.from?.substring(0, 8) || 'User'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Action Menu Modal (Copy + React) */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}>
        <TouchableOpacity
          style={styles.reactionModalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}>
          <View style={styles.actionMenuContainer}>
            <Text style={styles.actionMenuTitle}>Message Actions</Text>
            
            {/* Copy Button */}
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={handleCopyMessage}>
              <Text style={styles.actionMenuIcon}>📋</Text>
              <Text style={styles.actionMenuText}>Copy Message</Text>
            </TouchableOpacity>

            {/* React Button */}
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setShowActionMenu(false);
                setTimeout(() => setShowReactionPicker(true), 200);
              }}>
              <Text style={styles.actionMenuIcon}>😊</Text>
              <Text style={styles.actionMenuText}>Add Reaction</Text>
            </TouchableOpacity>

            {/* Pin/Unpin Button */}
            {!isDeleted && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={handlePinToggle}>
                <Text style={styles.actionMenuIcon}>{message.isPinned ? '📌' : '📍'}</Text>
                <Text style={styles.actionMenuText}>
                  {message.isPinned ? 'Unpin Message' : 'Pin Message'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionMenuCancel}
              onPress={() => setShowActionMenu(false)}>
              <Text style={styles.actionMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showReactionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactionPicker(false)}>
        <TouchableOpacity
          style={styles.reactionModalOverlay}
          activeOpacity={1}
          onPress={() => setShowReactionPicker(false)}>
          <View style={styles.reactionPickerContainer}>
            <Text style={styles.reactionPickerTitle}>React to message</Text>
            <View style={styles.reactionGrid}>
              {quickReactions.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionButton}
                  onPress={() => handleReaction(emoji)}>
                  <Text style={styles.reactionButtonEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.reactionCancelButton}
              onPress={() => setShowReactionPicker(false)}>
              <Text style={styles.reactionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
  deletedBubble: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
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
  deletedText: {
    color: '#999',
    fontStyle: 'italic',
  },
  pinnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  pinnedIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  pinnedText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
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
  deletedIcon: {
    fontSize: 14,
    color: '#ff4444',
    marginLeft: 4,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionBubble: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionFrom: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  // Reaction Picker Modal Styles
  reactionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    minWidth: 280,
    maxWidth: '90%',
    ...theme.shadows.lg,
  },
  reactionPickerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  reactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  reactionButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reactionButtonEmoji: {
    fontSize: 32,
  },
  reactionCancelButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  reactionCancelText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
  },
  // Action Menu Styles
  actionMenuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    minWidth: 260,
    maxWidth: '85%',
    ...theme.shadows.lg,
  },
  actionMenuTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionMenuIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  actionMenuText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  actionMenuCancel: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  actionMenuCancelText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
  },
  // Poll Styles
  pollContainer: {
    marginBottom: theme.spacing.xs,
  },
  pollQuestion: {
    ...theme.typography.body,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  pollOptions: {
    gap: theme.spacing.xs,
  },
  pollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  pollOptionNumber: {
    ...theme.typography.caption,
    fontWeight: '700',
    marginRight: theme.spacing.sm,
    opacity: 0.6,
  },
  pollOptionText: {
    ...theme.typography.bodySmall,
    flex: 1,
  },
  pollVoteCount: {
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  // CTA Styles
  ctaContainer: {
    marginBottom: theme.spacing.xs,
  },
  ctaButtons: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  ctaButtonIcon: {
    fontSize: 18,
  },
  ctaButtonText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  ctaButtonValue: {
    ...theme.typography.caption,
    opacity: 0.7,
  },
});

export default MessageBubble;
