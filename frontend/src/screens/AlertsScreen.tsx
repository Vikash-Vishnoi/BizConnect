import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert as RNAlert,
  StyleSheet,
} from 'react-native';
import api from '../services/api';
import {useSocket} from '../contexts/SocketProvider';
import theme from '../theme';
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
        <View style={styles.statsContainer}>
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
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
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
      </View>

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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeFilterTab: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  alertItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertType: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  alertTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
