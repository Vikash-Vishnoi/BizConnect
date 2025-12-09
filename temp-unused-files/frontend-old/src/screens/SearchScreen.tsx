import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import api from '../services/api';
import theme from '../theme';
import {EnhancedCard, SkeletonList, EmptyState} from '../components/common';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SearchResult {
  messageId: string;
  conversationId: string;
  contact: {
    name: string;
    phoneNumber: string;
  };
  message: {
    text: string;
    timestamp: string;
    direction: 'incoming' | 'outgoing';
  };
}

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Animation setup
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const response = await api.get('/search/messages', {
        params: {
          q: searchQuery.trim(),
          limit: 50,
        },
      });

      setResults(response.data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderResult = ({item}: {item: SearchResult}) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{translateY: slideAnim}],
      }}>
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => {
          navigation.navigate('Conversation', {
            conversationId: item.conversationId,
          });
        }}>
      <View style={styles.resultHeader}>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>
            {item.contact.name || item.contact.phoneNumber}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.message.timestamp)}
          </Text>
        </View>
        <View
          style={[
            styles.directionBadge,
            item.message.direction === 'incoming'
              ? styles.incomingBadge
              : styles.outgoingBadge,
          ]}>
          <Icon
            name={item.message.direction === 'incoming' ? 'arrow-down-left' : 'arrow-up-right'}
            size={12}
            color={theme.colors.textInverse}
          />
        </View>
      </View>
      <Text style={styles.messageText} numberOfLines={3}>
        {item.message.text}
      </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Messages</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* Search Bar */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        <Icon name="magnify" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search in conversations..."
          placeholderTextColor={theme.colors.textSecondary}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setResults([]);
              setSearched(false);
            }}>
            <Icon name="x" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Results */}
      {loading ? (
        <View style={{padding: theme.spacing.md}}>
          <SkeletonList count={6} />
        </View>
      ) : !searched ? (
        <EmptyState
          icon="search"
          title="Search Your Messages"
          description="Find messages across all your conversations"
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No Results Found"
          description="Try different keywords or check spelling"
        />
      ) : (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsCount}>
            {results.length} {results.length === 1 ? 'result' : 'results'} for "{searchQuery}"
          </Text>
          <FlatList
            data={results}
            keyExtractor={item => item.messageId}
            renderItem={renderResult}
            contentContainerStyle={styles.resultsList}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: theme.colors.textInverse,
  },
  headerTitle: {
    flex: 1,
    ...theme.typography.h2,
    color: theme.colors.textInverse,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsCount: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultsList: {
    padding: theme.spacing.xs,
  },
  resultItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    marginHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  contactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  contactName: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  timestamp: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  directionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingBadge: {
    backgroundColor: theme.colors.success,
  },
  outgoingBadge: {
    backgroundColor: theme.colors.primary,
  },
  messageText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});

export default SearchScreen;
