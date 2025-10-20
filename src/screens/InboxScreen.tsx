import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import type {Conversation} from '../types/conversation';
import {conversationAPI} from '../services/conversationService';
import ConversationCard from '../components/conversations/ConversationCard';
import SearchBar from '../components/campaigns/SearchBar';

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
      const data = await conversationAPI.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
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
    let filtered = conversations;

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(conv => conv.status === activeFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        conv =>
          conv.patientName.toLowerCase().includes(query) ||
          conv.patientPhone.includes(query),
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

  const handleFilterPress = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const renderFilter = (filter: FilterType, label: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => handleFilterPress(filter)}>
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
        Conversations will appear here when patients contact you
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or phone..."
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderFilter('all', 'All')}
        {renderFilter('open', 'Open')}
        {renderFilter('assigned', 'Assigned')}
        {renderFilter('closed', 'Closed')}
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
            colors={['#25D366']}
          />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          filteredConversations.length === 0 && styles.emptyList
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default InboxScreen;
