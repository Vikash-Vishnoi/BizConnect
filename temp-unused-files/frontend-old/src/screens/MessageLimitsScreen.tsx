import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {settingsService} from '../services/settingsService';
import theme from '../theme';

type Props = {
  navigation: any;
};

const MessageLimitsScreen: React.FC<Props> = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [limitsData, setLimitsData] = useState<{
    limits: {
      tier: string;
      tierName: string;
      messagingLimit: number;
      qualityRating: string;
    };
    usage: {
      today: number;
      week: number;
      todayPercentage: number;
      weekAverage: number;
    };
  } | null>(null);

  useEffect(() => {
    loadLimitsData();
    
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
  }, []);

  const loadLimitsData = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getMessagingLimits();
      setLimitsData(data);
    } catch (error: any) {
      console.error('Failed to load limits:', error);
      Alert.alert('Error', error.message || 'Failed to load messaging limits');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLimitsData();
    setRefreshing(false);
  };

  const getTierColor = (tier: string) => {
    if (tier.includes('50')) return '#E53E3E';
    if (tier.includes('250')) return '#DD6B20';
    if (tier.includes('1K')) return '#D69E2E';
    if (tier.includes('10K')) return '#38A169';
    if (tier.includes('100K')) return '#3182CE';
    return '#805AD5';
  };

  const getQualityColor = (rating: string) => {
    if (rating === 'GREEN' || rating === 'HIGH') return '#38A169';
    if (rating === 'YELLOW' || rating === 'MEDIUM') return '#D69E2E';
    if (rating === 'RED' || rating === 'LOW') return '#E53E3E';
    return theme.colors.textSecondary;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return '#E53E3E';
    if (percentage >= 75) return '#DD6B20';
    if (percentage >= 50) return '#D69E2E';
    return '#38A169';
  };

  if (loading && !limitsData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading messaging limits...</Text>
      </View>
    );
  }

  if (!limitsData) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to load messaging limits</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadLimitsData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }>
      <View style={styles.content}>
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          <Icon name="speedometer" size={32} color={theme.colors.textInverse} />
          <Text style={styles.headerTitle}>Message Limits</Text>
          <Text style={styles.headerSubtitle}>
            Monitor your WhatsApp Business API usage
          </Text>
        </LinearGradient>

        {/* Account Tier Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Account Tier</Text>
            <View
              style={[
                styles.tierBadge,
                {backgroundColor: getTierColor(limitsData.limits.tier)},
              ]}>
              <Text style={styles.tierBadgeText}>
                {limitsData.limits.tierName}
              </Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Daily Message Limit</Text>
              <Text style={styles.statValue}>
                {limitsData.limits.messagingLimit.toLocaleString()} messages
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Quality Rating</Text>
              <View style={styles.qualityRating}>
                <View
                  style={[
                    styles.qualityDot,
                    {
                      backgroundColor: getQualityColor(
                        limitsData.limits.qualityRating
                      ),
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statValue,
                    {
                      color: getQualityColor(limitsData.limits.qualityRating),
                    },
                  ]}>
                  {limitsData.limits.qualityRating}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Today's Usage Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Usage</Text>
            <Text
              style={[
                styles.percentageText,
                {color: getUsageColor(limitsData.usage.todayPercentage)},
              ]}>
              {limitsData.usage.todayPercentage}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(limitsData.usage.todayPercentage, 100)}%`,
                  backgroundColor: getUsageColor(
                    limitsData.usage.todayPercentage
                  ),
                },
              ]}
            />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Messages Sent Today</Text>
              <Text style={styles.statValue}>
                {limitsData.usage.today.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Remaining Today</Text>
              <Text style={styles.statValue}>
                {Math.max(
                  0,
                  limitsData.limits.messagingLimit - limitsData.usage.today
                ).toLocaleString()}
              </Text>
            </View>
          </View>
          {limitsData.usage.todayPercentage >= 90 && (
            <View style={styles.warningBanner}>
              <Icon name="alert-triangle" size={16} color="#E53E3E" />
              <Text style={styles.warningText}>
                You're approaching your daily limit!
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Weekly Statistics Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Weekly Statistics</Text>
            <Icon name="calendar" size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Last 7 Days Total</Text>
              <Text style={styles.statValue}>
                {limitsData.usage.week.toLocaleString()} messages
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Daily Average</Text>
              <Text style={styles.statValue}>
                {limitsData.usage.weekAverage.toLocaleString()} messages
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Projected Monthly</Text>
              <Text style={styles.statValue}>
                {(limitsData.usage.weekAverage * 30).toLocaleString()} messages
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Tier Information Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>About Message Tiers</Text>
            <Icon name="info" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.infoText}>
              • WhatsApp starts with TIER_1K (1,000 messages/day)
            </Text>
            <Text style={styles.infoText}>
              • Tiers increase based on phone number quality and usage
            </Text>
            <Text style={styles.infoText}>
              • Available tiers: 50, 250, 1K, 10K, 100K, Unlimited
            </Text>
            <Text style={styles.infoText}>
              • Maintain GREEN quality rating to increase tier
            </Text>
            <Text style={styles.infoText}>
              • Limits reset daily at midnight UTC
            </Text>
          </View>
        </Animated.View>

        {/* Quality Rating Info */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Quality Rating Guide</Text>
            <Icon name="star" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.qualityGuideRow}>
              <View style={[styles.qualityDot, {backgroundColor: '#38A169'}]} />
              <Text style={styles.infoText}>
                <Text style={styles.bold}>GREEN / HIGH:</Text> Excellent quality,
                eligible for tier upgrades
              </Text>
            </View>
            <View style={styles.qualityGuideRow}>
              <View style={[styles.qualityDot, {backgroundColor: '#D69E2E'}]} />
              <Text style={styles.infoText}>
                <Text style={styles.bold}>YELLOW / MEDIUM:</Text> Average quality,
                monitor closely
              </Text>
            </View>
            <View style={styles.qualityGuideRow}>
              <View style={[styles.qualityDot, {backgroundColor: '#E53E3E'}]} />
              <Text style={styles.infoText}>
                <Text style={styles.bold}>RED / LOW:</Text> Poor quality, risk of
                tier downgrade
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.base,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginTop: theme.spacing.sm,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textInverse,
    textAlign: 'center',
    opacity: 0.9,
    marginTop: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardContent: {
    gap: theme.spacing.md,
  },
  tierBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    minHeight: 28,
    justifyContent: 'center',
  },
  tierBadgeText: {
    fontSize: 12,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '700',
  },
  qualityRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  qualityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  percentageText: {
    ...theme.typography.h3,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FED7D7',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  warningText: {
    ...theme.typography.bodySmall,
    color: '#E53E3E',
    fontWeight: '600',
    flex: 1,
  },
  infoText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  qualityGuideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    marginTop: theme.spacing.md,
  },
  retryButtonText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
  },
});

export default MessageLimitsScreen;
