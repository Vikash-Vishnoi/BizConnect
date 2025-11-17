import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import api from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Activity {
  _id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: {
    name: string;
    email: string;
  };
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  details: string;
  createdAt: string;
}

const ActivityScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all');

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      if (filter !== 'all') {
        params.status = filter.toUpperCase();
      }

      const response = await api.get('/audit-logs', {params});
      setActivities(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return '➕';
    if (action.includes('UPDATE')) return '✏️';
    if (action.includes('DELETE')) return '🗑️';
    if (action.includes('SEND')) return '📤';
    if (action.includes('READ')) return '👁️';
    if (action.includes('LOGIN')) return '🔐';
    return '📋';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return '#10B981';
      case 'FAILURE':
        return '#EF4444';
      case 'PENDING':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const renderActivity = (activity: Activity) => (
    <TouchableOpacity
      key={activity._id}
      style={styles.activityCard}
      onPress={() => {
        // Navigate to related screen based on resourceType
        if (activity.resourceType === 'CONVERSATION') {
          navigation.navigate('Conversation', {conversationId: activity.resourceId});
        } else if (activity.resourceType === 'CAMPAIGN') {
          navigation.navigate('CampaignDetails', {campaignId: activity.resourceId});
        } else if (activity.resourceType === 'TEMPLATE') {
          navigation.navigate('TemplateDetails', {templateId: activity.resourceId});
        }
      }}>
      <View style={styles.activityHeader}>
        <View style={styles.activityIcon}>
          <Text style={styles.iconText}>{getActionIcon(activity.action)}</Text>
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.actionText}>{activity.action.replace(/_/g, ' ')}</Text>
          <Text style={styles.userText}>{activity.userId?.name || 'Unknown User'}</Text>
        </View>
        <View style={styles.activityMeta}>
          <View style={[styles.statusBadge, {backgroundColor: getStatusColor(activity.status) + '20'}]}>
            <Text style={[styles.statusText, {color: getStatusColor(activity.status)}]}>
              {activity.status}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatTime(activity.createdAt)}</Text>
        </View>
      </View>
      {activity.details && (
        <Text style={styles.detailsText} numberOfLines={2}>
          {activity.details}
        </Text>
      )}
      <View style={styles.resourceBadge}>
        <Text style={styles.resourceText}>{activity.resourceType}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Activity</Text>
        <Text style={styles.subtitle}>Track all recent actions and events</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}>
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'success' && styles.filterButtonActive]}
          onPress={() => setFilter('success')}>
          <Text style={[styles.filterText, filter === 'success' && styles.filterTextActive]}>
            Success
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'failure' && styles.filterButtonActive]}
          onPress={() => setFilter('failure')}>
          <Text style={[styles.filterText, filter === 'failure' && styles.filterTextActive]}>
            Failed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#25D366']} />
        }>
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No activities yet</Text>
            <Text style={styles.emptySubtitle}>Your recent actions will appear here</Text>
          </View>
        ) : (
          activities.map(renderActivity)
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={() => navigation.navigate('AuditLogs')}>
        <Text style={styles.viewAllText}>View Full Audit Logs</Text>
        <Text style={styles.arrowText}>→</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#25D366',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userText: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  detailsText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  resourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#25D366',
    gap: 8,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#25D366',
  },
  arrowText: {
    fontSize: 18,
    color: '#25D366',
  },
});

export default ActivityScreen;
