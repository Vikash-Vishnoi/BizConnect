/**
 * ✅ FEATURE 33: Channels List Screen
 * Display all channels with analytics and management options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import * as channelService from '../services/channelService';
import { useToast } from '../hooks/useToast';

const ChannelsScreen = () => {
  const navigation = useNavigation();
  const { showToast } = useToast();
  
  const [channels, setChannels] = useState<channelService.Channel[]>([]);
  const [stats, setStats] = useState<channelService.ChannelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => {
    loadChannels();
    loadStats();
  }, [statusFilter]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const response = await channelService.getChannels(1, statusFilter);
      setChannels(response.channels || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to load channels', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await channelService.getChannelStatsSummary();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChannels();
    await loadStats();
    setRefreshing(false);
  };

  const handleSyncFollowers = async (channelId: string) => {
    try {
      const response = await channelService.syncFollowerCount(channelId);
      showToast(`Synced: ${response.followerCount} followers`, 'success');
      loadChannels();
    } catch (error: any) {
      showToast(error.message || 'Failed to sync followers', 'error');
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    Alert.alert(
      'Delete Channel',
      'Are you sure you want to delete this channel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await channelService.deleteChannel(channelId);
              showToast('Channel deleted', 'success');
              loadChannels();
            } catch (error: any) {
              showToast(error.message || 'Failed to delete channel', 'error');
            }
          }
        }
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'business': return 'briefcase';
      case 'lifestyle': return 'leaf';
      case 'entertainment': return 'movie';
      case 'news': return 'newspaper';
      case 'education': return 'school';
      default: return 'alpha-c-circle';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderChannelItem = ({ item }: { item: channelService.Channel }) => (
    <TouchableOpacity
      style={styles.channelCard}
      onPress={() => navigation.navigate('ChannelMessages' as never, { channelId: item._id } as never)}
    >
      <View style={styles.channelHeader}>
        <View style={styles.channelTitleRow}>
          <View style={[styles.categoryIcon, { backgroundColor: getStatusColor(item.status) }]}>
            <Icon name={getCategoryIcon(item.category)} size={24} color="#fff" />
          </View>
          <View style={styles.channelInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.channelName}>{item.name}</Text>
              {item.verified && (
                <Icon name="check-decagram" size={16} color="#1976D2" />
              )}
            </View>
            {item.description && (
              <Text style={styles.channelDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Icon name="account-group" size={18} color="#1976D2" />
          <Text style={styles.statValue}>{formatNumber(item.followerCount)}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        
        <View style={styles.statBox}>
          <Icon name="message-text" size={18} color="#4CAF50" />
          <Text style={styles.statValue}>{item.messageCount || 0}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
        
        <View style={styles.statBox}>
          <Icon name="eye" size={18} color="#FF9800" />
          <Text style={styles.statValue}>{formatNumber(item.analytics.totalViews)}</Text>
          <Text style={styles.statLabel}>Views</Text>
        </View>
        
        <View style={styles.statBox}>
          <Icon name="heart" size={18} color="#E91E63" />
          <Text style={styles.statValue}>{item.analytics.totalReactions}</Text>
          <Text style={styles.statLabel}>Reactions</Text>
        </View>
      </View>

      <View style={styles.engagementBar}>
        <View style={styles.engagementInfo}>
          <Text style={styles.engagementLabel}>Engagement Rate</Text>
          <Text style={styles.engagementValue}>
            {item.analytics.engagementRate.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(item.analytics.engagementRate, 100)}%` }
            ]}
          />
        </View>
      </View>

      <View style={styles.channelActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ChannelMessages' as never, { channelId: item._id } as never)}
        >
          <Icon name="send" size={18} color="#1976D2" />
          <Text style={styles.actionButtonText}>Broadcast</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleSyncFollowers(item._id)}
        >
          <Icon name="sync" size={18} color="#4CAF50" />
          <Text style={styles.actionButtonText}>Sync</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ChannelAnalytics' as never, { channelId: item._id } as never)}
        >
          <Icon name="chart-line" size={18} color="#FF9800" />
          <Text style={styles.actionButtonText}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteChannel(item._id)}
        >
          <Icon name="delete" size={18} color="#F44336" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'inactive': return '#9E9E9E';
      case 'suspended': return '#F44336';
      default: return '#757575';
    }
  };

  const renderHeader = () => (
    <View>
      {/* Statistics Cards */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="alpha-c-circle" size={32} color="#1976D2" />
            <Text style={styles.statCardValue}>{stats.totalChannels}</Text>
            <Text style={styles.statCardLabel}>Total Channels</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="account-group" size={32} color="#4CAF50" />
            <Text style={styles.statCardValue}>{formatNumber(stats.totalFollowers)}</Text>
            <Text style={styles.statCardLabel}>Followers</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="message-text" size={32} color="#FF9800" />
            <Text style={styles.statCardValue}>{stats.totalMessages}</Text>
            <Text style={styles.statCardLabel}>Messages</Text>
          </View>
        </View>
      )}

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        <View style={styles.filterButtons}>
          {['active', 'inactive', 'all'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.filterButtonText,
                statusFilter === status && styles.filterButtonTextActive
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="alpha-c-circle" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Channels Yet</Text>
      <Text style={styles.emptyText}>
        Create a channel to broadcast messages to your followers
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateChannel' as never)}
      >
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Channel</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading channels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WhatsApp Channels</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('CreateChannel' as never)}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={channels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1976D2',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16,
    paddingBottom: 32
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8
  },
  statCardLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  filterButtonActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2'
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666'
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  channelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  channelHeader: {
    marginBottom: 16
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  channelInfo: {
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  channelDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 12
  },
  statBox: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2
  },
  engagementBar: {
    marginBottom: 12
  },
  engagementInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  engagementLabel: {
    fontSize: 12,
    color: '#666'
  },
  engagementValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2'
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 3
  },
  channelActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 4
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 32
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    gap: 8
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666'
  }
});

export default ChannelsScreen;
