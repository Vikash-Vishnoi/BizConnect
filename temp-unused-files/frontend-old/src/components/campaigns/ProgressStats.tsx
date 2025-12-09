import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import theme from '../../theme';

interface Props {
  label: string;
  value: number | string;
  color?: string;
  percentage?: number;
}

const ProgressStats: React.FC<Props> = ({
  label,
  value,
  color = theme.colors.primary,
  percentage,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {percentage !== undefined && (
          <Text style={[styles.percentage, {color}]}>{percentage}%</Text>
        )}
      </View>
      <Text style={[styles.value, {color}]}>{value}</Text>
      {percentage !== undefined && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {width: `${percentage}%`, backgroundColor: color},
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  percentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default ProgressStats;
