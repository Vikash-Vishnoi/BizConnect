import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import api from '../services/api';
import {EnhancedCard, EnhancedButton, Badge, EmptyState, SkeletonList} from '../components/common';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme';

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
    <EnhancedCard
      key={activity._id}
      elevated
      onPress={() => {
        // Navigate to related screen based on resourceType
        if (activity.resourceType === 'CONVERSATION') {
          navigation.navigate('Conversation', {conversationId: activity.resourceId});
        } else if (activity.resourceType === 'CAMPAIGN') {
          navigation.navigate('CampaignDetails', {campaignId: activity.resourceId});
        } else if (activity.resourceType === 'TEMPLATE') {
          navigation.navigate('TemplateDetails', {templateId: activity.resourceId});
        }
      }}
      style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={styles.activityIcon}>
          <Text style={styles.iconText}>{getActionIcon(activity.action)}</Text>
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.actionText}>{activity.action.replace(/_/g, ' ')}</Text>
          <Text style={styles.userText}>{activity.userId?.name || 'Unknown User'}</Text>
        </View>
        <View style={styles.activityMeta}>
          <Badge
            label={activity.status}
            variant={activity.status === 'SUCCESS' ? 'success' : activity.status === 'FAILURE' ? 'error' : 'warning'}
            size="small"
          />
          <Text style={styles.timeText}>{formatTime(activity.createdAt)}</Text>
        </View>
      </View>
      {activity.details && (
        <Text style={styles.detailsText} numberOfLines={2}>
          {activity.details}
        </Text>
      )}
      <Badge label={activity.resourceType} variant="info" size="small" />
    </EnhancedCard>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <Text style={styles.title}>Recent Activity</Text>
        <Text style={styles.subtitle}>Track all recent actions and events</Text>
      </LinearGradient>

      <View style={styles.filterContainer}>
        <EnhancedButton
          title="All"
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="small"
          onPress={() => setFilter('all')}
          style={styles.filterButton}
        />
        <EnhancedButton
          title="Success"
          variant={filter === 'success' ? 'primary' : 'outline'}
          size="small"
          onPress={() => setFilter('success')}
          style={styles.filterButton}
        />
        <EnhancedButton
          title="Failed"
          variant={filter === 'failure' ? 'primary' : 'outline'}
          size="small"
          onPress={() => setFilter('failure')}
          style={styles.filterButton}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }>
        {loading && !refreshing ? (
          <SkeletonList count={5} />
        ) : activities.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No activities yet"
            description="Your recent actions will appear here"
          />
        ) : (
          activities.map(renderActivity)
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <EnhancedButton
          title="View Full Audit Logs"
          variant="outline"
          onPress={() => navigation.navigate('AuditLogs')}
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.white,
    opacity: 0.9,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  filterButton: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  activityCard: {
    marginHorizontal: theme.spacing.base,
    marginTop: theme.spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  iconText: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  actionText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    marginBottom: 2,
  },
  userText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activityMeta: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  detailsText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.surface,
  },
});

export default ActivityScreen;
