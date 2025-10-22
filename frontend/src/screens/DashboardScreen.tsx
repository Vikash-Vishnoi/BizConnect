import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {storageService} from '../services/storage';
import {authAPI} from '../services/api';
import {conversationAPI} from '../services/conversationService';
import {templateService} from '../services/templateService';
import analyticsService from '../services/analyticsService';
import MetricCard from '../components/analytics/MetricCard';
import ActivityFeed from '../components/analytics/ActivityFeed';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import {DailyMetrics, RecentActivity} from '../types/analytics';
import theme from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const DashboardScreen = ({navigation, route}: Props) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [metrics, setMetrics] = useState<DailyMetrics | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const user = route.params?.user;

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadUnreadCount(),
      loadTemplatesCount(),
      loadAnalytics(),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const [dailyMetrics, recentActivity] = await Promise.all([
        analyticsService.getDailyMetrics(),
        analyticsService.getRecentActivity(5),
      ]);
      setMetrics(dailyMetrics);
      setActivities(recentActivity);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
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

  const loadTemplatesCount = async () => {
    try {
      const stats = await templateService.getTemplateStats();
      setTemplatesCount(stats.approved);
    } catch (error) {
      console.error('Failed to load templates count:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            
            // Call logout API (ignore errors)
            try {
              await authAPI.logout();
            } catch (apiError) {
              console.log('Logout API error (continuing anyway):', apiError);
            }
            
            // Clear local storage
            await storageService.clearAuth();
            
            // Small delay to ensure storage is cleared
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Navigate to login
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          } catch (error) {
            console.error('Logout error:', error);
            // Even on error, try to navigate to login
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.header}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || '👤'}
              </Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerGreeting}>Welcome back!</Text>
              <Text style={styles.headerName}>
                {user?.name || 'User'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            activeOpacity={0.7}
            accessibilityLabel="Logout">
            <Text style={styles.iconText}>⎋</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }>
        {/* User Info Card */}
        {user?.email && (
          <Card variant="gradient" style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>🎉 You're all set!</Text>
              <Text style={styles.welcomeText}>{user.email}</Text>
              {user?.role && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleIcon}>🛡️</Text>
                  <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Analytics Metrics */}
        {isLoadingAnalytics ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : metrics && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Overview</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Analytics')}
                activeOpacity={0.7}>
                <Text style={styles.seeAllLink}>See All →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metricsGrid}>
              <MetricCard
                title="Total Campaigns"
                value={metrics?.totalCampaigns || 0}
                icon="target"
                iconColor={theme.colors.info}
                backgroundColor={theme.colors.infoLight}
                style={styles.metricCard}
              />
              <MetricCard
                title="Active Now"
                value={metrics?.activeCampaigns || 0}
                icon="activity"
                iconColor={theme.colors.success}
                backgroundColor={theme.colors.successLight}
                variant="gradient"
                style={styles.metricCard}
              />
            </View>

            <View style={styles.metricsGrid}>
              <MetricCard
                title="Messages Sent"
                value={(metrics?.messagesSent || 0).toLocaleString()}
                icon="send"
                iconColor={theme.colors.primary}
                backgroundColor={theme.colors.successLight}
                subtitle={`${metrics?.deliveryRate || 0}% delivered`}
                style={styles.metricCard}
              />
              <MetricCard
                title="Unread"
                value={metrics?.unreadConversations || 0}
                icon="message-circle"
                iconColor={theme.colors.warning}
                backgroundColor={theme.colors.warningLight}
                style={styles.metricCard}
              />
            </View>
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <Card variant="elevated" padding="none" style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Inbox')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.infoLight}]}>
              <Text style={styles.actionIcon}>💬</Text>
            </View>
            <View style={styles.actionContent}>
              <View style={styles.actionTitleRow}>
                <Text style={styles.actionTitle}>Inbox</Text>
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionSubtitle}>
                View and respond to messages
              </Text>
            </View>
            <Text style={styles.chevronText}>›</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Campaigns')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.successLight}]}>
              <Text style={styles.actionIcon}>🎯</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Campaigns</Text>
              <Text style={styles.actionSubtitle}>
                Manage messaging campaigns
              </Text>
            </View>
            <Text style={styles.chevronText}>›</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Templates')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.warningLight}]}>
              <Text style={styles.actionIcon}>📄</Text>
            </View>
            <View style={styles.actionContent}>
              <View style={styles.actionTitleRow}>
                <Text style={styles.actionTitle}>Templates</Text>
                {templatesCount > 0 && (
                  <View style={[styles.badge, styles.badgeGreen]}>
                    <Text style={styles.badgeText}>{templatesCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionSubtitle}>
                Create message templates
              </Text>
            </View>
            <Text style={styles.chevronText}>›</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: '#F3E8FF'}]}>
              <Text style={styles.actionIcon}>📊</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Analytics</Text>
              <Text style={styles.actionSubtitle}>
                View detailed insights
              </Text>
            </View>
            <Text style={styles.chevronText}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* Recent Activity */}
        {activities.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            <Card variant="elevated" style={styles.activityCard}>
              <ActivityFeed activities={activities} maxItems={5} />
            </Card>
          </>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    ...theme.typography.h3,
    color: theme.colors.textInverse,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerGreeting: {
    ...theme.typography.bodySmall,
    color: theme.colors.textInverse,
    opacity: 0.9,
  },
  headerName: {
    ...theme.typography.h3,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.base,
  },
  welcomeCard: {
    marginTop: theme.spacing.base,
    marginBottom: theme.spacing.lg,
  },
  welcomeContent: {
    alignItems: 'flex-start',
  },
  welcomeTitle: {
    ...theme.typography.h3,
    color: theme.colors.textInverse,
    marginBottom: theme.spacing.xs,
  },
  welcomeText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textInverse,
    opacity: 0.9,
    marginBottom: theme.spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  roleText: {
    ...theme.typography.captionMedium,
    color: theme.colors.textInverse,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  seeAllLink: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  metricCard: {
    flex: 1,
  },
  actionsCard: {
    marginBottom: theme.spacing.base,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.base,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  actionTitle: {
    ...theme.typography.h5,
    color: theme.colors.text,
  },
  actionSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  actionDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.base,
  },
  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeGreen: {
    backgroundColor: theme.colors.success,
  },
  badgeText: {
    ...theme.typography.caption,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  activityCard: {
    marginBottom: theme.spacing.base,
  },
  bottomSpacing: {
    height: theme.spacing.xl,
  },
  iconText: {
    fontSize: 20,
    color: theme.colors.textInverse,
    lineHeight: 20,
  },
  chevronText: {
    fontSize: 20,
    color: theme.colors.textTertiary,
    lineHeight: 20,
  },
  roleIcon: {
    fontSize: 12,
  },
  actionIcon: {
    fontSize: 24,
  },
});

export default DashboardScreen;
