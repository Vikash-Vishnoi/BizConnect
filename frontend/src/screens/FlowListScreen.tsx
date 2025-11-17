/**
 * ✅ FEATURE 32: Flow List Screen
 * Display all flows with analytics and management options
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
import * as flowService from '../services/flowService';
import { useToast } from '../hooks/useToast';

const FlowListScreen = () => {
  const navigation = useNavigation();
  const { showToast } = useToast();
  
  const [flows, setFlows] = useState<flowService.Flow[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadFlows();
    loadStats();
  }, [statusFilter]);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const response = await flowService.getFlows(1, statusFilter);
      setFlows(response.flows || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to load flows', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await flowService.getFlowStatsSummary();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFlows();
    await loadStats();
    setRefreshing(false);
  };

  const handlePublishFlow = async (flowId: string) => {
    try {
      await flowService.publishFlow(flowId);
      showToast('Flow published successfully', 'success');
      loadFlows();
    } catch (error: any) {
      showToast(error.message || 'Failed to publish flow', 'error');
    }
  };

  const handleDeprecateFlow = async (flowId: string) => {
    Alert.alert(
      'Deprecate Flow',
      'Are you sure you want to deprecate this flow? It will no longer be available to send.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deprecate',
          style: 'destructive',
          onPress: async () => {
            try {
              await flowService.deprecateFlow(flowId);
              showToast('Flow deprecated', 'success');
              loadFlows();
            } catch (error: any) {
              showToast(error.message || 'Failed to deprecate flow', 'error');
            }
          }
        }
      ]
    );
  };

  const handleDeleteFlow = async (flowId: string) => {
    Alert.alert(
      'Delete Flow',
      'Are you sure you want to delete this flow?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await flowService.deleteFlow(flowId);
              showToast('Flow deleted', 'success');
              loadFlows();
            } catch (error: any) {
              showToast(error.message || 'Failed to delete flow', 'error');
            }
          }
        }
      ]
    );
  };

  const handleSendFlow = (flow: flowService.Flow) => {
    navigation.navigate('SendFlow' as never, { flow } as never);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return '#4CAF50';
      case 'draft': return '#FF9800';
      case 'review': return '#2196F3';
      case 'deprecated': return '#9E9E9E';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return 'check-circle';
      case 'draft': return 'pencil';
      case 'review': return 'eye';
      case 'deprecated': return 'archive';
      default: return 'file';
    }
  };

  const renderFlowItem = ({ item }: { item: flowService.Flow }) => (
    <TouchableOpacity
      style={styles.flowCard}
      onPress={() => navigation.navigate('FlowDetails' as never, { flowId: item._id } as never)}
    >
      <View style={styles.flowHeader}>
        <View style={styles.flowTitleRow}>
          <Icon name="form-select" size={24} color="#1976D2" />
          <Text style={styles.flowName}>{item.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Icon name={getStatusIcon(item.status)} size={14} color="#fff" />
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.flowStats}>
        <View style={styles.statItem}>
          <Icon name="eye" size={16} color="#666" />
          <Text style={styles.statText}>{item.analytics.totalViews} views</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="check-circle" size={16} color="#666" />
          <Text style={styles.statText}>{item.analytics.totalCompletions} completed</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="percent" size={16} color="#666" />
          <Text style={styles.statText}>{item.analytics.completionRate.toFixed(1)}% rate</Text>
        </View>
      </View>

      <View style={styles.flowMeta}>
        <Text style={styles.metaText}>
          {item.screens.length} screens • v{item.version}
        </Text>
        <Text style={styles.metaText}>
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.flowActions}>
        {item.status === 'draft' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePublishFlow(item._id)}
          >
            <Icon name="publish" size={18} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Publish</Text>
          </TouchableOpacity>
        )}
        
        {item.status === 'published' && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSendFlow(item)}
            >
              <Icon name="send" size={18} color="#1976D2" />
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeprecateFlow(item._id)}
            >
              <Icon name="archive" size={18} color="#FF9800" />
              <Text style={styles.actionButtonText}>Deprecate</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('FlowBuilder' as never, { flowId: item._id } as never)}
        >
          <Icon name="pencil" size={18} color="#2196F3" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteFlow(item._id)}
        >
          <Icon name="delete" size={18} color="#F44336" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* Statistics Cards */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="form-select" size={32} color="#1976D2" />
            <Text style={styles.statValue}>{stats.totalFlows}</Text>
            <Text style={styles.statLabel}>Total Flows</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="check-circle" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>{stats.publishedFlows}</Text>
            <Text style={styles.statLabel}>Published</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="clipboard-check" size={32} color="#FF9800" />
            <Text style={styles.statValue}>{stats.totalResponses}</Text>
            <Text style={styles.statLabel}>Responses</Text>
          </View>
        </View>
      )}

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter:</Text>
        <View style={styles.filterButtons}>
          {['all', 'draft', 'published', 'deprecated'].map((status) => (
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
      <Icon name="form-select" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Flows Yet</Text>
      <Text style={styles.emptyText}>
        Create your first interactive flow to collect data from customers
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('FlowBuilder' as never)}
      >
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Flow</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading flows...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Interactive Flows</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('FlowBuilder' as never)}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={flows}
        renderItem={renderFlowItem}
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
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8
  },
  statLabel: {
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
    flexWrap: 'wrap',
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
  flowCard: {
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
  flowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  flowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  flowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  flowStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 12
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statText: {
    fontSize: 13,
    color: '#666'
  },
  flowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  metaText: {
    fontSize: 12,
    color: '#999'
  },
  flowActions: {
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

export default FlowListScreen;
