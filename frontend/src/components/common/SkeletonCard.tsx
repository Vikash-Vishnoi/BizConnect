import React from 'react';
import {View, StyleSheet} from 'react-native';
import LoadingSkeleton from './LoadingSkeleton';
import theme from '../../theme';

interface SkeletonCardProps {
  variant?: 'campaign' | 'template' | 'conversation' | 'metric';
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({variant = 'campaign'}) => {
  if (variant === 'campaign') {
    return (
      <View style={styles.campaignCard}>
        <View style={styles.campaignHeader}>
          <LoadingSkeleton width="60%" height={20} />
          <LoadingSkeleton width={60} height={24} borderRadius={12} />
        </View>
        <LoadingSkeleton width="100%" height={16} style={styles.spacing} />
        <LoadingSkeleton width="80%" height={16} style={styles.spacing} />
        <View style={styles.statsRow}>
          <LoadingSkeleton width={80} height={32} borderRadius={8} />
          <LoadingSkeleton width={80} height={32} borderRadius={8} />
          <LoadingSkeleton width={80} height={32} borderRadius={8} />
        </View>
      </View>
    );
  }

  if (variant === 'template') {
    return (
      <View style={styles.templateCard}>
        <View style={styles.templateHeader}>
          <View style={{flex: 1}}>
            <LoadingSkeleton width="70%" height={18} />
            <LoadingSkeleton width="40%" height={14} style={styles.smallSpacing} />
          </View>
          <LoadingSkeleton width={70} height={24} borderRadius={12} />
        </View>
        <LoadingSkeleton width="100%" height={14} style={styles.spacing} />
        <LoadingSkeleton width="90%" height={14} style={styles.smallSpacing} />
        <View style={styles.tagsRow}>
          <LoadingSkeleton width={60} height={24} borderRadius={12} />
          <LoadingSkeleton width={70} height={24} borderRadius={12} />
          <LoadingSkeleton width={80} height={24} borderRadius={12} />
        </View>
      </View>
    );
  }

  if (variant === 'conversation') {
    return (
      <View style={styles.conversationCard}>
        <LoadingSkeleton width={52} height={52} borderRadius={26} />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <LoadingSkeleton width="50%" height={16} />
            <LoadingSkeleton width={60} height={12} />
          </View>
          <LoadingSkeleton width="80%" height={14} style={styles.smallSpacing} />
          <LoadingSkeleton width="60%" height={14} style={styles.smallSpacing} />
          <LoadingSkeleton width="40%" height={12} style={styles.spacing} />
        </View>
      </View>
    );
  }

  if (variant === 'metric') {
    return (
      <View style={styles.metricCard}>
        <LoadingSkeleton width={40} height={40} borderRadius={20} />
        <LoadingSkeleton width="60%" height={14} style={styles.smallSpacing} />
        <LoadingSkeleton width="80%" height={24} style={styles.smallSpacing} />
        <LoadingSkeleton width="50%" height={12} />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  campaignCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.md,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  templateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.md,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  conversationContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  spacing: {
    marginTop: theme.spacing.sm,
  },
  smallSpacing: {
    marginTop: theme.spacing.xs,
  },
});

export default SkeletonCard;
