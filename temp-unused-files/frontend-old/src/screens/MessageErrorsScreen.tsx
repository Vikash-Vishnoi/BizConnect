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

type Props = NativeStackScreenProps<RootStackParamList, 'MessageErrors'>;

interface MessageError {
  id: string;
  messageId: string;
  recipientPhone: string;
  errorCategory: string;
  errorLabel: string;
  errorTitle: string;
  errorMessage: string;
  errorCode?: number;
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
  status: string;
  timestamp: string;
  timeAgo: string;
}

interface ErrorStats {
  total: number;
  byCategory: Array<{ _id: string; count: number }>;
  byStatus: Array<{ _id: string; count: number }>;
  topRecipients: Array<{ _id: string; count: number }>;
  dailyBreakdown: Array<{ _id: string; count: number }>;
}

const MessageErrorsScreen: React.FC<Props> = ({ navigation }) => {
  const [errors, setErrors] = useState<MessageError[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');

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
  }, [selectedFilter, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);

      const params: any = { limit: 100 };
      if (selectedFilter !== 'all') {
        params.category = selectedFilter;
      }
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const [errorsResponse, statsResponse] = await Promise.all([
        api.get('/message-errors', { params }),
        api.get('/message-errors/stats', { params: { days: 7 } })
      ]);

      setErrors(errorsResponse.data.errors || []);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Load message errors error:', error);
      Alert.alert('Error', 'Failed to load message errors');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [selectedFilter, selectedStatus]);

  const handleRetry = async (errorId: string) => {
    try {
      await api.post(`/message-errors/${errorId}/retry`);
      Alert.alert('Success', 'Message retry initiated');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to retry message');
    }
  };

  const handleResolve = async (errorId: string) => {
    Alert.prompt(
      'Resolve Error',
      'Add notes about the resolution:',
      async (notes) => {
        try {
          await api.post(`/message-errors/${errorId}/resolve`, {
            notes,
            action: 'manually_resolved'
          });
          Alert.alert('Success', 'Error marked as resolved');
          loadData();
        } catch (error) {
          Alert.alert('Error', 'Failed to resolve error');
        }
      }
    );
  };

  const handleIgnore = async (errorId: string) => {
    Alert.alert(
      'Ignore Error',
      'Are you sure you want to ignore this error?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ignore',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/message-errors/${errorId}/ignore`);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to ignore error');
            }
          }
        }
      ]
    );
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      'INVALID_NUMBER': 'phone-off',
      'RATE_LIMIT': 'timer-sand',
      'BLOCKED': 'cancel',
      'SPAM': 'alert-octagon',
      'POLICY_VIOLATION': 'shield-alert',
      'MEDIA_ERROR': 'image-broken',
      'TEMPLATE_ERROR': 'file-document-alert',
      'NETWORK_ERROR': 'wifi-off',
      'AUTHENTICATION_ERROR': 'lock-alert',
      'BUSINESS_PROFILE_ERROR': 'account-alert',
      'PARAMETER_ERROR': 'cog-off',
      'GENERIC_ERROR': 'alert-circle',
      'UNKNOWN': 'help-circle'
    };
    return icons[category] || 'alert';
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'INVALID_NUMBER': theme.colors.warning,
      'RATE_LIMIT': theme.colors.info,
      'BLOCKED': theme.colors.error,
      'SPAM': theme.colors.error,
      'POLICY_VIOLATION': theme.colors.error,
      'MEDIA_ERROR': theme.colors.warning,
      'TEMPLATE_ERROR': theme.colors.warning,
      'NETWORK_ERROR': theme.colors.textSecondary,
      'AUTHENTICATION_ERROR': theme.colors.error,
      'BUSINESS_PROFILE_ERROR': theme.colors.warning,
      'PARAMETER_ERROR': theme.colors.warning,
      'GENERIC_ERROR': theme.colors.textSecondary,
      'UNKNOWN': theme.colors.textSecondary
    };
    return colors[category] || theme.colors.textSecondary;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'PENDING': theme.colors.warning,
      'RETRYING': theme.colors.info,
      'RESOLVED': theme.colors.success,
      'FAILED': theme.colors.error,
      'IGNORED': theme.colors.textSecondary
    };
    return colors[status] || theme.colors.textSecondary;
  };

  const renderError = ({ item }: { item: MessageError }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{translateY: slideAnim}],
      }}
    >
      <View style={styles.errorCard}>
      <View style={styles.errorHeader}>
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: getCategoryColor(item.errorCategory) + '20' }
          ]}
        >
          <Icon
            name={getCategoryIcon(item.errorCategory)}
            size={24}
            color={getCategoryColor(item.errorCategory)}
          />
        </View>

        <View style={styles.errorInfo}>
          <Text style={styles.errorLabel}>{item.errorLabel}</Text>
          <Text style={styles.recipientPhone}>{item.recipientPhone}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.errorTitle}>{item.errorTitle}</Text>
      <Text style={styles.errorMessage} numberOfLines={2}>
        {item.errorMessage}
      </Text>

      {item.errorCode && (
        <Text style={styles.errorCode}>Error Code: {item.errorCode}</Text>
      )}

      <View style={styles.errorMeta}>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
        {item.canRetry && (
          <View style={styles.retryInfo}>
            <Icon name="refresh" size={14} color={theme.colors.info} />
            <Text style={styles.retryText}>
              {item.retryCount}/{item.maxRetries} retries
            </Text>
          </View>
        )}
      </View>

      <View style={styles.errorActions}>
        {item.canRetry && item.status !== 'RESOLVED' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.retryButton]}
            onPress={() => handleRetry(item.id)}
          >
            <Icon name="refresh" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
        )}

        {item.status === 'PENDING' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.resolveButton]}
              onPress={() => handleResolve(item.id)}
            >
              <Icon name="check" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Resolve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.ignoreButton]}
              onPress={() => handleIgnore(item.id)}
            >
              <Icon name="close" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>
                Ignore
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
    </Animated.View>
  );

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
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Errors</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.error }]}>
              {stats.byStatus.find(s => s._id === 'PENDING')?.count || 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {stats.byStatus.find(s => s._id === 'RESOLVED')?.count || 0}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderFilterButtons = () => (
    <Animated.View
      style={[
        styles.filterContainer,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}
    >
      <Text style={styles.filterLabel}>Status:</Text>
      <View style={styles.filterButtons}>
        {['all', 'PENDING', 'RETRYING', 'RESOLVED', 'FAILED'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              selectedStatus === status && styles.filterButtonActive
            ]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedStatus === status && styles.filterButtonTextActive
              ]}
            >
              {status === 'all' ? 'All' : status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="check-circle" size={80} color={theme.colors.success} />
      <Text style={styles.emptyTitle}>No Errors</Text>
      <Text style={styles.emptyText}>
        {selectedStatus === 'PENDING'
          ? 'No pending errors! All messages are being delivered successfully.'
          : 'No errors found with the selected filters.'}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading errors...</Text>
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
        <Text style={styles.headerTitle}>Message Errors</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      {renderFilterButtons()}

      {/* Errors List */}
      <FlatList
        data={errors}
        renderItem={renderError}
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
  headerRight: {
    width: 32
  },
  statsContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  filterContainer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border
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
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  errorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorInfo: {
    flex: 1,
    marginLeft: 12
  },
  errorLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2
  },
  recipientPhone: {
    fontSize: 13,
    color: theme.colors.textSecondary
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
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  errorMessage: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18
  },
  errorCode: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontFamily: 'monospace',
    marginBottom: 8
  },
  errorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  timeAgo: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  retryInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  retryText: {
    marginLeft: 4,
    fontSize: 12,
    color: theme.colors.info
  },
  errorActions: {
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
  retryButton: {
    backgroundColor: theme.colors.info
  },
  resolveButton: {
    backgroundColor: theme.colors.success
  },
  ignoreButton: {
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

export default MessageErrorsScreen;
