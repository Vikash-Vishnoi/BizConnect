import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {CampaignStatus} from '../../types/campaign';

interface Props {
  status: CampaignStatus;
  size?: 'small' | 'medium' | 'large';
}

const StatusBadge: React.FC<Props> = ({status, size = 'medium'}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          color: '#757575',
          backgroundColor: '#F5F5F5',
        };
      case 'scheduled':
        return {
          label: 'Scheduled',
          color: '#1976D2',
          backgroundColor: '#E3F2FD',
        };
      case 'running':
        return {
          label: 'Running',
          color: '#388E3C',
          backgroundColor: '#E8F5E9',
        };
      case 'paused':
        return {
          label: 'Paused',
          color: '#F57C00',
          backgroundColor: '#FFF3E0',
        };
      case 'completed':
        return {
          label: 'Completed',
          color: '#7B1FA2',
          backgroundColor: '#F3E5F5',
        };
      default:
        return {
          label: status,
          color: '#757575',
          backgroundColor: '#F5F5F5',
        };
    }
  };

  const config = getStatusConfig();
  const sizeStyles = {
    small: {fontSize: 10, paddingHorizontal: 6, paddingVertical: 2},
    medium: {fontSize: 12, paddingHorizontal: 10, paddingVertical: 4},
    large: {fontSize: 14, paddingHorizontal: 12, paddingVertical: 6},
  };

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: config.backgroundColor},
        sizeStyles[size],
      ]}>
      <Text style={[styles.text, {color: config.color}]}>
        {config.label.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: 'bold',
  },
});

export default StatusBadge;
