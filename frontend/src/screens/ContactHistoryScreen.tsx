import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../theme';
import api from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactHistory'>;

interface ContactChange {
  id: string;
  phoneNumber: string;
  eventType: string;
  eventLabel: string;
  changeDescription: string;
  timestamp: string;
  timeAgo: string;
  source: string;
}

const ContactHistoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phoneNumber } = route.params;
  const [history, setHistory] = useState<ContactChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [phoneNumber]);

  const loadHistory = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/contacts/history/${phoneNumber}`, {
        params: { limit: 100 }
      });

      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Load contact history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [phoneNumber]);

  const getEventIcon = (eventType: string): string => {
    const icons: Record<string, string> = {
      'profile_update': 'account-circle',
      'name_change': 'pencil',
      'photo_update': 'camera',
      'status_update': 'message-text',
      'about_change': 'information',
      'number_change': 'phone-rotate-landscape',
      'contact_added': 'account-plus',
      'contact_blocked': 'block-helper',
      'contact_unblocked': 'check-circle'
    };
    return icons[eventType] || 'account';
  };

  const getEventColor = (eventType: string): string => {
    const colors: Record<string, string> = {
      'profile_update': theme.colors.info,
      'name_change': theme.colors.primary,
      'photo_update': theme.colors.secondary,
      'status_update': theme.colors.info,
      'about_change': theme.colors.textSecondary,
      'number_change': theme.colors.warning,
      'contact_added': theme.colors.success,
      'contact_blocked': theme.colors.error,
      'contact_unblocked': theme.colors.success
    };
    return colors[eventType] || theme.colors.textSecondary;
  };

  const renderChange = ({ item, index }: { item: ContactChange; index: number }) => {
    const isFirst = index === 0;
    const isLast = index === history.length - 1;

    return (
      <View style={styles.timelineItem}>
        {!isFirst && <View style={styles.timelineLine} />}
        
        <View
          style={[
            styles.timelineDot,
            { backgroundColor: getEventColor(item.eventType) }
          ]}
        >
          <Icon name={getEventIcon(item.eventType)} size={16} color="#fff" />
        </View>

        {!isLast && <View style={[styles.timelineLine, styles.timelineLineBottom]} />}

        <View style={styles.changeContent}>
          <View style={styles.changeHeader}>
            <Text style={styles.eventLabel}>{item.eventLabel}</Text>
            <Text style={styles.timeAgo}>{item.timeAgo}</Text>
          </View>

          {item.changeDescription && (
            <Text style={styles.changeDescription}>{item.changeDescription}</Text>
          )}

          <View style={styles.changeFooter}>
            <Icon name="source-commit" size={12} color={theme.colors.textTertiary} />
            <Text style={styles.sourceText}>{item.source}</Text>
            <Text style={styles.timestampText}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="history" size={80} color={theme.colors.textTertiary} />
      <Text style={styles.emptyTitle}>No History</Text>
      <Text style={styles.emptyText}>
        No profile changes recorded for this contact yet.
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Contact History</Text>
          <Text style={styles.headerSubtitle}>{phoneNumber}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Timeline */}
      <FlatList
        data={history}
        renderItem={renderChange}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  backButton: {
    padding: 4
  },
  headerContent: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  headerRight: {
    width: 32
  },
  listContent: {
    padding: 24,
    flexGrow: 1
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative'
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: -24,
    bottom: '50%',
    width: 2,
    backgroundColor: theme.colors.border
  },
  timelineLineBottom: {
    top: '50%',
    bottom: -24
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    ...theme.shadows.sm
  },
  changeContent: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    ...theme.shadows.sm
  },
  changeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  eventLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1
  },
  timeAgo: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  changeDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18
  },
  changeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  sourceText: {
    marginLeft: 4,
    fontSize: 11,
    color: theme.colors.textTertiary,
    textTransform: 'capitalize'
  },
  timestampText: {
    marginLeft: 'auto',
    fontSize: 11,
    color: theme.colors.textTertiary
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40
  }
});

export default ContactHistoryScreen;
