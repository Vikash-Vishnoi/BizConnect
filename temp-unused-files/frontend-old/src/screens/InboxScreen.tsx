import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppHeader} from '../components/common';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import type {Conversation} from '../types/conversation';
import {conversationAPI} from '../services/conversationService';
import {draftService, type Draft} from '../services/draftService';
import ConversationCard from '../components/conversations/ConversationCard';
import FilterModal, { type ConversationFilters } from '../components/common/FilterModal';
import ConnectionStatus from '../components/ConnectionStatus';
import {useSocket} from '../contexts/SocketProvider';
import {EmptyState, SkeletonList, EnhancedButton} from '../components/common';
import theme from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Inbox'>;

type FilterType = 'all' | 'active' | 'closed';

const InboxScreen: React.FC<Props> = ({navigation}) => {
  const {onNewMessage, onConversationStatusChanged, onConversationNew, socketState} = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    Conversation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('active');
  const [unreadCount, setUnreadCount] = useState(0);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<ConversationFilters>({
    statuses: [],
    tags: [],
    assignedAgents: [],
    dateRange: {start: null, end: null},
    unreadOnly: false,
    hasTag: false,
    isAssigned: false,
  });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Debug: Log socket state on mount and when it changes
  useEffect(() => {
    console.log('🔍 Inbox: Socket state updated:', {
      isConnected: socketState.isConnected,
      isConnecting: socketState.isConnecting,
      error: socketState.error,
      lastConnected: socketState.lastConnected,
    });
  }, [socketState]);
  
  // Animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    loadConversations();
    loadUnreadCount();
    loadDrafts();
  }, []);

  // Reload drafts when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDrafts();
    });
    return unsubscribe;
  }, [navigation]);

  const loadDrafts = async () => {
    try {
      const allDrafts = await draftService.getAllDrafts();
      setDrafts(allDrafts);
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  useEffect(() => {
    filterConversations();
  }, [conversations, searchQuery, activeFilter, advancedFilters]);

  useEffect(() => {
    // Refetch from server when filter changes to stay in sync with status on backend
    loadConversations();
  }, [activeFilter]);

  useEffect(() => {
    console.log('📡 Inbox: Subscribing to real-time message updates');

    const unsubscribe = onNewMessage((data) => {
      console.log('🆕 Inbox: New message received via socket:', data);
      console.log('   Conversation ID:', data.conversationId);
      console.log('   Message:', data.text?.substring(0, 50));

      // Update the conversation in the list instead of reloading everything
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c._id === data.conversationId);
        
        if (existingIndex >= 0) {
          // Update existing conversation
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: {
              text: data.text,
              timestamp: data.timestamp,
              type: 'text',
              direction: 'incoming',
              status: 'delivered',
            },
            unreadCount: (updated[existingIndex].unreadCount || 0) + 1,
          };
          
          // Move to top of list
          const [updatedConv] = updated.splice(existingIndex, 1);
          return [updatedConv, ...updated];
        } else {
          // New conversation - reload from server
          if (__DEV__) {
            console.log('🔄 New conversation detected, reloading list');
          }
          loadConversations();
          return prev;
        }
      });
      
      loadUnreadCount();
    });

    const unsubscribeStatus = onConversationStatusChanged?.((data) => {
      console.log('🔄 Inbox: Conversation status changed:', data);
      
      // Update status in the list
      setConversations(prev => prev.map(conv => 
        conv._id === data.conversationId 
          ? { ...conv, status: data.status as any }
          : conv
      ));
    });

    const unsubscribeNewConv = onConversationNew?.((data) => {
      console.log('🆕 Inbox: New conversation event');
      loadConversations();
      loadUnreadCount();
    });

    return () => {
      if (__DEV__) {
        console.log('🔌 Inbox: Unsubscribing from real-time messages');
      }
      unsubscribe();
      unsubscribeStatus && unsubscribeStatus();
      unsubscribeNewConv && unsubscribeNewConv();
    };
  }, [onNewMessage, onConversationStatusChanged, onConversationNew]);

  const loadConversations = async () => {
    try {
      const statusParam = activeFilter === 'all' ? 'all' : activeFilter;
      const response = await conversationAPI.getConversations(statusParam as any);
      const conversationArray = Array.isArray(response) ? response : (response as any).conversations || [];

      const mappedConversations = conversationArray.map((conv: any) => ({
        ...conv,
        _id: String(conv._id),
        status: conv.status || 'active',
        unreadCount: conv.unreadCount || 0,
      }));

      setConversations(mappedConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await conversationAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const filterConversations = () => {
    let filtered = [...conversations];

    // Basic filter (backward compatibility)
    if (activeFilter !== 'all') {
      filtered = filtered.filter(conv => conv.status === activeFilter);
    }

    // Advanced status filter (overrides basic filter if set)
    if (advancedFilters.statuses.length > 0) {
      filtered = filtered.filter(conv =>
        advancedFilters.statuses.includes(conv.status),
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        conv =>
          (conv.contact?.name || '').toLowerCase().includes(query) ||
          (conv.contact?.phoneNumber || '').includes(query) ||
          (conv.lastMessage?.text || '').toLowerCase().includes(query),
      );
    }

    // Unread only filter
    if (advancedFilters.unreadOnly) {
      filtered = filtered.filter(conv => (conv.unreadCount || 0) > 0);
    }

    // Tags filter
    if (advancedFilters.tags.length > 0) {
      filtered = filtered.filter(conv =>
        conv.tags?.some(tag => advancedFilters.tags.includes(tag)),
      );
    }

    // Has tag filter
    if (advancedFilters.hasTag) {
      filtered = filtered.filter(conv => conv.tags && conv.tags.length > 0);
    }

    // Assigned agents filter
    if (advancedFilters.assignedAgents.length > 0) {
      filtered = filtered.filter(conv =>
        advancedFilters.assignedAgents.includes(conv.assignedTo || ''),
      );
    }

    // Is assigned filter
    if (advancedFilters.isAssigned) {
      filtered = filtered.filter(conv => !!conv.assignedTo);
    }

    setFilteredConversations(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
    loadUnreadCount();
  };

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate('Conversation', {conversationId: conversation._id});
  };

  const handleFilterPress = (filter: FilterType) => {
    setActiveFilter(filter);
  };



  const renderEmpty = () => (
    <EmptyState
      icon="💬"
      title="No conversations found"
      description={
        searchQuery || activeFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Conversations will appear here when patients contact you'
      }
    />
  );

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <ConnectionStatus socketState={socketState} />
      
      {/* Header */}
      <AppHeader
        title="Inbox"
        onBack={() => navigation.goBack()}
        variant="primary"
        rightActions={[
          ...(unreadCount > 0
            ? [
                {
                  icon: 'message-circle',
                  onPress: () => {},
                  badge: unreadCount,
                },
              ]
            : []),
          {
            icon: 'search',
            onPress: () => navigation.navigate('Search'),
          },
          {
            icon: 'filter',
            onPress: () => setShowFilterModal(true),
            badge:
              advancedFilters.statuses.length > 0 ||
              advancedFilters.tags.length > 0 ||
              advancedFilters.assignedAgents.length > 0 ||
              advancedFilters.unreadOnly ||
              advancedFilters.hasTag ||
              advancedFilters.isAssigned
                ? '!'
                : undefined,
          },
          {
            icon: 'refresh-cw',
            onPress: handleRefresh,
          },
        ]}
      />

      {}
      <Animated.View 
        style={[
          styles.searchWrapper,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color={theme.colors.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or phone..."
            placeholderTextColor={theme.colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <Animated.View 
        style={[
          styles.statsBarWrapper,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        <LinearGradient
          colors={[theme.colors.successLight + '30', theme.colors.infoLight + '30']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.statsBar}>
          <View style={styles.statsIconContainer}>
            <Icon name="message-text" size={18} color={theme.colors.primary} />
          </View>
          <Text style={styles.statsText}>
            {filteredConversations.length} {filteredConversations.length === 1 ? 'conversation' : 'conversations'}
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* Filters */}
      <Animated.View 
        style={[
          styles.filtersContainer,
          {
            opacity: fadeAnim,
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterPress('all')}
          activeOpacity={0.7}>
          <Icon 
            name="apps" 
            size={16} 
            color={activeFilter === 'all' ? theme.colors.textInverse : theme.colors.textSecondary}
            style={styles.filterIcon}
          />
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'all' && styles.filterButtonTextActive,
            ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'active' && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterPress('active')}
          activeOpacity={0.7}>
          <Icon 
            name="chat" 
            size={16} 
            color={activeFilter === 'active' ? theme.colors.textInverse : theme.colors.textSecondary}
            style={styles.filterIcon}
          />
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'active' && styles.filterButtonTextActive,
            ]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'closed' && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterPress('closed')}
          activeOpacity={0.7}>
          <Icon 
            name="check-circle" 
            size={16} 
            color={activeFilter === 'closed' ? theme.colors.textInverse : theme.colors.textSecondary}
            style={styles.filterIcon}
          />
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'closed' && styles.filterButtonTextActive,
            ]}>
            Closed
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Conversation List */}
      {loading && !refreshing ? (
        <View style={styles.listContainer}>
          <SkeletonList count={6} />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={item => String(item._id)}
          renderItem={({item}) => {
            const draft = drafts.find(d => d.conversationId === item._id);
            return (
              <ConversationCard
                conversation={item}
                onPress={() => handleConversationPress(item)}
                hasDraft={!!draft}
                draftText={draft?.text}
              />
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            filteredConversations.length === 0 && styles.emptyList
          }
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={(filters) => setAdvancedFilters(filters)}
        availableTags={
          Array.from(
            new Set(
              conversations
                .filter(c => c.tags && c.tags.length > 0)
                .flatMap(c => c.tags || [])
            )
          )
        }
        availableAgents={
          Array.from(
            new Set(
              conversations
                .filter(c => c.assignedTo)
                .map(c => ({
                  id: c.assignedTo!,
                  name: c.assignedToName || c.assignedTo!,
                }))
            )
          ).reduce((unique: Array<{id: string; name: string}>, agent) => {
            if (!unique.find(a => a.id === agent.id)) {
              unique.push(agent);
            }
            return unique;
          }, [])
        }
        currentFilters={advancedFilters}
      />
    </View>
  );
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
  searchWrapper: {
    marginHorizontal: theme.spacing.base,
    marginTop: theme.spacing.base,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  statsBarWrapper: {
    marginHorizontal: theme.spacing.base,
    marginVertical: theme.spacing.sm,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  statsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  statsText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '700',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    minHeight: 44,
    ...theme.shadows.sm,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  filterIcon: {
    marginRight: theme.spacing.xs,
  },
  filterButtonText: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.text,
  },
  filterButtonTextActive: {
    color: theme.colors.textInverse,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.base,
  },
  emptyList: {
    flexGrow: 1,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default InboxScreen;
