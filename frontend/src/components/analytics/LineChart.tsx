import React from 'react';
import {View, Text, StyleSheet, Dimensions, ScrollView} from 'react-native';
import {MessageTrend} from '../../types/analytics';

interface LineChartProps {
  data: MessageTrend[];
  title?: string;
  height?: number;
  showLegend?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  height = 250,
  showLegend = true,
}) => {
  const chartWidth = Dimensions.get('window').width - 48;
  const chartHeight = height - 80;
  const padding = 16;

  // Find max value for scaling
  const maxValue = Math.max(
    ...data.flatMap(d => [d.sent, d.delivered, d.read, d.failed])
  );

  const getY = (value: number) => {
    return chartHeight - (value / maxValue) * chartHeight;
  };

  const getX = (index: number) => {
    return (index / (data.length - 1)) * (chartWidth - 2 * padding);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const lines = [
    {key: 'sent', color: '#3B82F6', label: 'Sent'},
    {key: 'delivered', color: '#10B981', label: 'Delivered'},
    {key: 'read', color: '#8B5CF6', label: 'Read'},
    {key: 'failed', color: '#EF4444', label: 'Failed'},
  ];

  return (
    <View style={[styles.container, {height}]}>
      {title && <Text style={styles.title}>{title}</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          <View style={[styles.chart, {width: chartWidth, height: chartHeight}]}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  {top: chartHeight * fraction, width: chartWidth - 2 * padding},
                ]}
              />
            ))}

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <Text
                key={i}
                style={[
                  styles.yAxisLabel,
                  {top: chartHeight * fraction - 8},
                ]}>
                {Math.round(maxValue * (1 - fraction) / 1000)}K
              </Text>
            ))}

            {/* Data points and lines */}
            {lines.map(line => (
              <View key={line.key}>
                {data.map((point, index) => {
                  if (index === 0) return null;
                  const prevPoint = data[index - 1];
                  const x1 = getX(index - 1) + padding;
                  const y1 = getY(prevPoint[line.key as keyof MessageTrend] as number);
                  const x2 = getX(index) + padding;
                  const y2 = getY(point[line.key as keyof MessageTrend] as number);

                  return (
                    <View
                      key={index}
                      style={[
                        styles.line,
                        {
                          left: x1,
                          top: y1,
                          width: Math.sqrt(
                            Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
                          ),
                          transform: [
                            {
                              rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad`,
                            },
                          ],
                          backgroundColor: line.color,
                        },
                      ]}
                    />
                  );
                })}

                {/* Data points */}
                {data.map((point, index) => (
                  <View
                    key={`point-${index}`}
                    style={[
                      styles.dataPoint,
                      {
                        left: getX(index) + padding - 4,
                        top: getY(point[line.key as keyof MessageTrend] as number) - 4,
                        backgroundColor: line.color,
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* X-axis labels */}
          <View style={[styles.xAxis, {width: chartWidth}]}>
            {data.map((point, index) => (
              <Text key={index} style={styles.xAxisLabel}>
                {formatDate(point.date)}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          {lines.map(line => (
            <View key={line.key} style={styles.legendItem}>
              <View
                style={[styles.legendColor, {backgroundColor: line.color}]}
              />
              <Text style={styles.legendText}>{line.label}</Text>
            </View>
          ))}
        </View>
      )}
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
    position: 'relative',
  },
  chart: {
    position: 'relative',
    marginLeft: 32,
    marginTop: 8,
  },
  gridLine: {
    position: 'absolute',
    left: 16,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  yAxisLabel: {
    position: 'absolute',
    left: -32,
    fontSize: 12,
    color: '#6B7280',
    width: 30,
    textAlign: 'right',
  },
  line: {
    position: 'absolute',
    height: 2,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 32,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  xAxisLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
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
});

export default LineChart;
