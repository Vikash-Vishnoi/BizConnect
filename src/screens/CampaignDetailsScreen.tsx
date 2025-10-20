import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import type {Campaign} from '../types/campaign';
import {campaignAPI} from '../services/campaignService';
import StatusBadge from '../components/campaigns/StatusBadge';
import ProgressStats from '../components/campaigns/ProgressStats';

type Props = NativeStackScreenProps<RootStackParamList, 'CampaignDetails'>;

const CampaignDetailsScreen = ({navigation, route}: Props) => {
  const {campaignId} = route.params;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      const data = await campaignAPI.getCampaign(campaignId);
      setCampaign(data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
      Alert.alert('Error', 'Failed to load campaign details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async () => {
    if (!campaign) return;

    Alert.alert(
      'Start Campaign',
      `Are you sure you want to start "${campaign.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Start',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await campaignAPI.startCampaign(campaign._id);
              setCampaign(updated);
              Alert.alert('Success', 'Campaign started successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to start campaign');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handlePauseCampaign = async () => {
    if (!campaign) return;

    Alert.alert(
      'Pause Campaign',
      `Are you sure you want to pause "${campaign.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Pause',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await campaignAPI.pauseCampaign(campaign._id);
              setCampaign(updated);
              Alert.alert('Success', 'Campaign paused successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to pause campaign');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderActionButton = () => {
    if (!campaign || actionLoading) return null;

    if (campaign.status === 'draft' || campaign.status === 'scheduled') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.startButton]}
          onPress={handleStartCampaign}
          disabled={actionLoading}>
          <Text style={styles.actionButtonText}>▶️ Start Campaign</Text>
        </TouchableOpacity>
      );
    }

    if (campaign.status === 'running') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.pauseButton]}
          onPress={handlePauseCampaign}
          disabled={actionLoading}>
          <Text style={styles.actionButtonText}>⏸️ Pause Campaign</Text>
        </TouchableOpacity>
      );
    }

    if (campaign.status === 'paused') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.resumeButton]}
          onPress={handleStartCampaign}
          disabled={actionLoading}>
          <Text style={styles.actionButtonText}>▶️ Resume Campaign</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  if (loading || !campaign) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Campaign Details</Text>
          <View style={{width: 40}} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
        </View>
      </View>
    );
  }

  const progress =
    campaign.patientCount > 0
      ? Math.round((campaign.sentCount / campaign.patientCount) * 100)
      : 0;

  const deliveryRate =
    campaign.sentCount > 0
      ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
      : 0;

  const failureRate =
    campaign.sentCount > 0
      ? Math.round((campaign.failedCount / campaign.sentCount) * 100)
      : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Campaign Details
        </Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView style={styles.content}>
        {/* Campaign Info */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{campaign.name}</Text>
            <StatusBadge status={campaign.status} size="medium" />
          </View>
          {campaign.description && (
            <Text style={styles.description}>{campaign.description}</Text>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              📅 Scheduled: {new Date(campaign.scheduledFor).toLocaleString()}
            </Text>
            <Text style={styles.metaText}>
              🕒 Created: {new Date(campaign.createdAt).toLocaleDateString()}
            </Text>
            {campaign.templateName && (
              <Text style={styles.metaText}>
                📝 Template: {campaign.templateName}
              </Text>
            )}
            {campaign.segmentName && (
              <Text style={styles.metaText}>
                👥 Segment: {campaign.segmentName}
              </Text>
            )}
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Campaign Progress</Text>

          <ProgressStats
            label="Messages Sent"
            value={`${campaign.sentCount.toLocaleString()} / ${campaign.patientCount.toLocaleString()}`}
            percentage={progress}
            color="#25D366"
          />

          <ProgressStats
            label="Delivered"
            value={campaign.deliveredCount.toLocaleString()}
            percentage={deliveryRate}
            color="#4CAF50"
          />

          <ProgressStats
            label="Failed"
            value={campaign.failedCount.toLocaleString()}
            percentage={failureRate}
            color="#F44336"
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {campaign.patientCount.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Recipients</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, {color: '#25D366'}]}>
              {deliveryRate}%
            </Text>
            <Text style={styles.statLabel}>Delivery Rate</Text>
          </View>
        </View>

        {/* Action Button */}
        {renderActionButton()}

        {actionLoading && (
          <View style={styles.actionLoading}>
            <ActivityIndicator color="#25D366" />
            <Text style={styles.actionLoadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#25D366',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#fff',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  metaRow: {
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#999',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  resumeButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  actionLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#999',
  },
});

export default CampaignDetailsScreen;
