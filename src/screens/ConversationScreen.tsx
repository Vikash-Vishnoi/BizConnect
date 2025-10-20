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
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import type {Conversation, Message} from '../types/conversation';
import {conversationAPI} from '../services/conversationService';
import MessageBubble from '../components/conversations/MessageBubble';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

const ConversationScreen: React.FC<Props> = ({navigation, route}) => {
  const {conversationId} = route.params;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversation();
    loadMessages();
    markAsRead();
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      const data = await conversationAPI.getConversation(conversationId);
      setConversation(data);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await conversationAPI.getMessages(conversationId);
      setMessages(data.reverse()); // Reverse to show oldest first
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
    if (!messageText.trim() || sending) {
      return;
    }

    const content = messageText.trim();
    setMessageText('');
    setSending(true);

    // Optimistic UI update
    const tempMessage: Message = {
      _id: `temp_${Date.now()}`,
      conversationId,
      content,
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const newMessage = await conversationAPI.sendMessage({
        conversationId,
        content,
      });

      // Replace temp message with real one
      setMessages(prev =>
        prev.map(msg => (msg._id === tempMessage._id ? newMessage : msg)),
      );
    } catch (error) {
      console.error('Failed to send message:', error);
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

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  };

  if (loading || !conversation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{conversation.patientName}</Text>
          <Text style={styles.headerPhone}>{conversation.patientPhone}</Text>
        </View>
        {conversation.status !== 'closed' && (
          <TouchableOpacity
            onPress={() => handleStatusChange('closed')}
            style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Bar */}
      {conversation.status === 'assigned' && conversation.assignedToName && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            Assigned to {conversation.assignedToName}
          </Text>
        </View>
      )}

      {conversation.status === 'closed' && (
        <View style={[styles.statusBar, styles.closedBar]}>
          <Text style={styles.statusText}>This conversation is closed</Text>
          <TouchableOpacity
            onPress={() => handleStatusChange('open')}
            style={styles.reopenButton}>
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
            placeholderTextColor="#999"
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
            <Text style={styles.sendButtonText}>
              {sending ? '...' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    backgroundColor: '#25D366',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 28,
    color: '#fff',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerPhone: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBar: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closedBar: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 13,
    color: '#666',
  },
  reopenButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#25D366',
    borderRadius: 12,
  },
  reopenText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    color: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ConversationScreen;
