import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {CampaignPerformance} from '../../types/analytics';

interface BarChartProps {
  data: CampaignPerformance[];
  title?: string;
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({data, title, height = 300}) => {
  // Safety check for empty data
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, {height}]}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No campaign data available</Text>
        </View>
      </View>
    );
  }

  const chartHeight = height - 120;
  const maxValue = Math.max(...data.map(d => d.messagesCount || 0), 1); // Ensure at least 1 to avoid division by zero

  const getBarHeight = (value: number) => {
    return (value / maxValue) * chartHeight;
  };

  const getStatusColor = (status: string) => {
    if (!status) return '#8B5CF6'; // Default color if status is undefined
    
    switch (status.toLowerCase()) {
      case 'active':
      case 'running':
        return '#10B981';
      case 'completed':
        return '#3B82F6';
      case 'scheduled':
        return '#F59E0B';
      case 'paused':
        return '#6B7280';
      case 'draft':
        return '#9CA3AF';
      default:
        return '#8B5CF6';
    }
  };

  return (
    <View style={[styles.container, {height}]}>
      {title && <Text style={styles.title}>{title}</Text>}

      <View style={styles.chartContainer}>
        <View style={[styles.chart, {height: chartHeight}]}>
          {/* Grid lines with labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
            <View key={i} style={styles.gridRow}>
              <Text style={styles.yAxisLabel}>
                {Math.round((maxValue * (1 - fraction)) / 1000)}K
              </Text>
              <View style={styles.gridLine} />
            </View>
          ))}

          {/* Bars */}
          <View style={styles.barsContainer}>
            {data.map((item, index) => (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: getBarHeight(item.messagesCount || 0),
                        backgroundColor: getStatusColor(item.status),
                      },
                    ]}>
                    <Text style={styles.barValue}>
                      {((item.messagesCount || 0) / 1000).toFixed(1)}K
                    </Text>
                  </View>
                </View>
                <View style={styles.barLabelContainer}>
                  <Text style={styles.barLabel} numberOfLines={2}>
                    {item.name || 'Unnamed Campaign'}
                  </Text>
                  <Text style={styles.barSubLabel}>{item.deliveryRate || 0}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Status legend */}
      <View style={styles.legend}>
        {[
          {status: 'Active', color: '#10B981'},
          {status: 'Completed', color: '#3B82F6'},
          {status: 'Scheduled', color: '#F59E0B'},
        ].map(item => (
          <View key={item.status} style={styles.legendItem}>
            <View
              style={[styles.legendColor, {backgroundColor: item.color}]}
            />
            <Text style={styles.legendText}>{item.status}</Text>
          </View>
        ))}
      </View>
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    flex: 1,
  },
  chart: {
    position: 'relative',
    marginBottom: 16,
  },
  gridRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 40,
    textAlign: 'right',
    marginRight: 8,
  },
  gridLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  barsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 48,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  barContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
    minHeight: 30,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  barLabelContainer: {
    marginTop: 8,
    alignItems: 'center',
    width: '100%',
  },
  barLabel: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  barSubLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default BarChart;
