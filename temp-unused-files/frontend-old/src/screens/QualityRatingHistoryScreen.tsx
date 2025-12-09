import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { settingsService } from '../services/settingsService';
import theme from '../theme';

const screenWidth = Dimensions.get('window').width;

interface QualityRatingRecord {
  _id: string;
  rating: string;
  tier: string;
  timestamp: string;
  metadata?: {
    hasChanged?: boolean;
    previousRating?: string;
  };
}

interface QualityStats {
  total: number;
  trend: 'improving' | 'declining' | 'stable';
  currentRating: string;
  lastChecked: string | null;
}

interface QualityDistribution {
  [key: string]: number;
}

interface QualityHistoryResponse {
  success: boolean;
  history: QualityRatingRecord[];
  stats: QualityStats;
  distribution: QualityDistribution;
}

export default function QualityRatingHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<QualityRatingRecord[]>([]);
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [distribution, setDistribution] = useState<QualityDistribution>({});
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [checkingNow, setCheckingNow] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadHistory();
    
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
  }, [selectedPeriod]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const response: QualityHistoryResponse = await settingsService.getQualityRatingHistory(
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (response.success) {
        setHistory(response.history);
        setStats(response.stats);
        setDistribution(response.distribution);
      }
    } catch (error: any) {
      console.error('Load quality history error:', error);
      Alert.alert('Error', error.message || 'Failed to load quality rating history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [selectedPeriod]);

  const handleManualCheck = async () => {
    try {
      setCheckingNow(true);
      const response = await settingsService.checkQualityRatingNow();
      
      if (response.success) {
        Alert.alert(
          'Quality Rating Updated',
          `Current rating: ${response.rating}${response.hasChanged ? ' (Changed!)' : ''}`,
          [{ text: 'OK', onPress: () => loadHistory() }]
        );
      }
    } catch (error: any) {
      console.error('Manual check error:', error);
      Alert.alert('Error', error.message || 'Failed to check quality rating');
    } finally {
      setCheckingNow(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'GREEN':
      case 'HIGH':
        return theme.colors.success;
      case 'YELLOW':
      case 'MEDIUM':
        return theme.colors.warning;
      case 'RED':
      case 'LOW':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'GREEN':
      case 'HIGH':
        return 'check-circle';
      case 'YELLOW':
      case 'MEDIUM':
        return 'alert-circle';
      case 'RED':
      case 'LOW':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'trending-up';
      case 'declining':
        return 'trending-down';
      default:
        return 'trending-neutral';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return theme.colors.success;
      case 'declining':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const prepareChartData = () => {
    if (history.length === 0) {
      return null;
    }

    // Convert ratings to numeric values for chart
    const ratingValues: { [key: string]: number } = {
      'GREEN': 3,
      'HIGH': 3,
      'YELLOW': 2,
      'MEDIUM': 2,
      'RED': 1,
      'LOW': 1,
      'UNKNOWN': 0
    };

    // Reverse to show oldest to newest
    const sortedHistory = [...history].reverse();
    
    // Limit data points for readability
    const maxPoints = 20;
    const step = Math.ceil(sortedHistory.length / maxPoints);
    const dataPoints = sortedHistory.filter((_, index) => index % step === 0);

    const data = dataPoints.map(record => ratingValues[record.rating] || 0);
    const labels = dataPoints.map(record => {
      const date = new Date(record.timestamp);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
          strokeWidth: 3
        }
      ],
      legend: ['Quality Rating']
    };
  };

  const renderCurrentStatusCard = () => {
    if (!stats) return null;

    return (
      <View style={[styles.card, { backgroundColor: getRatingColor(stats.currentRating) + '15' }]}>
        <View style={styles.cardHeader}>
          <Icon 
            name={getRatingIcon(stats.currentRating)} 
            size={32} 
            color={getRatingColor(stats.currentRating)} 
          />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Current Quality Rating</Text>
            <Text style={[styles.ratingBadge, { color: getRatingColor(stats.currentRating) }]}>
              {stats.currentRating}
            </Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name={getTrendIcon(stats.trend)} size={24} color={getTrendColor(stats.trend)} />
            <Text style={styles.statLabel}>Trend</Text>
            <Text style={[styles.statValue, { color: getTrendColor(stats.trend) }]}>
              {stats.trend.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="clock-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.statLabel}>Last Checked</Text>
            <Text style={styles.statValue}>
              {stats.lastChecked 
                ? new Date(stats.lastChecked).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Never'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.checkButton} 
          onPress={handleManualCheck}
          disabled={checkingNow}
        >
          {checkingNow ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="refresh" size={20} color="#fff" />
              <Text style={styles.checkButtonText}>Check Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderChart = () => {
    const chartData = prepareChartData();
    if (!chartData) {
      return (
        <View style={styles.emptyChart}>
          <Icon name="chart-line-variant" size={64} color={theme.colors.border} />
          <Text style={styles.emptyText}>No data available for chart</Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rating Trend</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 48}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: theme.colors.card,
            backgroundGradientFrom: theme.colors.card,
            backgroundGradientTo: theme.colors.card,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.6})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: theme.colors.primary
            }
          }}
          bezier
          style={styles.chart}
          fromZero
          segments={3}
          yLabelsOffset={10}
          xLabelsOffset={-5}
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
            <Text style={styles.legendText}>Green (3)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
            <Text style={styles.legendText}>Yellow (2)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
            <Text style={styles.legendText}>Red (1)</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDistribution = () => {
    if (Object.keys(distribution).length === 0) {
      return null;
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rating Distribution</Text>
        {Object.entries(distribution).map(([rating, count]) => (
          <View key={rating} style={styles.distributionRow}>
            <View style={styles.distributionLabel}>
              <Icon 
                name={getRatingIcon(rating)} 
                size={20} 
                color={getRatingColor(rating)} 
              />
              <Text style={styles.distributionText}>{rating}</Text>
            </View>
            <View style={styles.distributionBar}>
              <View 
                style={[
                  styles.distributionFill, 
                  { 
                    width: `${(count / stats!.total) * 100}%`,
                    backgroundColor: getRatingColor(rating)
                  }
                ]} 
              />
            </View>
            <Text style={styles.distributionCount}>{count}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderHistoryList = () => {
    if (history.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="history" size={64} color={theme.colors.border} />
          <Text style={styles.emptyText}>No history available</Text>
          <Text style={styles.emptySubtext}>
            Quality ratings will appear here as they are tracked
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Changes</Text>
        {history.slice(0, 10).map((record, index) => (
          <View key={record._id} style={styles.historyItem}>
            <View style={styles.historyLeft}>
              <Icon 
                name={getRatingIcon(record.rating)} 
                size={24} 
                color={getRatingColor(record.rating)} 
              />
              <View style={styles.historyInfo}>
                <Text style={styles.historyRating}>{record.rating}</Text>
                {record.metadata?.hasChanged && record.metadata?.previousRating && (
                  <Text style={styles.historyChange}>
                    Changed from {record.metadata.previousRating}
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.historyDate}>
              {new Date(record.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <Icon name="chart-timeline-variant" size={28} color={theme.colors.textInverse} />
        <Text style={styles.title}>Quality Rating History</Text>
        <Text style={styles.subtitle}>
          Track your messaging quality over time
        </Text>
      </LinearGradient>

      {/* Period Selector */}
      <Animated.View
        style={[
          styles.periodSelector,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}
      >
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
      </Animated.View>

      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        }}
      >
        {renderCurrentStatusCard()}
      </Animated.View>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        }}
      >
        {renderChart()}
      </Animated.View>
      
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        }}
      >
        {renderDistribution()}
      </Animated.View>
      
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        }}
      >
        {renderHistoryList()}
      </Animated.View>

      {/* Info Box */}
      <Animated.View
        style={[
          styles.infoBox,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}
      >
        <Icon name="information-outline" size={20} color={theme.colors.info} />
        <Text style={styles.infoText}>
          Quality ratings are automatically checked every 6 hours. A declining rating may affect your messaging limits.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
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
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginTop: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textInverse,
    opacity: 0.9,
    marginTop: theme.spacing.xs,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text
  },
  periodButtonTextActive: {
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  cardHeaderText: {
    marginLeft: theme.spacing.md,
    flex: 1
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  ratingBadge: {
    fontSize: 24,
    fontWeight: '700'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 2
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  emptyChart: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginBottom: 16
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center'
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center'
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  distributionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    gap: 8
  },
  distributionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text
  },
  distributionBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 12
  },
  distributionFill: {
    height: '100%',
    borderRadius: 4
  },
  distributionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    width: 30,
    textAlign: 'right'
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  historyInfo: {
    gap: 2
  },
  historyRating: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  historyChange: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  historyDate: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginBottom: 16
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.info + '15',
    borderRadius: 8,
    padding: 12,
    gap: 8
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18
  }
});
