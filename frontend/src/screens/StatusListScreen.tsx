/**
 * ✅ FEATURE 27: STATUS LIST SCREEN
 * 
 * View all posted status updates with 24-hour timeline
 * Similar to Instagram Stories list or WhatsApp Status tab
 * 
 * Features:
 * - List of active statuses
 * - View count badges
 * - Time remaining indicators
 * - Tap to view details
 * - Delete option
 * - Filter (active/expired)
 * 
 * @version 1.0.0
 * @date November 2025
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../services/api';
import theme from '../theme';
import { RootStackParamList } from '../types/navigation';

type StatusListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'StatusList'>;

interface Status {
  _id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  mediaUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  totalViews: number;
  uniqueViewers: number;
  isExpired: boolean;
  expiresAt: string;
  timeRemaining: number;
  isViewable: boolean;
  createdAt: string;
}

const StatusList: React.FC = () => {
  const navigation = useNavigation<StatusListNavigationProp>();

  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active');

  const fetchStatuses = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const includeExpired = filter === 'all' || filter === 'expired';
      const response = await api.get('/status', {
        params: {
          includeExpired: includeExpired.toString(),
          limit: 50
        }
      });

      if (response.data.success) {
        let statusList = response.data.statuses;
        
        // Apply client-side filter for expired-only
        if (filter === 'expired') {
          statusList = statusList.filter((s: Status) => s.isExpired);
        } else if (filter === 'active') {
          statusList = statusList.filter((s: Status) => !s.isExpired);
        }

        setStatuses(statusList);
      }
    } catch (error: any) {
      console.error('Fetch statuses error:', error);
      Alert.alert('Error', 'Failed to load statuses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchStatuses(false);
    }, [filter])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatuses(false);
  };

  const handleDeleteStatus = (statusId: string) => {
    Alert.alert(
      'Delete Status?',
      'This status will be marked as expired and hidden from view.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/status/${statusId}`);
              if (response.data.success) {
                Alert.alert('Deleted', 'Status has been removed');
                fetchStatuses(false);
              }
            } catch (error: any) {
              console.error('Delete status error:', error);
              Alert.alert('Error', 'Failed to delete status');
            }
          }
        }
      ]
    );
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const renderStatusItem = ({ item }: { item: Status }) => (
    <TouchableOpacity
      style={[styles.statusCard, item.isExpired && styles.statusCardExpired]}
      onPress={() => {
        // Navigate to status details (implement later)
        Alert.alert('Status Details', `Views: ${item.totalViews}\nUnique Viewers: ${item.uniqueViewers}`);
      }}
    >
      {/* Status Preview */}
      <View style={styles.statusPreview}>
        {item.type === 'text' ? (
          <View style={[styles.textPreview, { backgroundColor: item.backgroundColor || '#128C7E' }]}>
            <Text
              style={[styles.textPreviewContent, { color: item.textColor || '#FFFFFF' }]}
              numberOfLines={3}
            >
              {item.content}
            </Text>
          </View>
        ) : item.type === 'image' && item.mediaUrl ? (
          <Image source={{ uri: item.mediaUrl }} style={styles.imagePreview} />
        ) : (
          <View style={styles.videoPreview}>
            <Icon name="video" size={40} color={theme.colors.primary} />
          </View>
        )}
      </View>

      {/* Status Info */}
      <View style={styles.statusInfo}>
        <View style={styles.statusHeader}>
          <View style={styles.statusType}>
            <Icon
              name={item.type === 'text' ? 'text' : item.type === 'image' ? 'image' : 'video'}
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.statusTypeText}>
              {item.type === 'text' ? 'Text' : item.type === 'image' ? 'Photo' : 'Video'}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => handleDeleteStatus(item._id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="delete-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>

        {/* Content Preview (for media types) */}
        {(item.type === 'image' || item.type === 'video') && item.content && (
          <Text style={styles.caption} numberOfLines={2}>
            {item.content}
          </Text>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Icon name="eye" size={16} color={theme.colors.primary} />
            <Text style={styles.statText}>{item.totalViews} views</Text>
          </View>
          
          <View style={styles.stat}>
            <Icon name="account" size={16} color={theme.colors.primary} />
            <Text style={styles.statText}>{item.uniqueViewers} viewers</Text>
          </View>
        </View>

        {/* Time Info */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatRelativeTime(item.createdAt)}
          </Text>
          
          {!item.isExpired ? (
            <View style={styles.expiryBadge}>
              <Icon name="clock-outline" size={14} color={theme.colors.success} />
              <Text style={styles.expiryText}>
                {formatTimeRemaining(item.timeRemaining)}
              </Text>
            </View>
          ) : (
            <View style={[styles.expiryBadge, styles.expiredBadge]}>
              <Icon name="close-circle" size={14} color={theme.colors.error} />
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="clock-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>
        {filter === 'active' ? 'No Active Status' : filter === 'expired' ? 'No Expired Status' : 'No Status Yet'}
      </Text>
      <Text style={styles.emptyStateText}>
        {filter === 'active'
          ? 'Create your first status update to share moments that disappear in 24 hours'
          : filter === 'expired'
          ? 'Expired statuses will appear here'
          : 'Start sharing status updates with your contacts'}
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('StatusComposer')}
      >
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Status</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Status</Text>
          <Text style={styles.headerSubtitle}>24-hour updates</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('StatusComposer')}
        >
          <Icon name="plus-circle" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'expired' && styles.filterTabActive]}
          onPress={() => setFilter('expired')}
        >
          <Text style={[styles.filterTabText, filter === 'expired' && styles.filterTabTextActive]}>
            Expired
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status List */}
      <FlatList
        data={statuses}
        renderItem={renderStatusItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContent,
          statuses.length === 0 && styles.listContentEmpty
        ]}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...Platform.select({
      ios: {
        paddingTop: 50,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statusCardExpired: {
    opacity: 0.6,
  },
  statusPreview: {
    height: 200,
  },
  textPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  textPreviewContent: {
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  statusInfo: {
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTypeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  caption: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.successLight,
    borderRadius: 12,
  },
  expiredBadge: {
    backgroundColor: theme.colors.errorLight,
  },
  expiryText: {
    fontSize: 12,
    color: theme.colors.success,
    marginLeft: 4,
    fontWeight: '600',
  },
  expiredText: {
    fontSize: 12,
    color: theme.colors.error,
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default StatusList;
