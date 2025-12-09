import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppHeader} from '../components/common';
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
import BusinessSelector from '../components/common/BusinessSelector';
import {EnhancedCard, Skeleton, SkeletonCard} from '../components/common';
import {DailyMetrics, RecentActivity} from '../types/analytics';
import {useBusiness} from '../contexts/BusinessContext';
import {useAuth} from '../contexts/AuthContext';
import {
  getUserTypeDisplayName,
  getUserTypeBadgeColor,
  canSwitchBusinesses,
} from '../utils/permissions';
import theme from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const DashboardScreen = ({navigation, route}: Props) => {
  const {user, logout} = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [metrics, setMetrics] = useState<DailyMetrics | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadAllData();
    // Animate content on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
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

            try {
              await authAPI.logout();
            } catch (apiError) {
              if (__DEV__) {
                console.log('Logout API error (continuing anyway):', apiError);
              }
            }

            await logout();

            await new Promise(resolve => setTimeout(resolve, 100));

            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          } catch (error) {
            console.error('Logout error:', error);
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
      {}
      <AppHeader
        title={user?.name || 'Dashboard'}
        subtitle="Welcome back"
        variant="primary"
        showBack={false}
        rightActions={[
          {
            icon: 'log-out',
            onPress: handleLogout,
          },
        ]}
      />

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
        {/* Business Selector - Only show for super_admin */}
        {user && canSwitchBusinesses(user) && (
          <View style={styles.businessSelectorContainer}>
            <BusinessSelector 
              onCreateNew={() => navigation.navigate('CreateBusiness')}
            />
          </View>
        )}

        {/* Welcome Card with Gradient */}
        {user?.email && (
          <Animated.View 
            style={[
              styles.welcomeCardWrapper,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary, theme.colors.accent]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.welcomeCardGradient}>
              <View style={styles.welcomeContent}>
                <View style={styles.welcomeHeader}>
                  <View style={styles.welcomeIconContainer}>
                    <Icon name="check-circle" size={28} color={theme.colors.textInverse} />
                  </View>
                  <Text style={styles.welcomeTitle}>You're all set!</Text>
                </View>
                <Text style={styles.welcomeText}>{user.email}</Text>
                {user?.userType && (
                  <View style={styles.roleBadge}>
                    <Icon name="shield-check" size={16} color={theme.colors.textInverse} />
                    <Text style={styles.roleText}>{getUserTypeDisplayName(user.userType)}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {}
        {isLoadingAnalytics ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : metrics && (
          <>
            <Animated.View 
              style={[
                styles.metricsSection,
                {
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}],
                },
              ]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Overview</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Analytics')}
                  activeOpacity={0.7}
                  style={styles.seeAllButton}>
                  <Text style={styles.seeAllLink}>See All</Text>
                  <Icon name="arrow-right" size={16} color={theme.colors.primary} />
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
            </Animated.View>
          </>
        )}

        {}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <Card variant="elevated" padding="none" style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Inbox')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.infoLight}]}>
              <Icon name="message-circle" size={20} color={theme.colors.info} />
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
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Campaigns')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.successLight}]}>
              <Icon name="target" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Campaigns</Text>
              <Text style={styles.actionSubtitle}>
                Manage messaging campaigns
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Templates')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.warningLight}]}>
              <Icon name="file-text" size={20} color={theme.colors.warning} />
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
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.secondaryLight + '30'}]}>
              <Icon name="bar-chart-2" size={20} color={theme.colors.secondary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Analytics</Text>
              <Text style={styles.actionSubtitle}>
                View detailed insights
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('BusinessSettings')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.primaryLight + '40'}]}>
              <Icon name="settings" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Business Settings</Text>
              <Text style={styles.actionSubtitle}>
                Manage business and team
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('WelcomeMessageSettings')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.warningLight}]}>
              <Icon name="hand" size={20} color={theme.colors.warning} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Welcome Messages</Text>
              <Text style={styles.actionSubtitle}>
                Auto-greet new contacts
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('RoleManager')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.primaryLight + '30'}]}>
              <Icon name="lock" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Role Management</Text>
              <Text style={styles.actionSubtitle}>
                Manage roles & permissions
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('FlowList')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.successLight}]}>
              <Icon name="layers" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Interactive Flows</Text>
              <Text style={styles.actionSubtitle}>
                Create forms & collect data
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AuditLogs')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.warningLight}]}>
              <Icon name="file-text" size={20} color={theme.colors.warning} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Audit Logs</Text>
              <Text style={styles.actionSubtitle}>
                Broadcast to followers
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AuditLogs')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.infoLight}]}>
              <Icon name="magnify" size={20} color={theme.colors.info} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Audit Logs</Text>
              <Text style={styles.actionSubtitle}>
                Compliance & activity tracking
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          {/* Privacy & GDPR */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Privacy')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, {backgroundColor: theme.colors.warningLight}]}>
              <Icon name="lock" size={20} color={theme.colors.warning} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Privacy & GDPR</Text>
              <Text style={styles.actionSubtitle}>
                Data export & deletion
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {}
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

        {}
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
  welcomeCardWrapper: {
    marginTop: theme.spacing.base,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  welcomeCardGradient: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  welcomeContent: {
    alignItems: 'flex-start',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  welcomeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  welcomeTitle: {
    ...theme.typography.h3,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  welcomeText: {
    ...theme.typography.body,
    color: theme.colors.textInverse,
    opacity: 0.95,
    marginBottom: theme.spacing.md,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  roleText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  metricsSection: {
    marginBottom: theme.spacing.base,
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
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
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
  businessSelectorContainer: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
});

export default DashboardScreen;
