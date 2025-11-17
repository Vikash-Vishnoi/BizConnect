import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../theme';
import api from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TemplateAnalytics'>;

interface TemplateAnalytics {
  id: string;
  templateId: string;
  templateName: string;
  metrics: {
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    clicked: number;
    failed: number;
  };
  rates: {
    delivery: string;
    read: string;
    reply: string;
    click: string;
    engagement: string;
    failure: string;
  };
  timing: {
    avgDelivery: string;
    avgRead: string;
    avgReply: string;
  };
  totalRecipients: number;
  lastUpdated: string;
}

interface OverallStats {
  totalTemplates: number;
  metrics: {
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    clicked: number;
    failed: number;
  };
  rates: {
    deliveryRate: number;
    readRate: number;
    replyRate: number;
    clickRate: number;
    engagementRate: number;
  };
}

const TemplateAnalyticsScreen: React.FC<Props> = ({ navigation }) => {
  const [analytics, setAnalytics] = useState<TemplateAnalytics[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'engagement' | 'sent' | 'replies'>('engagement');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [analyticsResponse, statsResponse] = await Promise.all([
        api.get('/template-analytics'),
        api.get('/template-analytics/overall')
      ]);

      setAnalytics(analyticsResponse.data.analytics || []);
      setOverallStats(statsResponse.data);
    } catch (error) {
      console.error('Load analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getSortedAnalytics = () => {
    const sorted = [...analytics];
    
    switch (sortBy) {
      case 'engagement':
        sorted.sort((a, b) => 
          parseFloat(b.rates.engagement) - parseFloat(a.rates.engagement)
        );
        break;
      case 'sent':
        sorted.sort((a, b) => b.metrics.sent - a.metrics.sent);
        break;
      case 'replies':
        sorted.sort((a, b) => b.metrics.replied - a.metrics.replied);
        break;
    }
    
    return sorted;
  };

  const getPerformanceColor = (rate: string): string => {
    const value = parseFloat(rate);
    if (value >= 70) return theme.colors.success;
    if (value >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const renderOverallStats = () => {
    if (!overallStats) return null;

    return (
      <View style={styles.overallContainer}>
        <Text style={styles.overallTitle}>Overall Performance</Text>
        
        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{overallStats.metrics.sent.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Sent</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {overallStats.rates.deliveryRate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.colors.info }]}>
              {overallStats.rates.readRate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Read</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {overallStats.rates.engagementRate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Engagement</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Icon name="message-reply" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              {overallStats.metrics.replied} replies
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Icon name="cursor-pointer" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              {overallStats.metrics.clicked} clicks
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Icon name="file-document-multiple" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              {overallStats.totalTemplates} templates
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSortButtons = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      <View style={styles.sortButtons}>
        {[
          { key: 'engagement' as const, label: 'Engagement', icon: 'chart-line' },
          { key: 'sent' as const, label: 'Sent', icon: 'send' },
          { key: 'replies' as const, label: 'Replies', icon: 'message-reply' }
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.sortButton,
              sortBy === option.key && styles.sortButtonActive
            ]}
            onPress={() => setSortBy(option.key)}
          >
            <Icon
              name={option.icon}
              size={14}
              color={sortBy === option.key ? '#fff' : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.sortButtonText,
                sortBy === option.key && styles.sortButtonTextActive
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAnalyticsCard = ({ item }: { item: TemplateAnalytics }) => {
    const engagementRate = parseFloat(item.rates.engagement);
    const performanceColor = getPerformanceColor(item.rates.engagement);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('TemplateDetails', { templateId: item.templateId })}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.templateName}
            </Text>
            <View style={[styles.engagementBadge, { backgroundColor: performanceColor + '20' }]}>
              <Icon name="chart-line" size={14} color={performanceColor} />
              <Text style={[styles.engagementText, { color: performanceColor }]}>
                {item.rates.engagement}
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Icon name="send" size={16} color={theme.colors.primary} />
            <Text style={styles.metricValue}>{item.metrics.sent}</Text>
            <Text style={styles.metricLabel}>Sent</Text>
          </View>

          <View style={styles.metricItem}>
            <Icon name="check-circle" size={16} color={theme.colors.success} />
            <Text style={styles.metricValue}>{item.metrics.delivered}</Text>
            <Text style={styles.metricLabel}>Delivered</Text>
          </View>

          <View style={styles.metricItem}>
            <Icon name="eye" size={16} color={theme.colors.info} />
            <Text style={styles.metricValue}>{item.metrics.read}</Text>
            <Text style={styles.metricLabel}>Read</Text>
          </View>

          <View style={styles.metricItem}>
            <Icon name="message-reply" size={16} color={theme.colors.secondary} />
            <Text style={styles.metricValue}>{item.metrics.replied}</Text>
            <Text style={styles.metricLabel}>Replies</Text>
          </View>
        </View>

        {/* Rates */}
        <View style={styles.ratesContainer}>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Delivery:</Text>
            <Text style={[styles.rateValue, { color: getPerformanceColor(item.rates.delivery) }]}>
              {item.rates.delivery}
            </Text>
          </View>

          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Read:</Text>
            <Text style={[styles.rateValue, { color: getPerformanceColor(item.rates.read) }]}>
              {item.rates.read}
            </Text>
          </View>

          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Reply:</Text>
            <Text style={[styles.rateValue, { color: getPerformanceColor(item.rates.reply) }]}>
              {item.rates.reply}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Icon name="account-multiple" size={14} color={theme.colors.textTertiary} />
            <Text style={styles.footerText}>{item.totalRecipients} recipients</Text>
          </View>
          {item.timing.avgReply !== 'N/A' && (
            <View style={styles.footerItem}>
              <Icon name="clock-outline" size={14} color={theme.colors.textTertiary} />
              <Text style={styles.footerText}>Avg reply: {item.timing.avgReply}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="chart-box-outline" size={80} color={theme.colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Analytics Yet</Text>
      <Text style={styles.emptyText}>
        Start sending templates to see performance analytics.
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('Templates')}
      >
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.createButtonText}>View Templates</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Template Analytics</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={getSortedAnalytics()}
        renderItem={renderAnalyticsCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {renderOverallStats()}
            {analytics.length > 0 && renderSortButtons()}
          </>
        }
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  backButton: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text
  },
  headerRight: {
    width: 32
  },
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  overallContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.sm
  },
  overallTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16
  },
  statGrid: {
    flexDirection: 'row',
    marginBottom: 16
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  sortContainer: {
    marginBottom: 16
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    gap: 4
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary
  },
  sortButtonTextActive: {
    color: '#fff'
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text
  },
  engagementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  engagementText: {
    fontSize: 12,
    fontWeight: '600'
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  metricItem: {
    flex: 1,
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 4,
    marginBottom: 2
  },
  metricLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  ratesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 8
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  rateLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  rateValue: {
    fontSize: 13,
    fontWeight: '600'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.textTertiary
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
    paddingHorizontal: 40,
    marginBottom: 24
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  }
});

export default TemplateAnalyticsScreen;
