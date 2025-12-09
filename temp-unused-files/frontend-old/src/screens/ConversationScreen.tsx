import React, {useState, useEffect, useRef, useMemo} from 'react';
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
  PermissionsAndroid,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import Geolocation from '@react-native-community/geolocation';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import type {Conversation, Message, ConversationStatus} from '../types/conversation';
import {conversationAPI} from '../services/conversationService';
import {savedRepliesAPI, type SavedReply} from '../services/savedRepliesService';
import {draftService} from '../services/draftService';
import MessageBubble from '../components/conversations/MessageBubble';
import PollComposer from '../components/conversations/PollComposer';
import CTAComposer from '../components/conversations/CTAComposer';
import LiveLocationComposer from '../components/conversations/LiveLocationComposer';
import ConnectionStatus from '../components/ConnectionStatus';
import {useSocket} from '../contexts/SocketProvider';
import {EnhancedButton, EnhancedInput, Skeleton, SkeletonCard} from '../components/common';
import theme from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

// Type for messages with date separators
type MessageWithDate = Message | {type: 'date-separator'; date: string; _id: string};

const ConversationScreen: React.FC<Props> = ({navigation, route}) => {
  const {conversationId} = route.params;
  const isNewConversation = conversationId === 'new';
  const {onNewMessage, onMessageUpdate, onMessageReacted, onMessageDeleted, socketState} = useSocket();

  const initialConversation: Conversation | null = isNewConversation ? {
    _id: 'new',
    contact: {
      phoneNumber: '',
      name: 'New Conversation',
    },
    lastMessage: {
      text: '',
      type: 'text',
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
      status: 'pending',
    },
    lastMessageAt: new Date().toISOString(),
    status: 'active',
    unreadCount: 0,
    userId: 'current-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } : null;

  const [conversation, setConversation] = useState<Conversation | null>(initialConversation);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(!isNewConversation);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(isNewConversation);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showButtonComposer, setShowButtonComposer] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showContactComposer, setShowContactComposer] = useState(false);
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [showCTAComposer, setShowCTAComposer] = useState(false);
  const [showLiveLocationComposer, setShowLiveLocationComposer] = useState(false);
  const [showSavedRepliesPicker, setShowSavedRepliesPicker] = useState(false);
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputSlideAnim = useRef(new Animated.Value(50)).current;

  // Animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(inputSlideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Load saved replies when picker is opened
  useEffect(() => {
    if (showSavedRepliesPicker) {
      loadSavedReplies();
    }
  }, [showSavedRepliesPicker]);

  const loadSavedReplies = async () => {
    try {
      setLoadingReplies(true);
      const response = await savedRepliesAPI.getAll();
      setSavedReplies(response.data || []);
    } catch (error) {
      console.error('Error loading saved replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleSelectSavedReply = async (reply: SavedReply) => {
    setMessageText(reply.message);
    setShowSavedRepliesPicker(false);
    
    // Increment usage count
    try {
      await savedRepliesAPI.incrementUsage(reply._id);
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  };

  // Debug: Log socket state
  useEffect(() => {
    console.log('🔍 Conversation: Socket state:', {
      isConnected: socketState.isConnected,
      isConnecting: socketState.isConnecting,
      error: socketState.error,
    });
  }, [socketState]);

  useEffect(() => {
    if (!isNewConversation) {
      loadConversation();
      loadMessages();
      markAsRead();
      loadDraft();
    }
  }, [conversationId, isNewConversation]);

  // Load draft when entering conversation
  const loadDraft = async () => {
    try {
      const draft = await draftService.getDraft(conversationId);
      if (draft && draft.text) {
        setMessageText(draft.text);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  // Auto-save draft when text changes (debounced)
  useEffect(() => {
    if (isNewConversation) return;

    const timeoutId = setTimeout(() => {
      if (messageText.trim()) {
        draftService.saveDraft(conversationId, messageText);
      } else {
        draftService.deleteDraft(conversationId);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [messageText, conversationId, isNewConversation]);

  useEffect(() => {
    if (isNewConversation) return;

    console.log('📡 Subscribing to real-time messages for conversation:', conversationId);

    const unsubscribeNewMessage = onNewMessage((data) => {
      console.log('🆕 New message received via socket:', data);
      console.log('   Current conversation ID:', conversationId);
      console.log('   Message conversation ID:', data.conversationId);

      if (data.conversationId === conversationId) {
        console.log('✅ Message is for this conversation, adding to list');

        const newMessage: Message = {
          _id: data.messageId,
          from: data.from || '',
          to: conversation?.contact?.phoneNumber || '',
          direction: 'incoming',
          type: (data as any).type || 'text',
          content: { text: data.text },
          timestamp: data.timestamp,
          status: 'delivered',
        };

        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => msg._id === data.messageId);
          if (exists) {
            console.log('⚠️ Message already exists, skipping duplicate');
            return prev;
          }
          console.log('➕ Adding new message to list, total:', prev.length + 1);
          return [...prev, newMessage];
        });
        
        // Update conversation object with new message
        if (conversation) {
          setConversation({
            ...conversation,
            lastMessage: {
              text: data.text,
              timestamp: data.timestamp,
              type: 'text',
              direction: 'incoming',
              status: 'delivered',
            },
          });
        }
        
        scrollToBottom();

        markAsRead();
      }
    });

    const unsubscribeMessageUpdate = onMessageUpdate((data) => {
      console.log('📝 Message status updated:', data);

      setMessages(prev =>
        prev.map(msg =>
          msg._id === data.messageId
            ? {...msg, status: data.status as any}
            : msg
        )
      );
    });

    const unsubscribeReaction = onMessageReacted((data) => {
      console.log('👍 Reaction received:', data);
      console.log('   Message ID:', data.messageId);
      console.log('   Emoji:', data.emoji);
      console.log('   Reacted to message:', data.reactedToMessage);

      if (data.conversationId === conversationId) {
        // Show a brief notification about the reaction
        if (data.reactedToMessage) {
          const messagePreview = data.reactedToMessage.text?.substring(0, 30) || `[${data.reactedToMessage.type}]`;
          console.log(`💬 ${data.emoji} reaction on: "${messagePreview}"`);
        }
        
        setMessages(prev =>
          prev.map(msg => {
            if (msg._id === data.messageId) {
              // Initialize reactions array if it doesn't exist
              const reactions = msg.reactions || [];
              
              // Remove existing reaction from this user
              const filteredReactions = reactions.filter(r => r.from !== data.from);
              
              // Add new reaction if emoji is not empty
              if (data.emoji) {
                filteredReactions.push({
                  from: data.from,
                  emoji: data.emoji,
                  timestamp: data.timestamp,
                });
              }
              
              return {
                ...msg,
                reactions: filteredReactions,
              };
            }
            return msg;
          })
        );
      }
    });

    const unsubscribeDeleted = onMessageDeleted((data) => {
      console.log('🗑️ Message deleted:', data);
      console.log('   Message ID:', data.messageId);

      if (data.conversationId === conversationId) {
        setMessages(prev =>
          prev.map(msg => {
            if (msg._id === data.messageId) {
              return {
                ...msg,
                isDeleted: true,
                deletedAt: data.deletedAt,
                deletedBy: 'user',
              };
            }
            return msg;
          })
        );
      }
    });

    return () => {
      if (__DEV__) {
        console.log('🔌 Unsubscribing from real-time messages');
      }
      unsubscribeNewMessage();
      unsubscribeMessageUpdate();
      unsubscribeReaction();
      unsubscribeDeleted();
    };
  }, [conversationId, isNewConversation, onNewMessage, onMessageUpdate, onMessageReacted, onMessageDeleted]);

  const loadConversation = async () => {
    try {
      const data = await conversationAPI.getConversation(conversationId);

      setConversation(data);

      if (data.messages && Array.isArray(data.messages)) {
        const mappedMessages = data.messages.map((msg: any) => ({
          _id: msg._id,
          whatsappMessageId: msg.whatsappMessageId,
          from: msg.from || '',
          to: msg.to || '',
          direction: msg.direction,
          type: msg.type || 'text',
          content: msg.content || { text: '' },
          timestamp: msg.timestamp || msg.createdAt,
          status: msg.status,
          deliveredAt: msg.deliveredAt,
          readAt: msg.readAt,
          reactions: msg.reactions || [],
          isDeleted: msg.isDeleted || false,
          deletedAt: msg.deletedAt,
          deletedBy: msg.deletedBy,
        }));
        setMessages(mappedMessages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      if (!conversation?.messages || conversation.messages.length === 0) {
        const data = await conversationAPI.getMessagesPaginated(conversationId, 1, 50);
        const mappedMessages = (data.messages || []).map((msg: any) => ({
          _id: msg._id,
          whatsappMessageId: msg.whatsappMessageId,
          from: msg.from || '',
          to: msg.to || '',
          direction: msg.direction,
          type: msg.type || 'text',
          content: msg.content || { text: '' },
          status: msg.status,
          timestamp: msg.timestamp || msg.createdAt,
          deliveredAt: msg.deliveredAt,
          readAt: msg.readAt,
          reactions: msg.reactions || [],
          isDeleted: msg.isDeleted || false,
          deletedAt: msg.deletedAt,
          deletedBy: msg.deletedBy,
        }));

        setMessages(mappedMessages.reverse());
      }
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

    // Clear draft after sending
    await draftService.deleteDraft(conversationId);

    const actualConversationId = conversation._id;

    const tempMessage: Message = {
      _id: `temp_${Date.now()}`,
      from: 'system',
      to: conversation.contact?.phoneNumber || '',
      direction: 'outgoing',
      type: 'text',
      content: { text: content },
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const response = await conversationAPI.sendMessage({
        conversationId: actualConversationId,
        content,
      });

      const newMessage: Message = {
        _id: response._id,
        whatsappMessageId: (response as any).whatsappMessageId,
        from: (response as any).from || 'system',
        to: (response as any).to || conversation.contact?.phoneNumber || '',
        direction: 'outgoing',
        type: (response as any).type || 'text',
        content: (response as any).content || { text: content },
        timestamp: (response as any).timestamp || new Date().toISOString(),
        status: (response as any).status || 'sent',
        deliveredAt: (response as any).deliveredAt,
        readAt: (response as any).readAt,
      };

      setMessages(prev =>
        prev.map(msg => (msg._id === tempMessage._id ? newMessage : msg)),
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = async () => {
    setShowAttachMenu(false);
    Alert.alert(
      'Send Image',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            try {
              // Request camera permission on Android
              if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.CAMERA,
                  {
                    title: 'Camera Permission',
                    message: 'App needs access to your camera',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                  },
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                  Alert.alert('Permission Denied', 'Camera permission is required');
                  return;
                }
              }

              const result = await launchCamera({
                mediaType: 'photo',
                quality: 0.8,
                saveToPhotos: true,
              });

              if (result.didCancel) {
                return;
              }

              if (result.errorCode) {
                Alert.alert('Error', result.errorMessage || 'Failed to capture image');
                return;
              }

              if (result.assets && result.assets[0]) {
                const image = result.assets[0];
                setSending(true);
                
                try {
                  await conversationAPI.sendImage(
                    conversationId,
                    image.uri || '',
                    undefined // caption
                  );
                  Alert.alert('Success', 'Image sent successfully!');
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to send image');
                }
                
                setSending(false);
              }
            } catch (error) {
              console.error('Camera error:', error);
              Alert.alert('Error', 'Failed to open camera');
            }
          }
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                selectionLimit: 1,
              });

              if (result.didCancel) {
                return;
              }

              if (result.errorCode) {
                Alert.alert('Error', result.errorMessage || 'Failed to pick image');
                return;
              }

              if (result.assets && result.assets[0]) {
                const image = result.assets[0];
                setSending(true);
                
                try {
                  await conversationAPI.sendImage(
                    conversationId,
                    image.uri || '',
                    undefined // caption
                  );
                  Alert.alert('Success', 'Image sent successfully!');
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to send image');
                }
                
                setSending(false);
              }
            } catch (error) {
              console.error('Gallery error:', error);
              Alert.alert('Error', 'Failed to open gallery');
            }
          }
        },
        {text: 'Cancel', style: 'cancel'}
      ]
    );
  };

  const handleSendDocument = async () => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.doc, DocumentPicker.types.docx],
        copyTo: 'cachesDirectory',
      });

      if (result && result[0]) {
        const document = result[0];
        setSending(true);
        
        try {
          await conversationAPI.sendDocument(
            conversationId,
            document.uri || '',
            document.name || 'document.pdf'
          );
          Alert.alert('Success', 'Document sent successfully!');
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to send document');
        }
        
        setSending(false);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        // User cancelled
        return;
      }
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSendLocation = async () => {
    setShowAttachMenu(false);
    Alert.alert(
      'Share Location',
      'Would you like to share your current location?',
      [
        {
          text: 'Share',
          onPress: async () => {
            try {
              setSending(true);
              
              // Request location permission on Android
              if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                  {
                    title: 'Location Permission',
                    message: 'App needs access to your location',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                  },
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                  Alert.alert('Permission Denied', 'Location permission is required');
                  setSending(false);
                  return;
                }
              }

              // Get current location
              Geolocation.getCurrentPosition(
                async (position) => {
                  try {
                    const {latitude, longitude} = position.coords;
                    
                    await conversationAPI.sendLocation(
                      conversationId,
                      latitude,
                      longitude,
                      'Current Location',
                      `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                    );
                    
                    Alert.alert('Success', 'Location shared successfully');
                  } catch (error) {
                    console.error('Failed to send location:', error);
                    Alert.alert('Error', 'Failed to send location to WhatsApp API');
                  } finally {
                    setSending(false);
                  }
                },
                (error) => {
                  console.error('Geolocation error:', error);
                  Alert.alert('Error', `Failed to get location: ${error.message}`);
                  setSending(false);
                },
                {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
              );
            } catch (error) {
              console.error('Location error:', error);
              Alert.alert('Error', 'Failed to access location');
              setSending(false);
            }
          }
        },
        {text: 'Cancel', style: 'cancel'}
      ]
    );
  };

  const handleSendReaction = async (messageId: string, emoji: string) => {
    try {
      await conversationAPI.sendReaction(conversationId, messageId, emoji);
      if (__DEV__) {
        console.log(`✅ Reaction sent: ${emoji} to message ${messageId}`);
      }
      // Don't show alert - the reaction will appear via socket update
    } catch (error) {
      console.error('Failed to send reaction:', error);
      Alert.alert('Error', 'Failed to send reaction');
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      await conversationAPI.pinMessage(conversationId, messageId);
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? { ...msg, isPinned: true, pinnedAt: new Date().toISOString() }
            : msg
        )
      );
      Alert.alert('Success', 'Message pinned');
    } catch (error) {
      console.error('Failed to pin message:', error);
      Alert.alert('Error', 'Failed to pin message');
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      await conversationAPI.unpinMessage(conversationId, messageId);
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? { ...msg, isPinned: false, pinnedAt: undefined }
            : msg
        )
      );
      Alert.alert('Success', 'Message unpinned');
    } catch (error) {
      console.error('Failed to unpin message:', error);
      Alert.alert('Error', 'Failed to unpin message');
    }
  };

  const handleSendButtonMessage = async (bodyText: string, buttons: Array<{id: string; title: string}>) => {
    try {
      setSending(true);
      await conversationAPI.sendButtonMessage(conversationId, bodyText, buttons);
      setShowButtonComposer(false);
      Alert.alert('Success', 'Interactive message sent');
    } catch (error) {
      console.error('Failed to send button message:', error);
      Alert.alert('Error', 'Failed to send interactive message');
    } finally {
      setSending(false);
    }
  };

  const handleSendPollMessage = async (question: string, options: string[]) => {
    try {
      await conversationAPI.sendPollMessage(conversationId, question, options);
      setShowPollComposer(false);
      // Message will appear via socket event
    } catch (error) {
      console.error('Failed to send poll message:', error);
      throw error; // Let PollComposer handle the error display
    }
  };

  const handleSendCTAMessage = async (
    bodyText: string,
    ctaButtons: Array<{
      type: 'PHONE_NUMBER' | 'URL';
      title: string;
      phone_number?: string;
      url?: string;
    }>
  ) => {
    try {
      await conversationAPI.sendCTAMessage(conversationId, bodyText, ctaButtons);
      setShowCTAComposer(false);
      // Message will appear via socket event
    } catch (error) {
      console.error('Failed to send CTA message:', error);
      throw error; // Let CTAComposer handle the error display
    }
  };

  const handleSendLiveLocation = async (data: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
    duration: number;
  }) => {
    try {
      await conversationAPI.sendLiveLocation(
        conversationId,
        data.latitude,
        data.longitude,
        data.name,
        data.address,
        data.duration
      );
      // Message will appear via socket event
      loadConversation(); // Refresh to show new message
    } catch (error) {
      console.error('Failed to start live location sharing:', error);
      throw error; // Let LiveLocationComposer handle the error display
    }
  };

  const handleAssign = async (agentId: string, agentName: string) => {
    try {
      await conversationAPI.updateStatus(conversationId, 'active');
      if (conversation) {
        setConversation({
          ...conversation,
          assignedTo: agentId,
          assignedToName: agentName,
        });
      }
    } catch (error) {
      console.error('Failed to assign conversation:', error);
    }
  };

  const handleStatusChange = async (status: ConversationStatus) => {
    try {
      await conversationAPI.updateStatus(conversationId, status);
      if (conversation) {
        setConversation({
          ...conversation,
          status,
        });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleToggleArchive = async () => {
    const target = conversation?.status === 'archived' ? 'active' : 'archived';
    await handleStatusChange(target as any);
  };

  const handleToggleBlock = async () => {
    if (!conversation) return;
    
    const isBlocked = conversation.status === 'blocked';
    const action = isBlocked ? 'unblock' : 'block';
    const contactName = conversation.contact?.name || conversation.contact?.phoneNumber || 'this contact';
    
    Alert.alert(
      isBlocked ? 'Unblock Contact' : 'Block Contact',
      isBlocked 
        ? `Are you sure you want to unblock ${contactName}? You will be able to send and receive messages again.`
        : `Are you sure you want to block ${contactName}? You won't be able to send or receive messages from this contact.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const updatedConversation = isBlocked
                ? await conversationAPI.unblockConversation(conversationId)
                : await conversationAPI.blockConversation(conversationId);
              
              setConversation(updatedConversation);
              
              Alert.alert(
                'Success',
                isBlocked 
                  ? `${contactName} has been unblocked.`
                  : `${contactName} has been blocked.`
              );
            } catch (error) {
              console.error(`Failed to ${action} contact:`, error);
              Alert.alert(
                'Error',
                `Failed to ${action} contact. Please try again.`
              );
            }
          },
        },
      ]
    );
  };

  const handleStartConversation = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);


      const mappedConversation: Conversation = {
        _id: `temp_${Date.now()}`,
        contact: {
          phoneNumber: cleanPhone,
          name: recipientName || cleanPhone,
        },
        lastMessage: {
          text: '',
          type: 'text',
          direction: 'outgoing',
          timestamp: new Date().toISOString(),
          status: 'pending',
        },
        lastMessageAt: new Date().toISOString(),
        status: 'active',
        unreadCount: 0,
        userId: 'current-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

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

  // Helper function to format date for separators (WhatsApp style)
  const formatDateSeparator = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to start of day for comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      // Format as "20/10/2025" or "October 20, 2025"
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  };

  // Group messages by date and insert date separators
  const messagesWithDates = useMemo(() => {
    const result: MessageWithDate[] = [];
    let lastDate = '';

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp).toDateString();
      
      if (messageDate !== lastDate) {
        // Insert date separator
        result.push({
          type: 'date-separator',
          date: formatDateSeparator(message.timestamp),
          _id: `date-${messageDate}`,
        });
        lastDate = messageDate;
      }

      result.push(message);
    });

    return result;
  }, [messages]);

  const renderMessageItem = ({item}: {item: MessageWithDate}) => {
    if ('type' in item && item.type === 'date-separator') {
      return (
        <View style={styles.dateSeparatorContainer}>
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{item.date}</Text>
          </View>
        </View>
      );
    }

    const message = item as Message;
    return (
      <MessageBubble 
        message={message} 
        onReaction={handleSendReaction}
        onPin={handlePinMessage}
        onUnpin={handleUnpinMessage}
      />
    );
  };

  if (loading || !conversation) {
    return (
      <View style={styles.loadingContainer}>
        <View style={{width: '100%', padding: theme.spacing.md}}>
          <SkeletonCard />
          <View style={{height: theme.spacing.md}} />
          <Skeleton width="80%" height={60} />
          <View style={{height: theme.spacing.xs}} />
          <Skeleton width="70%" height={60} style={{alignSelf: 'flex-end'}} />
          <View style={{height: theme.spacing.xs}} />
          <Skeleton width="85%" height={60} />
          <View style={{height: theme.spacing.xs}} />
          <Skeleton width="75%" height={60} style={{alignSelf: 'flex-end'}} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Connection Status */}
      <ConnectionStatus socketState={socketState} />
      
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
        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.7}>
          <Text style={styles.headerName}>
            {conversation.contact?.name || conversation.contact?.phoneNumber || 'Unknown'}
          </Text>
          <View style={styles.phoneRow}>
            <Icon name="phone" size={12} color={theme.colors.textInverse} style={{opacity: 0.8}} />
            <Text style={styles.headerPhone}>
              {conversation.contact?.phoneNumber || ''}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            loadConversation();
            loadMessages();
          }}
          style={styles.refreshButton}
          accessibilityLabel="Refresh">
          <Icon name="refresh-cw" size={20} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </LinearGradient>

      {}
      {conversation.assignedToName && (
        <View style={styles.statusBar}>
          <Icon name="user-check" size={14} color={theme.colors.info} />
          <Text style={styles.statusText}>
            Assigned to {conversation.assignedToName}
          </Text>
        </View>
      )}

      {conversation.status === 'blocked' && (
        <View style={[styles.statusBar, styles.blockedBar]}>
          <Icon name="slash" size={14} color={theme.colors.error} />
          <Text style={styles.statusText}>This contact is blocked</Text>
          <TouchableOpacity
            onPress={() => handleStatusChange('active')}
            style={styles.reopenButton}>
            <Icon name="unlock" size={12} color={theme.colors.textInverse} />
            <Text style={styles.reopenText}>Unblock</Text>
          </TouchableOpacity>
        </View>
      )}

      {conversation.status === 'closed' && (
        <View style={[styles.statusBar, styles.closedBar]}>
          <Icon name="check-circle" size={14} color={theme.colors.error} />
          <Text style={styles.statusText}>This conversation is closed</Text>
          <TouchableOpacity
            onPress={() => handleStatusChange('active')}
            style={styles.reopenButton}>
            <Icon name="refresh-cw" size={12} color={theme.colors.textInverse} />
            <Text style={styles.reopenText}>Reopen</Text>
          </TouchableOpacity>
        </View>
      )}

      {conversation.status === 'archived' && (
        <View style={[styles.statusBar, styles.archivedBar]}>
          <Icon name="archive" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.statusText}>This conversation is archived</Text>
          <TouchableOpacity
            onPress={() => handleStatusChange('active')}
            style={styles.reopenButton}>
            <Icon name="folder" size={12} color={theme.colors.textInverse} />
            <Text style={styles.reopenText}>Unarchive</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actionsBar}>
        <TouchableOpacity onPress={handleToggleArchive} style={styles.actionChip} accessibilityLabel="Archive or Unarchive">
          <Text style={styles.actionText}>{conversation.status === 'archived' ? 'Unarchive' : 'Archive'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleBlock} style={styles.actionChip} accessibilityLabel="Block or Unblock">
          <Text style={styles.actionText}>{conversation.status === 'blocked' ? 'Unblock' : 'Block'}</Text>
        </TouchableOpacity>
        {conversation.status !== 'closed' ? (
          <TouchableOpacity onPress={() => handleStatusChange('closed')} style={styles.actionChip} accessibilityLabel="Close">
            <Text style={styles.actionText}>Close</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => handleStatusChange('active')} style={styles.actionChip} accessibilityLabel="Reopen">
            <Text style={styles.actionText}>Reopen</Text>
          </TouchableOpacity>
        )}
      </View>

      {}
      <FlatList
        ref={flatListRef}
        data={messagesWithDates}
        keyExtractor={item => item._id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
      />

      {}
      {conversation.status !== 'closed' && conversation.status !== 'blocked' && (
        <View>
          {showAttachMenu && (
            <View style={styles.attachMenu}>
              <TouchableOpacity
                style={styles.attachOption}
                onPress={handleSendImage}>
                <Text style={styles.attachIcon}>📷</Text>
                <Text style={styles.attachText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachOption}
                onPress={handleSendDocument}>
                <Text style={styles.attachIcon}>📎</Text>
                <Text style={styles.attachText}>Document</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachOption}
                onPress={handleSendLocation}>
                <Text style={styles.attachIcon}>📍</Text>
                <Text style={styles.attachText}>Location</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachOption}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowButtonComposer(true);
                }}>
                <Text style={styles.attachIcon}>🔘</Text>
                <Text style={styles.attachText}>Buttons</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachOption}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowContactComposer(true);
                }}>
                <Text style={styles.attachIcon}>👤</Text>
                <Text style={styles.attachText}>Contact</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachOption}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowPollComposer(true);
                }}>
                <Text style={styles.attachIcon}>📊</Text>
                <Text style={styles.attachText}>Poll</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachOption}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowCTAComposer(true);
                }}>
                <Text style={styles.attachIcon}>🔗</Text>
                <Text style={styles.attachText}>CTA Button</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachOption}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowLiveLocationComposer(true);
                }}>
                <Text style={styles.attachIcon}>🌐</Text>
                <Text style={styles.attachText}>Live Location</Text>
              </TouchableOpacity>
            </View>
          )}
          <Animated.View 
            style={[
              styles.inputContainer,
              {
                opacity: fadeAnim,
                transform: [{translateY: inputSlideAnim}],
              },
            ]}>
            <TouchableOpacity
              onPress={() => setShowAttachMenu(!showAttachMenu)}
              style={styles.attachButton}>
              <Icon name="plus-circle" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSavedRepliesPicker(true)}
              style={styles.savedRepliesButton}>
              <Icon name="message-text" size={24} color={theme.colors.secondary} />
            </TouchableOpacity>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a message..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                maxLength={1000}
              />
            </View>
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
                <Icon name="send" size={22} color={theme.colors.textInverse} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {}
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

      {/* Contact Composer Modal */}
      <Modal
        visible={showContactComposer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactComposer(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Contact Card</Text>
              <TouchableOpacity
                onPress={() => setShowContactComposer(false)}
                style={styles.modalCloseButton}>
                <Text style={styles.modalCloseIcon}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Quick Send Examples</Text>
              
              <TouchableOpacity
                style={styles.contactExampleButton}
                onPress={async () => {
                  try {
                    setSending(true);
                    setShowContactComposer(false);
                    
                    const contacts = [{
                      name: {
                        formatted_name: 'John Doe',
                        first_name: 'John',
                        last_name: 'Doe',
                      },
                      phones: [
                        {
                          phone: '+1234567890',
                          type: 'CELL',
                        }
                      ],
                      emails: [
                        {
                          email: 'john.doe@example.com',
                          type: 'WORK',
                        }
                      ],
                      org: {
                        company: 'Example Corp',
                        title: 'Manager',
                      }
                    }];
                    
                    await conversationAPI.sendContact(conversationId, contacts);
                    Alert.alert('Success', 'Contact card sent successfully');
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to send contact');
                  } finally {
                    setSending(false);
                  }
                }}>
                <Text style={styles.contactExampleIcon}>👤</Text>
                <View style={styles.contactExampleText}>
                  <Text style={styles.contactExampleTitle}>Sample Contact</Text>
                  <Text style={styles.contactExampleSubtitle}>John Doe - +1234567890</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactExampleButton}
                onPress={async () => {
                  try {
                    setSending(true);
                    setShowContactComposer(false);
                    
                    const contacts = [{
                      name: {
                        formatted_name: 'Support Team',
                        first_name: 'Support',
                        last_name: 'Team',
                      },
                      phones: [
                        {
                          phone: '+1-800-SUPPORT',
                          type: 'WORK',
                        }
                      ],
                      emails: [
                        {
                          email: 'support@company.com',
                          type: 'WORK',
                        }
                      ],
                    }];
                    
                    await conversationAPI.sendContact(conversationId, contacts);
                    Alert.alert('Success', 'Contact card sent successfully');
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to send contact');
                  } finally {
                    setSending(false);
                  }
                }}>
                <Text style={styles.contactExampleIcon}>🏢</Text>
                <View style={styles.contactExampleText}>
                  <Text style={styles.contactExampleTitle}>Support Team</Text>
                  <Text style={styles.contactExampleSubtitle}>1-800-SUPPORT</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.inputHint}>
                💡 Tip: Contact cards (VCards) let you share detailed contact information that customers can save directly to their phone.
              </Text>
              
              <Text style={styles.inputHint}>
                📝 Note: You can customize the contact details by modifying the contact object structure.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Button Composer Modal */}
      <Modal
        visible={showButtonComposer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowButtonComposer(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Interactive Message</Text>
              <TouchableOpacity
                onPress={() => setShowButtonComposer(false)}
                style={styles.modalCloseButton}>
                <Text style={styles.modalCloseIcon}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Message Text *</Text>
              <TextInput
                style={[styles.modalInput, {height: 80}]}
                placeholder="Please confirm your appointment:"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                onChangeText={(text) => {
                  // Store in state if needed
                }}
              />

              <Text style={styles.inputLabel}>Quick Example</Text>
              <TouchableOpacity
                style={styles.exampleButton}
                onPress={() => {
                  const buttons = [
                    {id: 'confirm', title: 'Confirm'},
                    {id: 'cancel', title: 'Cancel'},
                    {id: 'reschedule', title: 'Reschedule'}
                  ];
                  handleSendButtonMessage('Please confirm your appointment:', buttons);
                }}>
                <Text style={styles.exampleButtonText}>
                  📋 Send Appointment Confirmation
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exampleButton}
                onPress={() => {
                  const buttons = [
                    {id: 'yes', title: 'Yes'},
                    {id: 'no', title: 'No'}
                  ];
                  handleSendButtonMessage('Are you available for a call?', buttons);
                }}>
                <Text style={styles.exampleButtonText}>
                  📞 Send Yes/No Question
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputHint}>
                Note: Interactive buttons require WhatsApp Business API approval
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Poll Composer Modal */}
      <Modal
        visible={showPollComposer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPollComposer(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <PollComposer
              onSend={handleSendPollMessage}
              onCancel={() => setShowPollComposer(false)}
            />
          </View>
        </View>
      </Modal>

      {/* CTA Composer Modal */}
      <Modal
        visible={showCTAComposer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCTAComposer(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <CTAComposer
              onSend={handleSendCTAMessage}
              onCancel={() => setShowCTAComposer(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Live Location Composer Modal */}
      <Modal
        visible={showLiveLocationComposer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLiveLocationComposer(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LiveLocationComposer
              onSend={handleSendLiveLocation}
              onClose={() => setShowLiveLocationComposer(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Contact Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Profile</Text>
              <TouchableOpacity
                onPress={() => setShowProfileModal(false)}
                style={styles.modalCloseButton}>
                <Text style={styles.modalCloseIcon}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileContent}>
              {/* Profile Avatar */}
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {(conversation.contact?.name || conversation.contact?.phoneNumber || 'U')[0].toUpperCase()}
                </Text>
              </View>

              {/* Contact Name */}
              <Text style={styles.profileName}>
                {conversation.contact?.name || 'Unknown Contact'}
              </Text>

              {/* Contact Details */}
              <View style={styles.profileDetailsSection}>
                <View style={styles.profileDetailRow}>
                  <Icon name="phone" size={18} color={theme.colors.primary} />
                  <View style={styles.profileDetailText}>
                    <Text style={styles.profileDetailLabel}>Phone Number</Text>
                    <Text style={styles.profileDetailValue}>
                      +{conversation.contact?.phoneNumber || 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.profileDetailRow}>
                  <Icon name="message-circle" size={18} color={theme.colors.primary} />
                  <View style={styles.profileDetailText}>
                    <Text style={styles.profileDetailLabel}>Conversation Status</Text>
                    <Text style={[
                      styles.profileDetailValue,
                      styles.statusBadge,
                      conversation.status === 'active' && styles.statusActive,
                      conversation.status === 'closed' && styles.statusClosed,
                      conversation.status === 'archived' && styles.statusArchived,
                      conversation.status === 'blocked' && styles.statusBlocked,
                    ]}>
                      {conversation.status?.toUpperCase() || 'ACTIVE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.profileDetailRow}>
                  <Icon name="calendar" size={18} color={theme.colors.primary} />
                  <View style={styles.profileDetailText}>
                    <Text style={styles.profileDetailLabel}>First Contact</Text>
                    <Text style={styles.profileDetailValue}>
                      {new Date(conversation.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                <View style={styles.profileDetailRow}>
                  <Icon name="hash" size={18} color={theme.colors.primary} />
                  <View style={styles.profileDetailText}>
                    <Text style={styles.profileDetailLabel}>Total Messages</Text>
                    <Text style={styles.profileDetailValue}>
                      {messages.length} messages
                    </Text>
                  </View>
                </View>

                {conversation.assignedToName && (
                  <View style={styles.profileDetailRow}>
                    <Icon name="user-check" size={18} color={theme.colors.primary} />
                    <View style={styles.profileDetailText}>
                      <Text style={styles.profileDetailLabel}>Assigned To</Text>
                      <Text style={styles.profileDetailValue}>
                        {conversation.assignedToName}
                      </Text>
                    </View>
                  </View>
                )}

                {conversation.tags && conversation.tags.length > 0 && (
                  <View style={styles.profileDetailRow}>
                    <Icon name="tag" size={18} color={theme.colors.primary} />
                    <View style={styles.profileDetailText}>
                      <Text style={styles.profileDetailLabel}>Tags</Text>
                      <View style={styles.tagsContainer}>
                        {conversation.tags.map((tag: string, index: number) => (
                          <View key={index} style={styles.tagChip}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.profileActions}>
                <TouchableOpacity
                  style={[styles.profileActionButton, styles.blockButton]}
                  onPress={() => {
                    setShowProfileModal(false);
                    handleToggleBlock();
                  }}>
                  <Icon 
                    name={conversation.status === 'blocked' ? 'unlock' : 'slash'} 
                    size={18} 
                    color={theme.colors.textInverse} 
                  />
                  <Text style={styles.profileActionText}>
                    {conversation.status === 'blocked' ? 'Unblock' : 'Block'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.profileActionButton, styles.archiveButton]}
                  onPress={() => {
                    setShowProfileModal(false);
                    handleToggleArchive();
                  }}>
                  <Icon 
                    name={conversation.status === 'archived' ? 'folder' : 'archive'} 
                    size={18} 
                    color={theme.colors.textInverse} 
                  />
                  <Text style={styles.profileActionText}>
                    {conversation.status === 'archived' ? 'Unarchive' : 'Archive'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Saved Replies Picker Modal */}
      <Modal
        visible={showSavedRepliesPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSavedRepliesPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.savedRepliesModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Replies</Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  onPress={() => {
                    setShowSavedRepliesPicker(false);
                    navigation.navigate('SavedReplies');
                  }}
                  style={styles.manageButton}>
                  <Icon name="settings" size={20} color={theme.colors.primary} />
                  <Text style={styles.manageButtonText}>Manage</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowSavedRepliesPicker(false)}
                  style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseIcon}>×</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingReplies ? (
              <View style={styles.savedRepliesLoading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : savedReplies.length === 0 ? (
              <View style={styles.savedRepliesEmpty}>
                <Icon name="message-circle" size={48} color={theme.colors.textTertiary} />
                <Text style={styles.savedRepliesEmptyTitle}>No Saved Replies</Text>
                <Text style={styles.savedRepliesEmptyText}>
                  Create saved replies to send messages quickly
                </Text>
                <TouchableOpacity
                  style={styles.createRepliesButton}
                  onPress={() => {
                    setShowSavedRepliesPicker(false);
                    navigation.navigate('SavedReplies');
                  }}>
                  <Text style={styles.createRepliesButtonText}>Create Saved Replies</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={savedReplies}
                keyExtractor={item => item._id}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={styles.savedReplyItem}
                    onPress={() => handleSelectSavedReply(item)}>
                    <View style={styles.savedReplyHeader}>
                      <Text style={styles.savedReplyShortcut}>/{item.shortcut}</Text>
                      <View style={[styles.savedReplyCategoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
                        <Text style={styles.savedReplyCategoryText}>{item.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.savedReplyMessage} numberOfLines={2}>
                      {item.message}
                    </Text>
                    {item.usageCount > 0 && (
                      <Text style={styles.savedReplyUsage}>
                        Used {item.usageCount} times
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.savedRepliesList}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    greeting: '#4CAF50',
    support: '#2196F3',
    sales: '#FF9800',
    closing: '#9C27B0',
    faq: '#00BCD4',
    other: '#607D8B',
  };
  return colors[category] || colors.other;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
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
  refreshButton: {
    width: 40,
    height: 40,
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
  blockedBar: {
    backgroundColor: '#ffe6e6',
    justifyContent: 'space-between',
  },
  archivedBar: {
    backgroundColor: '#f5f5f5',
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
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  messagesList: {
    padding: theme.spacing.xs,
  },
  attachMenu: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  attachOption: {
    alignItems: 'center',
    gap: 4,
  },
  attachIcon: {
    fontSize: 24,
  },
  attachText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight + '40',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  attachButtonIcon: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  savedRepliesButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondaryLight + '40',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.md,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  input: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    maxHeight: 100,
    color: theme.colors.text,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
    ...theme.shadows.sm,
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
  exampleButton: {
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.borderRadius.base,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  exampleButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  dateSeparator: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dateSeparatorText: {
    ...theme.typography.caption,
    color: '#54656F',
    fontWeight: '500',
    fontSize: 12,
  },
  // Profile Modal Styles
  profileModalContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '85%',
    ...theme.shadows.lg,
  },
  profileContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  profileAvatarText: {
    ...theme.typography.h1,
    color: theme.colors.textInverse,
    fontWeight: 'bold',
  },
  profileName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  profileDetailsSection: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  profileDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  profileDetailText: {
    flex: 1,
  },
  profileDetailLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  profileDetailValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.base,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: theme.colors.success + '20',
    color: theme.colors.success,
  },
  statusClosed: {
    backgroundColor: theme.colors.error + '20',
    color: theme.colors.error,
  },
  statusArchived: {
    backgroundColor: theme.colors.textSecondary + '20',
    color: theme.colors.textSecondary,
  },
  statusBlocked: {
    backgroundColor: '#ff0000' + '20',
    color: '#ff0000',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  tagText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  profileActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    width: '100%',
  },
  profileActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  profileActionText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  blockButton: {
    backgroundColor: theme.colors.error,
  },
  archiveButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  // Contact Composer Styles
  contactExampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  contactExampleIcon: {
    fontSize: 32,
  },
  contactExampleText: {
    flex: 1,
  },
  contactExampleTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactExampleSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  savedRepliesModal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '70%',
    width: '100%',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.md,
  },
  manageButtonText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  savedRepliesLoading: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedRepliesEmpty: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedRepliesEmptyTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  savedRepliesEmptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  createRepliesButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  createRepliesButtonText: {
    ...theme.typography.body,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  savedRepliesList: {
    padding: theme.spacing.sm,
  },
  savedReplyItem: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  savedReplyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  savedReplyShortcut: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  savedReplyCategoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  savedReplyCategoryText: {
    ...theme.typography.caption,
    color: theme.colors.textInverse,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  savedReplyMessage: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  savedReplyUsage: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});

export default ConversationScreen;
