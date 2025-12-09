import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {StatusDistribution} from '../../types/analytics';

interface PieChartProps {
  data: StatusDistribution[];
  title?: string;
  size?: number;
}

const PieChart: React.FC<PieChartProps> = ({data, title, size = 200}) => {
  const radius = size / 2;
  const strokeWidth = 40;
  const innerRadius = radius - strokeWidth;
  const circumference = 2 * Math.PI * innerRadius;

  let currentAngle = -90;

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      <View style={styles.chartContainer}>
        {}
        <View style={[styles.chart, {width: size, height: size}]}>
          <View style={styles.centerCircle}>
            <Text style={styles.centerText}>Status</Text>
            <Text style={styles.centerSubText}>Distribution</Text>
          </View>

          {data.map((item, index) => {
            const percentage = item.percentage / 100;
            const segmentAngle = 360 * percentage;
            const startAngle = currentAngle;
            currentAngle += segmentAngle;

            return (
              <View
                key={index}
                style={[
                  styles.segment,
                  {
                    transform: [{rotate: `${startAngle}deg`}],
                  },
                ]}>
                <View
                  style={[
                    styles.segmentInner,
                    {
                      backgroundColor: item.color,
                      width: `${percentage * 100}%`,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {}
        <View style={styles.legend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[styles.legendColor, {backgroundColor: item.color}]}
              />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendLabel}>{item.status}</Text>
                <Text style={styles.legendValue}>
                  {item.count.toLocaleString()} ({item.percentage.toFixed(1)}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
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
    alignItems: 'center',
  },
  chart: {
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  centerCircle: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  centerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  centerSubText: {
    fontSize: 12,
    color: '#6B7280',
  },
  segment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  segmentInner: {
    height: '100%',
  },
  legend: {
    width: '100%',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  legendValue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});

export default PieChart;
