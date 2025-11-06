import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import type {Conversation} from '../types/conversation';
import {conversationAPI} from '../services/conversationService';
import {draftService, type Draft} from '../services/draftService';
import ConversationCard from '../components/conversations/ConversationCard';
import FilterModal, { type ConversationFilters } from '../components/common/FilterModal';
import ConnectionStatus from '../components/ConnectionStatus';
import {useSocket} from '../contexts/SocketProvider';
import theme from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Inbox'>;

type FilterType = 'all' | 'active' | 'archived' | 'blocked' | 'closed';

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

  // Debug: Log socket state on mount and when it changes
  useEffect(() => {
    console.log('🔍 Inbox: Socket state updated:', {
      isConnected: socketState.isConnected,
      isConnecting: socketState.isConnecting,
      error: socketState.error,
      lastConnected: socketState.lastConnected,
    });
  }, [socketState]);

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
          console.log('🔄 New conversation detected, reloading list');
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
      console.log('🔌 Inbox: Unsubscribing from real-time messages');
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

  const renderFilter = (filter: FilterType, label: string, emoji: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => handleFilterPress(filter)}>
        <Text style={styles.filterEmoji}>{emoji}</Text>
        <Text
          style={[styles.filterText, isActive && styles.filterTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyText}>No conversations found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery || activeFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Conversations will appear here when patients contact you'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <ConnectionStatus socketState={socketState} />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              accessibilityLabel="Go Back">
              <Icon name="arrow-left" size={20} color={theme.colors.textInverse} />
            </TouchableOpacity>
            <Text style={styles.headerIcon}>💬</Text>
            <Text style={styles.title}>Inbox</Text>
          </View>
          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => navigation.navigate('Search')}
              activeOpacity={0.7}
              accessibilityLabel="Search Messages">
              <Icon name="search" size={20} color={theme.colors.textInverse} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterIconButton}
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.7}
              accessibilityLabel="Filter Conversations">
              <Icon name="filter" size={20} color={theme.colors.textInverse} />
              {(advancedFilters.statuses.length > 0 ||
                advancedFilters.tags.length > 0 ||
                advancedFilters.assignedAgents.length > 0 ||
                advancedFilters.unreadOnly ||
                advancedFilters.hasTag ||
                advancedFilters.isAssigned) && (
                <View style={styles.filterActiveBadge}>
                  <Text style={styles.filterActiveBadgeText}>!</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
              accessibilityLabel="Refresh">
              <Icon name="refresh-cw" size={20} color={theme.colors.textInverse} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or phone..."
          placeholderTextColor={theme.colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearIcon}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {}
      <View style={styles.statsBar}>
        <Text style={styles.statsIcon}>👥</Text>
        <Text style={styles.statsText}>
          {filteredConversations.length} {filteredConversations.length === 1 ? 'conversation' : 'conversations'}
        </Text>
      </View>

      {}
      <View style={styles.filtersContainer}>
        {renderFilter('all', 'All', '📋')}
        {renderFilter('active', 'Active', '📂')}
        {renderFilter('archived', 'Archived', '📦')}
        {renderFilter('blocked', 'Blocked', '🚫')}
        {renderFilter('closed', 'Closed', '✅')}
      </View>

      {}
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
  header: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textInverse,
  },
  unreadBadge: {
    backgroundColor: theme.colors.textInverse,
    borderRadius: theme.borderRadius.full,
    minWidth: 28,
    height: 28,
    paddingHorizontal: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: theme.colors.primary,
    ...theme.typography.caption,
    fontWeight: 'bold',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  filterIconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
    position: 'relative',
  },
  filterActiveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterActiveBadgeText: {
    color: theme.colors.textInverse,
    fontSize: 10,
    fontWeight: 'bold',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    ...theme.shadows.sm,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
    fontSize: 18,
  },
  clearIcon: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  headerIcon: {
    fontSize: 28,
    marginRight: theme.spacing.sm,
  },
  statsIcon: {
    fontSize: 16,
  },
  filterEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  emptyIcon: {
    fontSize: 64,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    ...theme.shadows.sm,
  },
  statsText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
    fontWeight: '600',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: theme.colors.textInverse,
  },
  emptyList: {
    flexGrow: 1,
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
  iconText: {
    fontSize: 20,
    color: theme.colors.textInverse,
  },
});

export default InboxScreen;
