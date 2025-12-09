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
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../theme';
import api from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactChangeAlerts'>;

interface ContactChange {
  id: string;
  phoneNumber: string;
  eventType: string;
  eventLabel: string;
  changeDescription: string;
  timestamp: string;
  timeAgo: string;
  source: string;
}

interface ChangeSummary {
  _id: string;
  count: number;
  latestChange: string;
}

interface Stats {
  total: number;
  byType: ChangeSummary[];
  unprocessedCount: number;
  uniqueContactsCount: number;
  period: string;
}

const ContactChangeAlertsScreen: React.FC<Props> = ({ navigation }) => {
  const [changes, setChanges] = useState<ContactChange[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<24 | 72 | 168>(24); // hours
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');

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

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [changesResponse, statsResponse] = await Promise.all([
        api.get('/contacts/recent-changes', {
          params: { hours: selectedPeriod, limit: 100 }
        }),
        api.get('/contacts/stats', {
          params: { days: Math.ceil(selectedPeriod / 24) }
        })
      ]);

      setChanges(changesResponse.data.changes || []);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Load contact changes error:', error);
      Alert.alert('Error', 'Failed to load contact changes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [selectedPeriod]);

  const getEventIcon = (eventType: string): string => {
    const icons: Record<string, string> = {
      'profile_update': 'account-circle',
      'name_change': 'pencil',
      'photo_update': 'camera',
      'status_update': 'message-text',
      'about_change': 'information',
      'number_change': 'phone-rotate-landscape',
      'contact_added': 'account-plus',
      'contact_blocked': 'block-helper',
      'contact_unblocked': 'check-circle'
    };
    return icons[eventType] || 'account';
  };

  const getEventColor = (eventType: string): string => {
    const colors: Record<string, string> = {
      'profile_update': theme.colors.info,
      'name_change': theme.colors.primary,
      'photo_update': theme.colors.secondary,
      'status_update': theme.colors.info,
      'about_change': theme.colors.textSecondary,
      'number_change': theme.colors.warning,
      'contact_added': theme.colors.success,
      'contact_blocked': theme.colors.error,
      'contact_unblocked': theme.colors.success
    };
    return colors[eventType] || theme.colors.textSecondary;
  };

  const renderChange = ({ item }: { item: ContactChange }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.changeCard}
        onPress={() => {
          // Navigate to contact history for this specific contact
          navigation.navigate('ContactHistory', { phoneNumber: item.phoneNumber });
        }}
      >
        <View style={styles.changeHeader}>
        <View
          style={[
            styles.eventIconContainer,
            { backgroundColor: getEventColor(item.eventType) + '20' }
          ]}
        >
          <Icon
            name={getEventIcon(item.eventType)}
            size={24}
            color={getEventColor(item.eventType)}
          />
        </View>

        <View style={styles.changeInfo}>
          <Text style={styles.eventLabel}>{item.eventLabel}</Text>
          <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
          <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
        </View>
      </View>

      {item.changeDescription && (
        <Text style={styles.changeDescription}>{item.changeDescription}</Text>
      )}

      <View style={styles.changeMeta}>
        <View style={styles.metaItem}>
          <Icon name="source-commit" size={14} color={theme.colors.textTertiary} />
          <Text style={styles.metaText}>{item.source}</Text>
        </View>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="account-search" size={80} color={theme.colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Contact Changes</Text>
      <Text style={styles.emptyText}>
        Contact profile changes will appear here when your contacts update their WhatsApp
        profiles.
      </Text>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {[
        { label: '24h', value: 24 as 24 | 72 | 168 },
        { label: '3 days', value: 72 as 24 | 72 | 168 },
        { label: '7 days', value: 168 as 24 | 72 | 168 }
      ].map((period) => (
        <TouchableOpacity
          key={period.value}
          style={[
            styles.periodButton,
            selectedPeriod === period.value && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period.value)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period.value && styles.periodButtonTextActive
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStats = () => {
    if (!stats) return null;

    return (
      <Animated.View
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Changes</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.uniqueContactsCount}</Text>
            <Text style={styles.statLabel}>Unique Contacts</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>
              {stats.unprocessedCount}
            </Text>
            <Text style={styles.statLabel}>Unprocessed</Text>
          </View>
        </View>

        {stats.byType && stats.byType.length > 0 && (
          <View style={styles.typeBreakdown}>
            <Text style={styles.typeBreakdownTitle}>Changes by Type</Text>
            {stats.byType.slice(0, 5).map((type) => (
              <View key={type._id} style={styles.typeRow}>
                <View style={styles.typeInfo}>
                  <Icon
                    name={getEventIcon(type._id)}
                    size={18}
                    color={getEventColor(type._id)}
                  />
                  <Text style={styles.typeName}>{formatEventType(type._id)}</Text>
                </View>
                <Text style={styles.typeCount}>{type.count}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    );
  };

  const formatEventType = (eventType: string): string => {
    return eventType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading contact changes...</Text>
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
        <Text style={styles.headerTitle}>Contact Changes</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      {/* Period Selector */}
      {renderPeriodSelector()}

      {/* Stats */}
      {renderStats()}

      {/* Changes List */}
      <FlatList
        data={changes}
        renderItem={renderChange}
        keyExtractor={(item) => item.id}
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
    padding: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primaryDark,
    ...theme.shadows.md
  },
  backButton: {
    padding: theme.spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textInverse
  },
  headerRight: {
    width: 32
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center'
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary
  },
  periodButtonTextActive: {
    color: '#fff'
  },
  statsContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginHorizontal: theme.spacing.xs,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  typeBreakdown: {
    marginTop: 8
  },
  typeBreakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    marginBottom: 6
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  typeName: {
    marginLeft: 10,
    fontSize: 13,
    color: theme.colors.text
  },
  typeCount: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  changeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md
  },
  changeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  changeInfo: {
    flex: 1,
    marginLeft: 12
  },
  eventLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2
  },
  phoneNumber: {
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timeAgo: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginRight: 4
  },
  changeDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18
  },
  changeMeta: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  metaText: {
    marginLeft: 4,
    fontSize: 11,
    color: theme.colors.textTertiary,
    textTransform: 'capitalize'
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

export default ContactChangeAlertsScreen;
