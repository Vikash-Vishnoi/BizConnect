import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert as RNAlert,
  StyleSheet,
  Animated,
} from 'react-native';
import api from '../services/api';
import {useSocket} from '../contexts/SocketProvider';
import theme from '../theme';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {SkeletonList, EmptyState, EnhancedButton} from '../components/common';

interface Alert {
  _id: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';
  createdAt: string;
  whatsappData?: {
    currentRating?: string;
    displayPhoneNumber?: string;
    event?: string;
  };
}

interface AlertStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unresolved: number;
  resolved: number;
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'critical'>('all');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const socketContext = useSocket();
  // Note: onNewAlert socket event will be added in future update

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      let endpoint = '/api/alerts';
      if (filter === 'unresolved') {
        endpoint = '/api/alerts/unresolved';
      } else if (filter === 'critical') {
        endpoint = '/api/alerts/critical';
      }

      const response = await api.get(endpoint);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      RNAlert.alert('Error', 'Failed to load alerts');
    }
  }, [filter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/api/alerts/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAlerts(), fetchStats()]);
      setLoading(false);
    };
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
  }, [fetchAlerts, fetchStats]);

  // TODO: Listen for new alerts via socket
  // This will be implemented when socket event handlers are added
  // useEffect(() => {
  //   const unsubscribe = onNewAlert?.((data: any) => {
  //     RNAlert.alert(
  //       data.alert.severity === 'CRITICAL' ? '🚨 Critical Alert' : '⚠️ New Alert',
  //       data.alert.title
  //     );
  //     fetchAlerts();
  //     fetchStats();
  //   });
  //   return () => unsubscribe?.();
  // }, [fetchAlerts, fetchStats]);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAlerts(), fetchStats()]);
    setRefreshing(false);
  }, [fetchAlerts, fetchStats]);

  // View alert details
  const handleViewAlert = (alert: Alert) => {
    RNAlert.alert(
      alert.title,
      `${alert.message}\n\n` +
      `Type: ${alert.alertType}\n` +
      `Severity: ${alert.severity}\n` +
      `Status: ${alert.status}\n` +
      `Created: ${new Date(alert.createdAt).toLocaleString()}` +
      (alert.whatsappData?.displayPhoneNumber ? `\nPhone: ${alert.whatsappData.displayPhoneNumber}` : '') +
      (alert.whatsappData?.currentRating ? `\nRating: ${alert.whatsappData.currentRating}` : ''),
      [
        {text: 'Close'},
        alert.status !== 'ACKNOWLEDGED' && {
          text: 'Acknowledge',
          onPress: () => handleAcknowledge(alert._id)
        },
        alert.status !== 'RESOLVED' && {
          text: 'Resolve',
          onPress: () => handleResolve(alert._id)
        }
      ].filter(Boolean) as any
    );
  };

  // Acknowledge alert
  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.put(`/api/alerts/${alertId}/acknowledge`, {
        notes: 'Acknowledged from mobile app'
      });
      RNAlert.alert('Success', 'Alert acknowledged');
      fetchAlerts();
      fetchStats();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      RNAlert.alert('Error', 'Failed to acknowledge alert');
    }
  };

  // Resolve alert
  const handleResolve = async (alertId: string) => {
    RNAlert.prompt(
      'Resolve Alert',
      'Enter resolution notes:',
      async (text) => {
        if (!text) {
          RNAlert.alert('Error', 'Resolution notes are required');
          return;
        }
        
        try {
          await api.put(`/api/alerts/${alertId}/resolve`, {
            resolutionNotes: text
          });
          RNAlert.alert('Success', 'Alert resolved');
          fetchAlerts();
          fetchStats();
        } catch (error) {
          console.error('Failed to resolve alert:', error);
          RNAlert.alert('Error', 'Failed to resolve alert');
        }
      }
    );
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#DC2626';
      case 'HIGH': return '#EA580C';
      case 'MEDIUM': return '#F59E0B';
      case 'LOW': return '#10B981';
      default: return theme.colors.text;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNREAD': return '#DC2626';
      case 'READ': return '#F59E0B';
      case 'ACKNOWLEDGED': return '#3B82F6';
      case 'RESOLVED': return '#10B981';
      case 'IGNORED': return '#6B7280';
      default: return theme.colors.text;
    }
  };

  // Render alert item
  const renderAlert = ({item}: {item: Alert}) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{translateY: slideAnim}],
      }}
    >
      <TouchableOpacity
        style={[
          styles.alertItem,
          item.status === 'UNREAD' && styles.unreadAlert
        ]}
        onPress={() => handleViewAlert(item)}
      >
      <View style={styles.alertHeader}>
        <View style={[styles.severityBadge, {backgroundColor: getSeverityColor(item.severity)}]}>
          <Text style={styles.severityText}>{item.severity}</Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.alertTitle} numberOfLines={2}>
        {item.title}
      </Text>
      
      <Text style={styles.alertMessage} numberOfLines={3}>
        {item.message}
      </Text>
      
      <View style={styles.alertFooter}>
        <Text style={styles.alertType}>{item.alertType}</Text>
        <Text style={styles.alertTime}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{padding: theme.spacing.md}}>
          <SkeletonList count={6} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      {stats && (
        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}
        >
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.unresolved}</Text>
            <Text style={styles.statLabel}>Unresolved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, {color: '#DC2626'}]}>{stats.critical}</Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, {color: '#EA580C'}]}>{stats.high}</Text>
            <Text style={styles.statLabel}>High</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </Animated.View>
      )}

      {/* Filter Tabs */}
      <Animated.View
        style={[
          styles.filterContainer,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unresolved' && styles.activeFilterTab]}
          onPress={() => setFilter('unresolved')}
        >
          <Text style={[styles.filterText, filter === 'unresolved' && styles.activeFilterText]}>
            Unresolved
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'critical' && styles.activeFilterTab]}
          onPress={() => setFilter('critical')}
        >
          <Text style={[styles.filterText, filter === 'critical' && styles.activeFilterText]}>
            Critical
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Alerts List */}
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No alerts' : `No ${filter} alerts`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  activeFilterTab: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  activeFilterText: {
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  listContent: {
    padding: theme.spacing.md,
  },
  alertItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  severityText: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  alertMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertType: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  alertTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
