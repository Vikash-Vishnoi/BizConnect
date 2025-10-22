import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import type {Conversation, Message} from '../types/conversation';
import {conversationAPI} from '../services/conversationService';
import MessageBubble from '../components/conversations/MessageBubble';
import theme from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

const ConversationScreen: React.FC<Props> = ({navigation, route}) => {
  const {conversationId} = route.params;
  const isNewConversation = conversationId === 'new';
  
  // Initialize with placeholder for new conversations
  const initialConversation: Conversation | null = isNewConversation ? {
    _id: 'new',
    patientName: 'New Conversation',
    patientPhone: '',
    lastMessage: '',
    lastActivity: new Date().toISOString(),
    status: 'open',
    unreadCount: 0,
  } : null;
  
  const [conversation, setConversation] = useState<Conversation | null>(initialConversation);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(!isNewConversation);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(isNewConversation);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!isNewConversation) {
      loadConversation();
      loadMessages();
      markAsRead();
    }
  }, [conversationId, isNewConversation]);

  const loadConversation = async () => {
    try {
      const data = await conversationAPI.getConversation(conversationId);
      
      // Map backend format to frontend format
      const mappedConversation: Conversation = {
        _id: data._id,
        patientName: (data as any).name || (data as any).phoneNumber,
        patientPhone: (data as any).phoneNumber,
        lastMessage: data.lastMessage || '',
        lastActivity: (data as any).lastMessageAt || (data as any).updatedAt || new Date().toISOString(),
        status: (data as any).status === 'active' ? 'open' : (data as any).status === 'archived' ? 'closed' : 'open',
        unreadCount: data.unreadCount || 0,
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
      };
      
      setConversation(mappedConversation);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await conversationAPI.getMessages(conversationId);
      
      // Map backend format to frontend format
      const mappedMessages = (data || []).map((msg: any) => ({
        _id: msg._id,
        conversationId: msg.conversationId,
        content: msg.content?.text || '',
        direction: msg.direction,
        timestamp: msg.timestamp || msg.createdAt,
        status: msg.status,
        senderName: msg.direction === 'incoming' ? msg.from : undefined,
      }));
      
      setMessages(mappedMessages.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await conversationAPI.markAsRead(conversationId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending || !conversation) {
      return;
    }

    const content = messageText.trim();
    setMessageText('');
    setSending(true);

    // Use the actual conversation ID (not 'new' anymore after creation)
    const actualConversationId = conversation._id;

    // Optimistic UI update
    const tempMessage: Message = {
      _id: `temp_${Date.now()}`,
      conversationId: actualConversationId,
      content,
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const response = await conversationAPI.sendMessage({
        conversationId: actualConversationId,
        content,
      });

      // Map backend format to frontend format
      const newMessage: Message = {
        _id: response._id,
        conversationId: actualConversationId,
        content: (response as any).content?.text || content,
        direction: 'outgoing',
        timestamp: (response as any).timestamp || new Date().toISOString(),
        status: (response as any).status || 'sent',
      };

      // Replace temp message with real one
      setMessages(prev =>
        prev.map(msg => (msg._id === tempMessage._id ? newMessage : msg)),
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
    } finally {
      setSending(false);
    }
  };

  const handleAssign = async (agentId: string, agentName: string) => {
    try {
      const updated = await conversationAPI.assignConversation({
        conversationId,
        agentId,
        agentName,
      });
      setConversation(updated);
    } catch (error) {
      console.error('Failed to assign conversation:', error);
    }
  };

  const handleStatusChange = async (status: 'open' | 'assigned' | 'closed') => {
    try {
      const updated = await conversationAPI.updateStatus({
        conversationId,
        status,
      });
      setConversation(updated);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleStartConversation = async () => {
    // Validate phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      
      // Create the conversation on the backend
      const newConversation = await conversationAPI.createConversation(
        cleanPhone,
        recipientName || cleanPhone
      );

      // Map backend response to frontend format
      const mappedConversation: Conversation = {
        _id: newConversation._id,
        patientName: (newConversation as any).name || cleanPhone,
        patientPhone: (newConversation as any).phoneNumber || cleanPhone,
        lastMessage: '',
        lastActivity: new Date().toISOString(),
        status: 'open',
        unreadCount: 0,
      };

      // Close modal and update conversation
      setShowPhoneModal(false);
      setConversation(mappedConversation);
      setLoading(false);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      Alert.alert('Error', 'Failed to create conversation. Please try again.');
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  };

  if (loading || !conversation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Back">
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{conversation.patientName}</Text>
          <View style={styles.phoneRow}>
            <Icon name="phone" size={12} color={theme.colors.textInverse} style={{opacity: 0.8}} />
            <Text style={styles.headerPhone}>{conversation.patientPhone}</Text>
          </View>
        </View>
        {conversation.status !== 'closed' && (
          <TouchableOpacity
            onPress={() => handleStatusChange('closed')}
            style={styles.closeButton}
            accessibilityLabel="Close conversation">
            <Text style={styles.iconText}>×</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Status Bar */}
      {conversation.status === 'assigned' && conversation.assignedToName && (
        <View style={styles.statusBar}>
          <Icon name="user-check" size={14} color={theme.colors.info} />
          <Text style={styles.statusText}>
            Assigned to {conversation.assignedToName}
          </Text>
        </View>
      )}

      {conversation.status === 'closed' && (
        <View style={[styles.statusBar, styles.closedBar]}>
          <Icon name="check-circle" size={14} color={theme.colors.error} />
          <Text style={styles.statusText}>This conversation is closed</Text>
          <TouchableOpacity
            onPress={() => handleStatusChange('open')}
            style={styles.reopenButton}>
            <Icon name="refresh-cw" size={12} color={theme.colors.textInverse} />
            <Text style={styles.reopenText}>Reopen</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id}
        renderItem={({item}) => <MessageBubble message={item} />}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
      />

      {/* Input Bar */}
      {conversation.status !== 'closed' && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}>
            {sending ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.iconText}>↴</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* New Conversation Modal */}
      <Modal
        visible={showPhoneModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPhoneModal(false);
          navigation.goBack();
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Conversation</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPhoneModal(false);
                  navigation.goBack();
                }}
                style={styles.modalCloseButton}>
                <Text style={styles.modalCloseIcon}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Recipient Name (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Enter name..."
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.modalInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="919509545832"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
                autoFocus
              />

              <Text style={styles.inputHint}>
                Format: Country code + number (no spaces or +)
              </Text>
              <Text style={styles.inputHint}>
                Example: 919509545832 for India
              </Text>

              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartConversation}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.startButtonGradient}>
                  <Text style={styles.startButtonText}>Start Conversation</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECE5DD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    ...theme.typography.h3,
    color: theme.colors.textInverse,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerPhone: {
    ...theme.typography.caption,
    color: theme.colors.textInverse,
    opacity: 0.9,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBar: {
    backgroundColor: theme.colors.infoLight,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  closedBar: {
    backgroundColor: theme.colors.errorLight,
    justifyContent: 'space-between',
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  reopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.base,
  },
  reopenText: {
    color: theme.colors.textInverse,
    ...theme.typography.caption,
    fontWeight: '600',
  },
  messagesList: {
    padding: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    maxHeight: 100,
    color: theme.colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  iconText: {
    fontSize: 20,
    color: theme.colors.textInverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.xl,
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseIcon: {
    fontSize: 32,
    color: theme.colors.textSecondary,
  },
  modalContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  inputLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.base,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  startButton: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.base,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  startButtonGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  startButtonText: {
    ...theme.typography.h4,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
});

export default ConversationScreen;
