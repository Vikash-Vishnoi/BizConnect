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
import ConversationCard from '../components/conversations/ConversationCard';
import theme from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Inbox'>;

type FilterType = 'all' | 'open' | 'assigned' | 'closed';

const InboxScreen: React.FC<Props> = ({navigation}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    Conversation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadConversations();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    filterConversations();
  }, [conversations, searchQuery, activeFilter]);

  const loadConversations = async () => {
    try {
      const response = await conversationAPI.getConversations();
      // Backend might return {conversations: [...]} or just [...]
      const conversationArray = Array.isArray(response) ? response : (response as any).conversations || [];
      
      // Map backend format to frontend format
      const mappedConversations = conversationArray.map((conv: any) => ({
        _id: conv._id,
        patientName: conv.name || conv.phoneNumber,
        patientPhone: conv.phoneNumber,
        lastMessage: conv.lastMessage || '',
        lastActivity: conv.lastMessageAt || conv.updatedAt || new Date().toISOString(),
        status: conv.status === 'active' ? 'open' : conv.status === 'archived' ? 'closed' : 'open',
        unreadCount: conv.unreadCount || 0,
        assignedTo: conv.assignedTo,
        assignedToName: conv.assignedToName,
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

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(conv => conv.status === activeFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        conv =>
          (conv.patientName || '').toLowerCase().includes(query) ||
          (conv.patientPhone || '').includes(query),
      );
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

  const handleNewConversation = () => {
    // Navigate to a screen where user can start a new conversation
    // For now, we'll navigate to Conversation screen with a special flag
    navigation.navigate('Conversation', {conversationId: 'new'});
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
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityLabel="Back">
            <Text style={styles.iconText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerLeft}>
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
              style={styles.newConversationButton}
              onPress={handleNewConversation}
              activeOpacity={0.7}
              accessibilityLabel="New Conversation">
              <Text style={styles.newConversationIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
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

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsIcon}>👥</Text>
        <Text style={styles.statsText}>
          {filteredConversations.length} {filteredConversations.length === 1 ? 'conversation' : 'conversations'}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderFilter('all', 'All', '📋')}
        {renderFilter('open', 'Open', '📂')}
        {renderFilter('assigned', 'Assigned', '✓')}
        {renderFilter('closed', 'Closed', '✅')}
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={item => item._id}
        renderItem={({item}) => (
          <ConversationCard
            conversation={item}
            onPress={() => handleConversationPress(item)}
          />
        )}
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewConversation}
        activeOpacity={0.8}
        accessibilityLabel="New Conversation">
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.fabGradient}>
          <Text style={styles.fabIcon}>✏️</Text>
        </LinearGradient>
      </TouchableOpacity>
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
  newConversationButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newConversationIcon: {
    fontSize: 20,
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
  fab: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.lg,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 24,
  },
});

export default InboxScreen;
