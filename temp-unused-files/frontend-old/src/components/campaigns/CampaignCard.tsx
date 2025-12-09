import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import type {Campaign} from '../../types/campaign';
import StatusBadge from './StatusBadge';
import theme from '../../theme';

interface Props {
  campaign: Campaign;
  onPress: () => void;
}

const CampaignCard: React.FC<Props> = ({campaign, onPress}) => {
  const stats = campaign.stats || {
    total: campaign.patientCount || 0,
    sent: campaign.sentCount || 0,
    delivered: campaign.deliveredCount || 0,
    read: 0,
    failed: campaign.failedCount || 0,
    pending: 0,
  };

  const patientCount = stats.total;
  const sentCount = stats.sent;
  const deliveredCount = stats.delivered;

  const progress =
    patientCount > 0
      ? Math.round((sentCount / patientCount) * 100)
      : 0;

  const deliveryRate =
    sentCount > 0
      ? Math.round((deliveredCount / sentCount) * 100)
      : 0;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not scheduled';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {campaign.name}
          </Text>
          <StatusBadge status={campaign.status} size="small" />
        </View>
      </View>

      {campaign.description && (
        <Text style={styles.description} numberOfLines={2}>
          {campaign.description}
        </Text>
      )}

      {}
      {campaign.status !== 'draft' && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Campaign Progress</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
              style={[styles.progressFill, {width: `${progress}%`}]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
            />
          </View>
        </View>
      )}

      {}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, {backgroundColor: theme.colors.infoLight}]}>
            <Text style={styles.statIcon}>👥</Text>
          </View>
          <Text style={styles.statValue}>{patientCount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Recipients</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, {backgroundColor: theme.colors.successLight}]}>
            <Text style={styles.statIcon}>📤</Text>
          </View>
          <Text style={styles.statValue}>{sentCount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Sent</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, {backgroundColor: theme.colors.primaryDark + '20'}]}>
            <Text style={styles.statIcon}>✓</Text>
          </View>
          <Text style={styles.statValue}>{deliveredCount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, {backgroundColor: theme.colors.successLight}]}>
            <Text style={styles.statIcon}>📈</Text>
          </View>
          <Text style={[styles.statValue, {color: theme.colors.success}]}>{deliveryRate}%</Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>

      {}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={styles.footerIcon}>📅</Text>
          <Text style={styles.footerText}>
            {formatDate(campaign.scheduledFor)}
          </Text>
        </View>
        {campaign.templateName && (
          <View style={styles.footerItem}>
            <Text style={styles.footerIcon}>📄</Text>
            <Text style={styles.footerText} numberOfLines={1}>
              {campaign.templateName}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  header: {
    marginBottom: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h4,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  description: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: theme.spacing.base,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  progressLabel: {
    ...theme.typography.captionMedium,
    color: theme.colors.textSecondary,
  },
  progressValue: {
    ...theme.typography.captionMedium,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.divider,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    marginBottom: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    ...theme.typography.h5,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  footer: {
    gap: theme.spacing.xs,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  statIcon: {
    fontSize: 16,
  },
  footerIcon: {
    fontSize: 14,
  },
});

export default CampaignCard;
