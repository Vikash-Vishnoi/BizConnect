import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import type {Campaign} from '../types/campaign';
import {campaignAPI} from '../services/campaignService';
import StatusBadge from '../components/campaigns/StatusBadge';
import ProgressStats from '../components/campaigns/ProgressStats';
import {EnhancedButton, EnhancedCard, Skeleton, SkeletonCard} from '../components/common';
import theme from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CampaignDetails'>;

const CampaignDetailsScreen = ({navigation, route}: Props) => {
  const {campaignId} = route.params;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  useEffect(() => {
    if (!loading && campaign) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, campaign]);

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

  const handleResendCampaign = async () => {
    if (!campaign) return;

    Alert.alert(
      'Resend Campaign',
      `Create a new campaign with the same settings as "${campaign.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Resend',
          onPress: () => {
            navigation.navigate('CreateCampaign', {
              duplicate: campaign,
            });
          },
        },
      ],
    );
  };

  const handleEditCampaign = () => {
    if (!campaign) return;

    if (campaign.status === 'active' || campaign.status === 'completed') {
      Alert.alert(
        'Cannot Edit',
        'You cannot edit an active or completed campaign. Use "Resend" to create a new campaign with similar settings.',
      );
      return;
    }

    navigation.navigate('CreateCampaign', {
      edit: campaign,
    });
  };

  const renderActionButton = () => {
    if (!campaign || actionLoading) return null;

    if (campaign.status === 'draft' || campaign.status === 'scheduled') {
      return (
        <EnhancedButton
          title="▶️ Start Campaign"
          onPress={handleStartCampaign}
          loading={actionLoading}
          disabled={actionLoading}
          variant="primary"
          size="large"
          fullWidth
          gradient
        />
      );
    }

    if (campaign.status === 'active') {
      return (
        <EnhancedButton
          title="⏸️ Pause Campaign"
          onPress={handlePauseCampaign}
          loading={actionLoading}
          disabled={actionLoading}
          variant="danger"
          size="large"
          fullWidth
        />
      );
    }

    if (campaign.status === 'paused') {
      return (
        <EnhancedButton
          title="▶️ Resume Campaign"
          onPress={handleStartCampaign}
          loading={actionLoading}
          disabled={actionLoading}
          variant="primary"
          size="large"
          fullWidth
          gradient
        />
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
          <SkeletonCard />
          <View style={{height: theme.spacing.md}} />
          <Skeleton width="100%" height={120} />
          <View style={{height: theme.spacing.md}} />
          <Skeleton width="100%" height={80} />
        </View>
      </View>
    );
  }

  const stats = campaign.stats || {
    total: campaign.patientCount || 0,
    sent: campaign.sentCount || 0,
    delivered: campaign.deliveredCount || 0,
    read: 0,
    failed: campaign.failedCount || 0,
    pending: 0,
  };

  const progress =
    stats.total > 0
      ? Math.round((stats.sent / stats.total) * 100)
      : 0;

  const deliveryRate =
    stats.sent > 0
      ? Math.round((stats.delivered / stats.sent) * 100)
      : 0;

  const failureRate =
    stats.sent > 0
      ? Math.round((stats.failed / stats.sent) * 100)
      : 0;

  const patientCount = stats.total;
  const sentCount = stats.sent;
  const deliveredCount = stats.delivered;
  const failedCount = stats.failed;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <View style={styles.container}>
      {}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Campaign Details
        </Text>
        <View style={styles.headerActions}>
          {}
          {(campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'paused') && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleEditCampaign}>
              <Text style={styles.headerButtonText}>✏️</Text>
            </TouchableOpacity>
          )}
          {}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleResendCampaign}>
            <Text style={styles.headerButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {}
        <Animated.View style={[styles.infoCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{campaign.name}</Text>
            <StatusBadge status={campaign.status} size="medium" />
          </View>
          {campaign.description && (
            <Text style={styles.description}>{campaign.description}</Text>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              📅 Scheduled: {formatDate(campaign.scheduledFor)}
            </Text>
            <Text style={styles.metaText}>
              🕒 Created: {formatDate(campaign.createdAt)}
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
        </Animated.View>

        {}
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.cardTitle}>Campaign Progress</Text>

          <ProgressStats
            label="Messages Sent"
            value={`${sentCount.toLocaleString()} / ${patientCount.toLocaleString()}`}
            percentage={progress}
            color={theme.colors.primary}
          />

          <ProgressStats
            label="Delivered"
            value={deliveredCount.toLocaleString()}
            percentage={deliveryRate}
            color="#4CAF50"
          />

          <ProgressStats
            label="Failed"
            value={failedCount.toLocaleString()}
            percentage={failureRate}
            color="#F44336"
          />
        </Animated.View>

        {}
        <Animated.View style={[styles.statsGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {patientCount.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Recipients</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, {color: theme.colors.primary}]}>
              {deliveryRate}%
            </Text>
            <Text style={styles.statLabel}>Delivery Rate</Text>
          </View>
        </Animated.View>

        {}
        {renderActionButton()}

        {actionLoading && (
          <View style={styles.actionLoading}>
            <ActivityIndicator color={theme.colors.primary} />
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
    padding: theme.spacing.xl,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: theme.colors.textInverse,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse,
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
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
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
    fontWeight: '700',
    color: theme.colors.text,
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
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  headerButtonText: {
    fontSize: 18,
  },
});

export default CampaignDetailsScreen;
