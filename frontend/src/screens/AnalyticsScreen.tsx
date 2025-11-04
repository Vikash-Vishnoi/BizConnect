import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import Icon from 'react-native-vector-icons/Feather';
import analyticsService from '../services/analyticsService';
import MetricCard from '../components/analytics/MetricCard';
import DateRangeSelector, {
  DateRangePreset,
} from '../components/analytics/DateRangeSelector';
import LineChart from '../components/analytics/LineChart';
import BarChart from '../components/analytics/BarChart';
import PieChart from '../components/analytics/PieChart';
import theme from '../theme';
import {
  DailyMetrics,
  CampaignAnalytics,
  ConversationAnalytics,
  QualityScore,
  MessageTrend,
  CampaignPerformance,
  StatusDistribution,
  DateRange,
} from '../types/analytics';

type Props = NativeStackScreenProps<RootStackParamList, 'Analytics'>;

const AnalyticsScreen = ({navigation}: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRangePreset>('7days');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });

  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics | null>(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState<
    CampaignAnalytics[]
  >([]);
  const [conversationAnalytics, setConversationAnalytics] =
    useState<ConversationAnalytics | null>(null);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [messageTrends, setMessageTrends] = useState<MessageTrend[]>([]);
  const [campaignPerformance, setCampaignPerformance] = useState<
    CampaignPerformance[]
  >([]);
  const [statusDistribution, setStatusDistribution] = useState<
    StatusDistribution[]
  >([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [templateAnalytics, setTemplateAnalytics] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      const data = await analyticsService.getAllAnalytics(dateRange);
      setDailyMetrics(data.dailyMetrics);
      setCampaignAnalytics(data.campaignAnalytics);
      setConversationAnalytics(data.conversationAnalytics);
      setQualityScore(data.qualityScore);
      setMessageTrends(data.messageTrends);
      setCampaignPerformance(data.campaignPerformance);
      setStatusDistribution(data.statusDistribution);
      setRecentActivity(data.recentActivity || []);
      setTemplateAnalytics(data.templateAnalytics || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAnalytics();
  };

  const handleRangeChange = (
    range: DateRangePreset,
    dates: DateRange
  ) => {
    setSelectedRange(range);
    setDateRange(dates);
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Text style={styles.iconText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerIcon}>📊</Text>
            <Text style={styles.headerTitle}>Analytics</Text>
          </View>
          <View style={styles.headerRight} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>📊</Text>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.iconText}>↻</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }>
        {}
        <DateRangeSelector
          selectedRange={selectedRange}
          onRangeChange={handleRangeChange}
        />

        {}
        {qualityScore && (
          <View style={styles.qualityScoreCard}>
            <View style={styles.qualityScoreHeader}>
              <View style={styles.qualityTitleRow}>
                <Text style={styles.qualityIcon}>🏆</Text>
                <Text style={styles.sectionTitle}>Quality Score</Text>
              </View>
              <View
                style={[
                  styles.qualityBadge,
                  {backgroundColor: getQualityScoreColor(qualityScore.score)},
                ]}>
                <Text style={styles.qualityBadgeText}>
                  {(qualityScore.status || 'low').toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.qualityScoreContent}>
              <View style={[styles.qualityCircle, {borderColor: getQualityScoreColor(qualityScore.score)}]}>
                <Text style={styles.qualityScoreValue}>
                  {qualityScore.score || 0}
                </Text>
                <Text style={styles.qualityScoreLabel}>/ 100</Text>
              </View>
              <Text style={styles.qualityScoreDescription}>
                Your messaging quality score affects delivery rates and API
                limits. Maintain high quality for best results.
              </Text>
            </View>
            <View style={styles.qualityFooter}>
              <Text style={styles.footerIcon}>🕐</Text>
              <Text style={styles.qualityUpdated}>
                Last updated: {qualityScore.lastUpdated ? new Date(qualityScore.lastUpdated).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        )}

        {}
        {dailyMetrics && (
          <>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Total Campaigns"
                value={dailyMetrics.totalCampaigns}
                icon="target"
                iconColor={theme.colors.info}
                backgroundColor={theme.colors.infoLight}
                subtitle={`${dailyMetrics.activeCampaigns} active`}
                style={styles.metricCard}
              />
              <MetricCard
                title="Messages Sent"
                value={(dailyMetrics.messagesSent / 1000).toFixed(1) + 'K'}
                icon="send"
                iconColor={theme.colors.secondary}
                backgroundColor={theme.colors.accent}
                subtitle={`${dailyMetrics.deliveryRate}% delivered`}
                trend={{value: 12, isPositive: true}}
                style={styles.metricCard}
              />
            </View>

            <View style={styles.metricsGrid}>
              <MetricCard
                title="Delivered"
                value={(dailyMetrics.messagesDelivered / 1000).toFixed(1) + 'K'}
                icon="check-circle"
                iconColor={theme.colors.success}
                backgroundColor={theme.colors.successLight}
                style={styles.metricCard}
              />
              <MetricCard
                title="Unread Messages"
                value={dailyMetrics.unreadConversations}
                icon="message-circle"
                iconColor={theme.colors.warning}
                backgroundColor={theme.colors.warningLight}
                style={styles.metricCard}
              />
            </View>

            <View style={styles.metricsGrid}>
              <MetricCard
                title="Templates"
                value={templateAnalytics.length}
                icon="file-text"
                iconColor={theme.colors.info}
                backgroundColor={theme.colors.infoLight}
                subtitle={`${templateAnalytics.filter((t: any) => t.status === 'approved').length} approved`}
                style={styles.metricCard}
              />
              <MetricCard
                title="Total Messages"
                value={dailyMetrics.messagesSent}
                icon="mail"
                iconColor={theme.colors.secondary}
                backgroundColor={theme.colors.accent}
                style={styles.metricCard}
              />
            </View>
          </>
        )}

        {}
        {messageTrends.length > 0 && (
          <View style={styles.chartSection}>
            <LineChart
              data={messageTrends}
              title="Message Trends"
              height={280}
              showLegend={true}
            />
          </View>
        )}

        {}
        {campaignPerformance.length > 0 && (
          <View style={styles.chartSection}>
            <BarChart
              data={campaignPerformance}
              title="Campaign Performance"
              height={320}
            />
          </View>
        )}

        {}
        {campaignAnalytics.length > 0 && (
          <View style={styles.tableSection}>
            <View style={styles.tableTitleRow}>
              <Text style={styles.tableIcon}>📋</Text>
              <Text style={styles.sectionTitle}>Campaign Details</Text>
            </View>
            {campaignAnalytics.map((campaign, index) => (
              <View key={index} style={styles.campaignRow}>
                <View style={styles.campaignInfo}>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <View style={styles.campaignStatsRow}>
                    <Text style={styles.statsIconSmall}>📤</Text>
                    <Text style={styles.campaignStats}>
                      {campaign.messagesSent?.toLocaleString()} sent • {campaign.deliveryRate}% delivered
                    </Text>
                  </View>
                </View>
                <View style={styles.campaignMetrics}>
                  <View style={[styles.metricBadge, {backgroundColor: theme.colors.infoLight}]}>
                    <Text style={styles.badgeIcon}>👁</Text>
                    <Text style={styles.metricBadgeText}>
                      {campaign.readRate}%
                    </Text>
                  </View>
                  <View style={[styles.metricBadge, {backgroundColor: theme.colors.successLight}]}>
                    <Text style={styles.badgeIcon}>💬</Text>
                    <Text style={styles.metricBadgeText}>
                      {campaign.replyRate}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {}
        {statusDistribution.length > 0 && (
          <View style={styles.chartSection}>
            <PieChart
              data={statusDistribution}
              title="Message Status Distribution"
              size={180}
            />
          </View>
        )}

        {}
        {conversationAnalytics && (
          <View style={styles.conversationSection}>
            <View style={styles.conversationTitleRow}>
              <Text style={styles.conversationIcon}>👥</Text>
              <Text style={styles.sectionTitle}>Conversation Insights</Text>
            </View>
            <View style={styles.conversationGrid}>
              <View style={styles.conversationCard}>
                <View style={[styles.conversationIconContainer, {backgroundColor: theme.colors.infoLight}]}>
                  <Text style={styles.conversationCardIcon}>💬</Text>
                </View>
                <Text style={styles.conversationValue}>
                  {conversationAnalytics?.totalConversations || 0}
                </Text>
                <Text style={styles.conversationLabel}>
                  Total Conversations
                </Text>
              </View>
              <View style={styles.conversationCard}>
                <View style={[styles.conversationIconContainer, {backgroundColor: theme.colors.successLight}]}>
                  <Text style={styles.conversationCardIcon}>⏱️</Text>
                </View>
                <Text style={styles.conversationValue}>
                  {conversationAnalytics?.averageResponseTime || 0}m
                </Text>
                <Text style={styles.conversationLabel}>Avg Response</Text>
              </View>
            </View>

            <View style={styles.statusBreakdown}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, {backgroundColor: theme.colors.warning}]} />
                <Text style={styles.statusIconText}>📧</Text>
                <Text style={styles.statusLabel}>Unread</Text>
                <Text style={styles.statusValue}>
                  {conversationAnalytics?.conversationsByStatus?.unread || 0}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, {backgroundColor: theme.colors.info}]} />
                <Text style={styles.statusIconText}>👁</Text>
                <Text style={styles.statusLabel}>Read</Text>
                <Text style={styles.statusValue}>
                  {conversationAnalytics?.conversationsByStatus?.read || 0}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, {backgroundColor: theme.colors.success}]} />
                <Text style={styles.statusIconText}>💬</Text>
                <Text style={styles.statusLabel}>Replied</Text>
                <Text style={styles.statusValue}>
                  {conversationAnalytics?.conversationsByStatus?.replied || 0}
                </Text>
              </View>
            </View>
          </View>
        )}

        {}
        {recentActivity.length > 0 && (
          <View style={styles.recentActivitySection}>
            <View style={styles.activityTitleRow}>
              <Text style={styles.activityIcon}>🕐</Text>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            {recentActivity.slice(0, 10).map((activity: any, index: number) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityIconContainer}>
                  <Text style={styles.activityEmoji}>
                    {activity.type === 'message' ? '💬' : activity.type === 'campaign' ? '🎯' : '📄'}
                  </Text>
                </View>
                <View style={styles.activityDetails}>
                  <Text style={styles.activityTitle}>
                    {activity.type === 'message' && (activity.contactName || activity.contactPhone || 'Unknown')}
                    {activity.type === 'campaign' && (activity.campaignName || 'Campaign')}
                    {activity.type === 'template' && (activity.templateName || 'Template')}
                  </Text>
                  <Text style={styles.activityDescription}>
                    {activity.type === 'message' && `Message ${activity.direction || 'received'}`}
                    {activity.type === 'campaign' && `${activity.status || 'Status update'}`}
                    {activity.type === 'template' && `${activity.status || 'Updated'}`}
                  </Text>
                </View>
                <Text style={styles.activityTime}>
                  {activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Now'}
                </Text>
              </View>
            ))}
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xl + 10,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.textInverse,
  },
  headerRight: {
    width: 40,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 0,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  metricCard: {
    flex: 1,
  },
  qualityScoreCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  qualityScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  qualityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  qualityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  qualityBadgeText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  qualityScoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  qualityCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityScoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  qualityScoreLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  qualityScoreDescription: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  qualityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
  },
  qualityUpdated: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  chartSection: {
    marginBottom: theme.spacing.md,
  },
  tableSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  tableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  campaignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: 4,
  },
  campaignStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  campaignStats: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  campaignMetrics: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  metricBadgeText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.text,
  },
  conversationSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  conversationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  conversationGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  conversationCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  conversationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationValue: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  conversationLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  statusBreakdown: {
    gap: theme.spacing.sm,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusIcon: {
    marginRight: -4,
  },
  statusLabel: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  statusValue: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  bottomSpacing: {
    height: theme.spacing.lg,
  },
  iconText: {
    fontSize: 24,
    color: theme.colors.textInverse,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: theme.spacing.xs,
  },
  qualityIcon: {
    fontSize: 20,
    marginRight: theme.spacing.xs,
  },
  footerIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  tableIcon: {
    fontSize: 20,
    marginRight: theme.spacing.xs,
  },
  statsIconSmall: {
    fontSize: 11,
    marginRight: 4,
  },
  badgeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  conversationIcon: {
    fontSize: 20,
    marginRight: theme.spacing.xs,
  },
  conversationCardIcon: {
    fontSize: 24,
  },
  statusIconText: {
    fontSize: 14,
    marginRight: -4,
  },
  recentActivitySection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  activityIcon: {
    fontSize: 20,
    marginRight: theme.spacing.xs,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  activityEmoji: {
    fontSize: 18,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '600',
  },
  activityDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
});

export default AnalyticsScreen;
