import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme';
import api from '../services/api';

const PhoneHealthScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchHealthData();
    
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

  const fetchHealthData = async () => {
    try {
      const response = await api.get('/phone-health');
      setHealth(response.data.health);
      setRecommendations(response.data.recommendations || []);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      if (error.response?.status === 404) {
        // No health data, run initial check
        runHealthCheck();
      } else {
        Alert.alert('Error', 'Failed to load health data');
      }
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    try {
      setCheckingHealth(true);
      const response = await api.post('/phone-health/check');
      
      setHealth(response.data.health);
      setRecommendations(response.data.recommendations || []);
      setAlerts(response.data.alerts || []);

      if (response.data.changes?.qualityChanged) {
        Alert.alert(
          'Quality Rating Changed',
          `Your quality rating changed from ${health?.qualityRating || 'UNKNOWN'} to ${response.data.health.qualityRating}`
        );
      }

      Alert.alert('Success', 'Health check completed successfully');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to run health check');
    } finally {
      setCheckingHealth(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHealthData();
    setRefreshing(false);
  }, []);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await api.patch(`/phone-health/alerts/${alertId}/acknowledge`);
      // Remove acknowledged alert from list
      setAlerts(alerts.filter(a => a._id !== alertId));
      Alert.alert('Success', 'Alert acknowledged');
    } catch (error) {
      Alert.alert('Error', 'Failed to acknowledge alert');
    }
  };

  const getQualityColor = (rating: string) => {
    switch (rating) {
      case 'GREEN': return '#4CAF50';
      case 'YELLOW': return '#FF9800';
      case 'RED': return '#F44336';
      default: return theme.colors.textSecondary;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 50) return '#FF9800';
    return '#F44336';
  };

  const getTierLimit = (tier: string) => {
    const limits = {
      'TIER_50': '50',
      'TIER_250': '250',
      'TIER_1K': '1,000',
      'TIER_10K': '10,000',
      'TIER_100K': '100,000',
      'TIER_UNLIMITED': 'Unlimited',
      'UNKNOWN': 'Unknown'
    };
    return limits[tier] || 'Unknown';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'error': return '#FF5722';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return theme.colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#F44336';
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return theme.colors.textSecondary;
    }
  };

  const formatTimeSince = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          <Text style={styles.title}>Phone Number Health</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={runHealthCheck}
            disabled={checkingHealth}
          >
            {checkingHealth ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <Icon name="refresh" size={24} color={theme.colors.textInverse} />
            )}
          </TouchableOpacity>
        </LinearGradient>

        {health && (
          <>
            {/* Health Score Card */}
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}],
                },
              ]}
            >
              <Text style={styles.cardTitle}>Health Score</Text>
              <View style={styles.scoreContainer}>
                <View style={[styles.scoreCircle, { borderColor: getHealthScoreColor(health.healthScore) }]}>
                  <Text style={[styles.scoreText, { color: getHealthScoreColor(health.healthScore) }]}>
                    {Math.round(health.healthScore)}
                  </Text>
                  <Text style={styles.scoreLabel}>/ 100</Text>
                </View>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: getHealthScoreColor(health.healthScore) + '20' }]}>
                    <Icon 
                      name={health.isCritical ? 'alert-circle' : health.needsAttention ? 'alert' : 'check-circle'} 
                      size={16} 
                      color={getHealthScoreColor(health.healthScore)} 
                    />
                    <Text style={[styles.statusText, { color: getHealthScoreColor(health.healthScore) }]}>
                      {health.isCritical ? 'Critical' : health.needsAttention ? 'Needs Attention' : 'Healthy'}
                    </Text>
                  </View>
                  <Text style={styles.lastChecked}>
                    Last checked: {formatTimeSince(health.lastCheckedAt)}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Quality Rating Card */}
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
                <Text style={styles.cardTitle}>Quality Rating</Text>
                <View style={[styles.qualityBadge, { backgroundColor: getQualityColor(health.qualityRating) + '20' }]}>
                  <Text style={[styles.qualityText, { color: getQualityColor(health.qualityRating) }]}>
                    {health.qualityRating}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardDescription}>
                WhatsApp measures your messaging quality based on user feedback
              </Text>
            </Animated.View>

            {/* Messaging Limit Card */}
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
                <Text style={styles.cardTitle}>Daily Messaging Limit</Text>
                <Text style={styles.limitValue}>{getTierLimit(health.messagingLimitTier)}</Text>
              </View>
              <Text style={styles.cardDescription}>
                Tier: {health.messagingLimitTier.replace('TIER_', '')}
              </Text>
            </Animated.View>

            {/* Verification Status */}
            {health.verifiedName && (
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
                  <Icon name="check-decagram" size={20} color={theme.colors.primary} />
                  <Text style={styles.cardTitle}>Verified Business</Text>
                </View>
                <Text style={styles.verifiedName}>{health.verifiedName}</Text>
                <Text style={styles.cardDescription}>
                  Status: {health.codeVerificationStatus}
                </Text>
              </Animated.View>
            )}

            {/* Metrics Card */}
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}],
                },
              ]}
            >
              <Text style={styles.cardTitle}>Messaging Metrics (Last 30 Days)</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{health.metrics.totalMessagesSent}</Text>
                  <Text style={styles.metricLabel}>Total Sent</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{health.metrics.messagesDelivered}</Text>
                  <Text style={styles.metricLabel}>Delivered</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#4CAF50' }]}>
                    {health.metrics.deliveryRate.toFixed(1)}%
                  </Text>
                  <Text style={styles.metricLabel}>Delivery Rate</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#F44336' }]}>
                    {health.metrics.failureRate.toFixed(1)}%
                  </Text>
                  <Text style={styles.metricLabel}>Failure Rate</Text>
                </View>
              </View>
            </Animated.View>

            {/* Alerts */}
            {alerts.length > 0 && (
              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity: fadeAnim,
                    transform: [{translateY: slideAnim}],
                  },
                ]}
              >
                <Text style={styles.cardTitle}>Active Alerts ({alerts.length})</Text>
                {alerts.map((alert) => (
                  <View 
                    key={alert._id} 
                    style={[styles.alertItem, { borderLeftColor: getSeverityColor(alert.severity) }]}
                  >
                    <View style={styles.alertHeader}>
                      <Icon name="alert-circle" size={20} color={getSeverityColor(alert.severity)} />
                      <Text style={[styles.alertSeverity, { color: getSeverityColor(alert.severity) }]}>
                        {alert.severity.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <View style={styles.alertFooter}>
                      <Text style={styles.alertTime}>{formatTimeSince(alert.createdAt)}</Text>
                      <TouchableOpacity
                        style={styles.acknowledgeButton}
                        onPress={() => acknowledgeAlert(alert._id)}
                      >
                        <Text style={styles.acknowledgeText}>Acknowledge</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity: fadeAnim,
                    transform: [{translateY: slideAnim}],
                  },
                ]}
              >
                <Text style={styles.cardTitle}>Recommendations ({recommendations.length})</Text>
                {recommendations.map((rec, index) => (
                  <View 
                    key={index} 
                    style={[styles.recommendationItem, { borderLeftColor: getPriorityColor(rec.priority) }]}
                  >
                    <View style={styles.recommendationHeader}>
                      <Icon name="lightbulb-outline" size={18} color={getPriorityColor(rec.priority)} />
                      <Text style={[styles.recommendationPriority, { color: getPriorityColor(rec.priority) }]}>
                        {rec.priority.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.recommendationMessage}>{rec.message}</Text>
                  </View>
                ))}
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  refreshButton: {
    padding: theme.spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statusContainer: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastChecked: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  qualityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  limitValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  verifiedName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  alertItem: {
    borderLeftWidth: 4,
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertSeverity: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertMessage: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  acknowledgeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 6,
  },
  acknowledgeText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  recommendationItem: {
    borderLeftWidth: 4,
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recommendationPriority: {
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationMessage: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
});

export default PhoneHealthScreen;
