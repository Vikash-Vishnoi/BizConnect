import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import type {Campaign} from '../../types/campaign';
import StatusBadge from './StatusBadge';

interface Props {
  campaign: Campaign;
  onPress: () => void;
}

const CampaignCard: React.FC<Props> = ({campaign, onPress}) => {
  const progress =
    campaign.patientCount > 0
      ? Math.round((campaign.sentCount / campaign.patientCount) * 100)
      : 0;

  const deliveryRate =
    campaign.sentCount > 0
      ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
      : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
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

      {/* Progress Bar */}
      {campaign.status !== 'draft' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: `${progress}%`}]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {campaign.patientCount.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {campaign.sentCount.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Sent</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {campaign.deliveredCount.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, {color: '#25D366'}]}>
            {deliveryRate}%
          </Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          📅 Scheduled: {formatDate(campaign.scheduledFor)}
        </Text>
        {campaign.templateName && (
          <Text style={styles.footerText} numberOfLines={1}>
            📝 {campaign.templateName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#25D366',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#25D366',
    minWidth: 35,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
  },
  footer: {
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default CampaignCard;
