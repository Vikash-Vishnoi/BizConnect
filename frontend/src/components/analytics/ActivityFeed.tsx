import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {RecentActivity} from '../../types/analytics';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ActivityFeedProps {
  activities: RecentActivity[];
  maxItems?: number;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  maxItems = 10,
}) => {
  const navigation = useNavigation<NavigationProp>();

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMs = now.getTime() - activityTime.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return activityTime.toLocaleDateString();
  };

  const displayActivities = activities.slice(0, maxItems);

  const handleActivityPress = (activity: RecentActivity) => {
    try {
      const campaignMatch = activity.description.match(/campaign "([^"]+)"/);
      const conversationMatch = activity.description.match(/conversation with (.+)/);

      if (activity.type === 'campaign') {
        navigation.navigate('Campaigns');
      } else if (activity.type === 'template') {
        navigation.navigate('Templates');
      } else if (activity.type === 'conversation' || activity.type === 'message') {
        navigation.navigate('Inbox');
      } else {
        navigation.navigate('Analytics');
      }
    } catch (error) {
      console.error('Failed to navigate from activity:', error);
    }
  };

  const getActivityIcon = (iconString: string): string => {
    if (iconString && iconString.length <= 2) {
      return iconString;
    }
    return '📊';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent Activity</Text>
      <ScrollView style={styles.activityList} showsVerticalScrollIndicator={false}>
        {displayActivities.map((activity, index) => (
          <TouchableOpacity
            key={activity.id || `${activity.type}-${activity.timestamp}-${index}`}
            style={[
              styles.activityItem,
              index === displayActivities.length - 1 && styles.lastItem,
            ]}
            onPress={() => handleActivityPress(activity)}
            activeOpacity={0.7}>
            <View
              style={[
                styles.iconContainer,
                {backgroundColor: `${activity.iconColor || '#25D366'}20`},
              ]}>
              <Text style={styles.iconEmoji}>
                {getActivityIcon(activity.icon)}
              </Text>
            </View>

            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityDescription}>
                {activity.description}
              </Text>
              <Text style={styles.activityTime}>
                {getTimeAgo(activity.timestamp)}
              </Text>
            </View>

            <View style={styles.activityIndicator}>
              <Text style={styles.chevronText}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        {displayActivities.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No recent activity</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  activityList: {
    maxHeight: 400,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
    gap: 4,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  activityDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activityIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  chevronText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});

export default ActivityFeed;
