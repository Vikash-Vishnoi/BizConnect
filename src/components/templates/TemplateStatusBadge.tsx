import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {TemplateStatus} from '../../types/template';

interface TemplateStatusBadgeProps {
  status: TemplateStatus;
}

const TemplateStatusBadge: React.FC<TemplateStatusBadgeProps> = ({status}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          backgroundColor: '#D1FAE5',
          textColor: '#065F46',
        };
      case 'pending':
        return {
          label: 'Pending',
          backgroundColor: '#FEF3C7',
          textColor: '#92400E',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          backgroundColor: '#FEE2E2',
          textColor: '#991B1B',
        };
      case 'draft':
        return {
          label: 'Draft',
          backgroundColor: '#E5E7EB',
          textColor: '#374151',
        };
      default:
        return {
          label: status,
          backgroundColor: '#E5E7EB',
          textColor: '#374151',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: config.backgroundColor},
      ]}>
      <Text style={[styles.badgeText, {color: config.textColor}]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default TemplateStatusBadge;
