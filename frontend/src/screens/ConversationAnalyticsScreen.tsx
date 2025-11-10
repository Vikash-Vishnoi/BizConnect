import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../theme';

const screenWidth = Dimensions.get('window').width;

interface CategoryStat {
  category: string;
  count: number;
  messages: number;
  cost: number;
  percentage: number;
  avgMessagesPerConversation: number;
  description: string;
}

interface AnalyticsSummary {
  totalConversations: number;
  totalMessages: number;
  totalCost: number;
  period: string;
  startDate: string;
  endDate: string;
}

interface ConversationAnalytics {
  summary: AnalyticsSummary;
  categories: CategoryStat[];
  pricing: {
    [key: string]: number;
  };
}

export default function ConversationAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ConversationAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // TODO: Call API
      // const response = await analyticsService.getConversationCategories(selectedPeriod);
      // setAnalytics(response);
      
      // Mock data for demonstration
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setAnalytics({
        summary: {
          totalConversations: 1250,
          totalMessages: 8945,
          totalCost: 15.75,
          period: selectedPeriod,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        categories: [
          {
            category: 'service',
            count: 620,
            messages: 4230,
            cost: 5.89,
            percentage: 50,
            avgMessagesPerConversation: 7,
            description: 'Customer support and service'
          },
          {
            category: 'utility',
            count: 375,
            messages: 1875,
            cost: 1.58,
            percentage: 30,
            avgMessagesPerConversation: 5,
            description: 'Transactional updates and notifications'
          },
          {
            category: 'marketing',
            count: 187,
            messages: 1496,
            cost: 2.99,
            percentage: 15,
            avgMessagesPerConversation: 8,
            description: 'Promotional messages and campaigns'
          },
          {
            category: 'authentication',
            count: 68,
            messages: 272,
            cost: 0.19,
            percentage: 5,
            avgMessagesPerConversation: 4,
            description: 'OTP and verification codes'
          }
        ],
        pricing: {
          service: 0.0095,
          utility: 0.0042,
          authentication: 0.0028,
          marketing: 0.0160
        }
      });
    } catch (error: any) {
      console.error('Load analytics error:', error);
      Alert.alert('Error', 'Failed to load conversation analytics');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      service: '#4A90E2',
      utility: '#50C878',
      marketing: '#FF6B6B',
      authentication: '#F39C12'
    };
    return colors[category] || theme.colors.primary;
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      service: 'headset',
      utility: 'bell-ring',
      marketing: 'bullhorn',
      authentication: 'shield-check'
    };
    return icons[category] || 'chart-box';
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      service: 'Service',
      utility: 'Utility',
      marketing: 'Marketing',
      authentication: 'Authentication'
    };
    return labels[category] || category;
  };

  const preparePieChartData = () => {
    if (!analytics) return [];

    return analytics.categories.map(cat => ({
      name: getCategoryLabel(cat.category),
      population: cat.count,
      color: getCategoryColor(cat.category),
      legendFontColor: theme.colors.text,
      legendFontSize: 12
    }));
  };

  const prepareBarChartData = () => {
    if (!analytics) return { labels: [], datasets: [{ data: [] }] };

    return {
      labels: analytics.categories.map(cat => getCategoryLabel(cat.category).substring(0, 4)),
      datasets: [
        {
          data: analytics.categories.map(cat => cat.cost)
        }
      ]
    };
  };

  const renderSummaryCards = () => {
    if (!analytics) return null;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Icon name="message-text" size={32} color={theme.colors.primary} />
          <Text style={styles.summaryValue}>{analytics.summary.totalConversations.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Conversations</Text>
        </View>

        <View style={styles.summaryCard}>
          <Icon name="chat" size={32} color={theme.colors.success} />
          <Text style={styles.summaryValue}>{analytics.summary.totalMessages.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Messages</Text>
        </View>

        <View style={styles.summaryCard}>
          <Icon name="currency-usd" size={32} color={theme.colors.warning} />
          <Text style={styles.summaryValue}>${analytics.summary.totalCost.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Total Cost</Text>
        </View>
      </View>
    );
  };

  const renderCategoryBreakdown = () => {
    if (!analytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        
        {analytics.categories.map(cat => (
          <View key={cat.category} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryTitleRow}>
                <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(cat.category) + '20' }]}>
                  <Icon name={getCategoryIcon(cat.category)} size={24} color={getCategoryColor(cat.category)} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{getCategoryLabel(cat.category)}</Text>
                  <Text style={styles.categoryDescription}>{cat.description}</Text>
                </View>
              </View>
              <Text style={[styles.categoryPercentage, { color: getCategoryColor(cat.category) }]}>
                {cat.percentage}%
              </Text>
            </View>

            <View style={styles.categoryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{cat.count}</Text>
                <Text style={styles.statLabel}>Conversations</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{cat.messages}</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${cat.cost.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Cost</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{cat.avgMessagesPerConversation}</Text>
                <Text style={styles.statLabel}>Avg/Conv</Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${cat.percentage}%`,
                    backgroundColor: getCategoryColor(cat.category)
                  }
                ]} 
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPieChart = () => {
    if (!analytics || analytics.categories.length === 0) return null;

    return (
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Distribution by Category</Text>
        <PieChart
          data={preparePieChartData()}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>
    );
  };

  const renderCostChart = () => {
    if (!analytics || analytics.categories.length === 0) return null;

    const chartData = prepareBarChartData();

    return (
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Cost by Category</Text>
        <BarChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          yAxisLabel="$"
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: theme.colors.card,
            backgroundGradientFrom: theme.colors.card,
            backgroundGradientTo: theme.colors.card,
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.6})`,
            style: {
              borderRadius: 16
            }
          }}
          style={styles.chart}
          fromZero
        />
      </View>
    );
  };

  const renderPricingInfo = () => {
    if (!analytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing Information</Text>
        <Text style={styles.pricingNote}>
          Per conversation pricing (WhatsApp Business API)
        </Text>
        
        {Object.entries(analytics.pricing).map(([category, price]) => (
          <View key={category} style={styles.pricingRow}>
            <View style={styles.pricingLabel}>
              <View style={[styles.pricingDot, { backgroundColor: getCategoryColor(category) }]} />
              <Text style={styles.pricingCategory}>{getCategoryLabel(category)}</Text>
            </View>
            <Text style={styles.pricingValue}>${price.toFixed(4)}</Text>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Icon name="information-outline" size={18} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Costs are based on business-initiated conversations within 24-hour windows.
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Conversation Analytics</Text>
          <Text style={styles.subtitle}>
            Category breakdown and cost analysis
          </Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['7d', '30d', '90d'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive
                ]}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {renderSummaryCards()}
        {renderPieChart()}
        {renderCostChart()}
        {renderCategoryBreakdown()}
        {renderPricingInfo()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 32
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center'
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  periodButtonTextActive: {
    color: '#fff'
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...theme.shadows.sm
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.sm
  },
  chartSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.sm
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  categoryCard: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  categoryTitleRow: {
    flexDirection: 'row',
    flex: 1
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  categoryInfo: {
    flex: 1
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  categoryDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16
  },
  categoryPercentage: {
    fontSize: 24,
    fontWeight: '700'
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 3
  },
  pricingNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic'
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  pricingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  pricingDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  pricingCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.info + '15',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 16
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18
  }
});
