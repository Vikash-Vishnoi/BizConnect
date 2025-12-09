import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../theme';
import api from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'OptInManager'>;

interface ConsentSummary {
  phoneNumber: string;
  optedOut: boolean;
  verified: boolean;
  channels: {
    marketing: boolean;
    service: boolean;
    transactional: boolean;
    promotional: boolean;
  };
  preferences: {
    frequency: string;
    quietHours?: {
      enabled: boolean;
      start?: string;
      end?: string;
    };
    preferredLanguage: string;
  };
  flags: {
    spam: boolean;
    blocked: boolean;
    invalid: boolean;
    doNotContact: boolean;
  };
  messageStats: {
    sent: number;
    delivered: number;
    lastMessageAt?: string;
  };
  consentedAt?: string;
  optedOutAt?: string;
}

interface Stats {
  total: number;
  optedOut: number;
  optedIn: number;
  optOutRate: string;
  recentOptOuts: number;
  channels: {
    marketing: number;
    service: number;
    promotional: number;
    transactional: number;
  };
  byReason: Array<{ reason: string; count: number }>;
}

const OptInManagerScreen: React.FC<Props> = ({ navigation }) => {
  const [consents, setConsents] = useState<ConsentSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'opted-in' | 'opted-out'>('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadData();
    
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
  }, [filterType]);

  const loadData = async () => {
    try {
      setLoading(true);

      const params: any = { limit: 100 };
      if (filterType === 'opted-in') {
        params.optedOut = false;
      } else if (filterType === 'opted-out') {
        params.optedOut = true;
      }

      const [consentsResponse, statsResponse] = await Promise.all([
        api.get('/opt-in', { params }),
        api.get('/opt-in/stats')
      ]);

      setConsents(consentsResponse.data.consents || []);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Load opt-in data error:', error);
      Alert.alert('Error', 'Failed to load consent data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [filterType]);

  const handleOptOut = async (phoneNumber: string) => {
    Alert.alert(
      'Opt Out Contact',
      `Are you sure you want to opt out ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Opt Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/opt-in/${phoneNumber}/opt-out`, {
                reason: 'user_request',
                source: 'app'
              });
              Alert.alert('Success', 'Contact opted out successfully');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to opt out contact');
            }
          }
        }
      ]
    );
  };

  const handleOptIn = async (phoneNumber: string) => {
    Alert.alert(
      'Opt In Contact',
      `Opt ${phoneNumber} back in for marketing messages?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Opt In',
          onPress: async () => {
            try {
              await api.post(`/opt-in/${phoneNumber}/opt-in`, {
                channels: ['marketing'],
                source: 'app'
              });
              Alert.alert('Success', 'Contact opted in successfully');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to opt in contact');
            }
          }
        }
      ]
    );
  };

  const handleToggleChannel = async (phoneNumber: string, channel: string, currentValue: boolean) => {
    try {
      if (currentValue) {
        await api.post(`/opt-in/${phoneNumber}/revoke`, {
          channel,
          reason: 'user_request',
          source: 'app'
        });
      } else {
        await api.post(`/opt-in/${phoneNumber}/grant`, {
          channel,
          source: 'app'
        });
      }
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update channel consent');
    }
  };

  const getFilteredConsents = () => {
    let filtered = consents;
    
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.phoneNumber.includes(searchQuery)
      );
    }
    
    return filtered;
  };

  const renderStats = () => {
    if (!stats) return null;

    return (
      <Animated.View
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}
      >
        <Text style={styles.statsTitle}>Consent Overview</Text>
        
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {stats.optedIn}
            </Text>
            <Text style={styles.statLabel}>Opted In</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.error }]}>
              {stats.optedOut}
            </Text>
            <Text style={styles.statLabel}>Opted Out</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>
              {stats.optOutRate}%
            </Text>
            <Text style={styles.statLabel}>Opt-out Rate</Text>
          </View>
        </View>

        <View style={styles.channelStats}>
          <Text style={styles.channelStatsTitle}>Channel Consents</Text>
          <View style={styles.channelGrid}>
            <View style={styles.channelItem}>
              <Icon name="bullhorn" size={18} color={theme.colors.primary} />
              <Text style={styles.channelValue}>{stats.channels.marketing}</Text>
              <Text style={styles.channelLabel}>Marketing</Text>
            </View>

            <View style={styles.channelItem}>
              <Icon name="tag" size={18} color={theme.colors.secondary} />
              <Text style={styles.channelValue}>{stats.channels.promotional}</Text>
              <Text style={styles.channelLabel}>Promotional</Text>
            </View>

            <View style={styles.channelItem}>
              <Icon name="cog" size={18} color={theme.colors.info} />
              <Text style={styles.channelValue}>{stats.channels.service}</Text>
              <Text style={styles.channelLabel}>Service</Text>
            </View>

            <View style={styles.channelItem}>
              <Icon name="receipt" size={18} color={theme.colors.success} />
              <Text style={styles.channelValue}>{stats.channels.transactional}</Text>
              <Text style={styles.channelLabel}>Transaction</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderFilters = () => (
    <Animated.View
      style={[
        styles.filterContainer,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}
    >
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search phone number..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.textTertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterButtons}>
        {[
          { key: 'all' as const, label: 'All', icon: 'format-list-bulleted' },
          { key: 'opted-in' as const, label: 'Opted In', icon: 'check-circle' },
          { key: 'opted-out' as const, label: 'Opted Out', icon: 'cancel' }
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              filterType === filter.key && styles.filterButtonActive
            ]}
            onPress={() => setFilterType(filter.key)}
          >
            <Icon
              name={filter.icon}
              size={16}
              color={filterType === filter.key ? '#fff' : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterType === filter.key && styles.filterButtonTextActive
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderConsentCard = ({ item }: { item: ConsentSummary }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{translateY: slideAnim}],
      }}
    >
      <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
          {item.verified && (
            <Icon name="check-decagram" size={16} color={theme.colors.success} />
          )}
        </View>
        
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.optedOut 
                ? theme.colors.error + '20' 
                : theme.colors.success + '20'
            }
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.optedOut ? theme.colors.error : theme.colors.success }
            ]}
          >
            {item.optedOut ? 'Opted Out' : 'Opted In'}
          </Text>
        </View>
      </View>

      {/* Channels */}
      <View style={styles.channelsContainer}>
        <Text style={styles.channelsTitle}>Channels</Text>
        <View style={styles.channelsList}>
          {Object.entries(item.channels).map(([channel, consented]) => (
            <TouchableOpacity
              key={channel}
              style={styles.channelChip}
              onPress={() => handleToggleChannel(item.phoneNumber, channel, consented)}
              disabled={item.optedOut}
            >
              <Icon
                name={consented ? 'check-circle' : 'close-circle'}
                size={14}
                color={consented ? theme.colors.success : theme.colors.textTertiary}
              />
              <Text
                style={[
                  styles.channelChipText,
                  { color: consented ? theme.colors.text : theme.colors.textTertiary }
                ]}
              >
                {channel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Flags */}
      {(item.flags.spam || item.flags.blocked || item.flags.doNotContact) && (
        <View style={styles.flagsContainer}>
          {item.flags.spam && (
            <View style={[styles.flagChip, { backgroundColor: theme.colors.error + '20' }]}>
              <Icon name="alert-octagon" size={12} color={theme.colors.error} />
              <Text style={[styles.flagText, { color: theme.colors.error }]}>Spam</Text>
            </View>
          )}
          {item.flags.blocked && (
            <View style={[styles.flagChip, { backgroundColor: theme.colors.error + '20' }]}>
              <Icon name="block-helper" size={12} color={theme.colors.error} />
              <Text style={[styles.flagText, { color: theme.colors.error }]}>Blocked</Text>
            </View>
          )}
          {item.flags.doNotContact && (
            <View style={[styles.flagChip, { backgroundColor: theme.colors.error + '20' }]}>
              <Icon name="cancel" size={12} color={theme.colors.error} />
              <Text style={[styles.flagText, { color: theme.colors.error }]}>Do Not Contact</Text>
            </View>
          )}
        </View>
      )}

      {/* Stats */}
      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Icon name="send" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.statItemText}>{item.messageStats.sent} sent</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="check" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.statItemText}>{item.messageStats.delivered} delivered</Text>
        </View>
        {item.preferences.frequency && (
          <View style={styles.statItem}>
            <Icon name="clock-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statItemText}>{item.preferences.frequency}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        {item.optedOut ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.optInButton]}
            onPress={() => handleOptIn(item.phoneNumber)}
          >
            <Icon name="check-circle" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Opt In</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.optOutButton]}
            onPress={() => handleOptOut(item.phoneNumber)}
          >
            <Icon name="cancel" size={16} color={theme.colors.error} />
            <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
              Opt Out
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => {
            // Navigate to detail screen (to be implemented)
            Alert.alert('Coming Soon', 'Detailed consent history view');
          }}
        >
          <Icon name="history" size={16} color={theme.colors.primary} />
          <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
            History
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="shield-check" size={80} color={theme.colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Consent Records</Text>
      <Text style={styles.emptyText}>
        {filterType === 'opted-out'
          ? 'No contacts have opted out yet.'
          : 'Start tracking consent by sending messages to contacts.'}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading consent data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Opt-in Manager</Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Coming Soon', 'Bulk import feature')}
        >
          <Icon name="upload" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={getFilteredConsents()}
        renderItem={renderConsentCard}
        keyExtractor={(item) => item.phoneNumber}
        ListHeaderComponent={
          <>
            {renderStats()}
            {renderFilters()}
          </>
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  backButton: {
    padding: theme.spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse
  },
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  statsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  channelStats: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  channelStatsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12
  },
  channelGrid: {
    flexDirection: 'row'
  },
  channelItem: {
    flex: 1,
    alignItems: 'center'
  },
  channelValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 4,
    marginBottom: 2
  },
  channelLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary
  },
  filterContainer: {
    marginBottom: 16
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    padding: 0
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 6
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary
  },
  filterButtonTextActive: {
    color: '#fff'
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  phoneNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  channelsContainer: {
    marginBottom: 12
  },
  channelsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  channelsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    gap: 4
  },
  channelChipText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  flagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  flagText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 12
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statItemText: {
    fontSize: 11,
    color: theme.colors.textSecondary
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4
  },
  optInButton: {
    backgroundColor: theme.colors.success
  },
  optOutButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  viewButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40
  }
});

export default OptInManagerScreen;
