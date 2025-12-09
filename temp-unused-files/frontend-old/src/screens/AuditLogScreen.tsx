// Audit Logs Screen - View, filter, and export audit logs

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  Share,
  Animated
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  getAuditLogs,
  getAuditLogStats,
  getActionTypes,
  getResourceTypes,
  exportAuditLogs,
  formatActionName,
  getStatusColor,
  getImpactColor,
  formatDuration,
  getActionIcon,
  AuditLog,
  AuditLogFilters,
  AuditLogStats
} from '../services/auditService';
import { useToast } from '../hooks/useToast';

const AuditLogScreen = ({ navigation }: any) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  
  // Selected log detail
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  
  // Search
  const [searchText, setSearchText] = useState('');
  
  const { showToast } = useToast();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadInitialData();
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

  const loadInitialData = async () => {
    await Promise.all([
      fetchLogs(),
      fetchStats(),
      fetchActionTypes(),
      fetchResourceTypes()
    ]);
  };

  const fetchLogs = async (reset = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const currentFilters = { ...filters, page: currentPage };
      
      const { logs: fetchedLogs, pagination } = await getAuditLogs(currentFilters);
      
      if (reset) {
        setLogs(fetchedLogs);
        setPage(1);
      } else {
        setLogs(prev => currentPage === 1 ? fetchedLogs : [...prev, ...fetchedLogs]);
      }
      
      setTotalPages(pagination.totalPages);
      setHasMore(pagination.hasNextPage);
      
    } catch (error: any) {
      showToast('Failed to load audit logs', 'error');
      console.error('Fetch logs error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await getAuditLogStats();
      setStats(statsData);
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const fetchActionTypes = async () => {
    try {
      const types = await getActionTypes();
      setActionTypes(types);
    } catch (error) {
      console.error('Fetch action types error:', error);
    }
  };

  const fetchResourceTypes = async () => {
    try {
      const types = await getResourceTypes();
      setResourceTypes(types);
    } catch (error) {
      console.error('Fetch resource types error:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await Promise.all([fetchLogs(true), fetchStats()]);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore && page < totalPages) {
      setPage(prev => prev + 1);
      fetchLogs();
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchText, page: 1 }));
    setPage(1);
    fetchLogs(true);
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    setPage(1);
    fetchLogs(true);
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setSearchText('');
    setPage(1);
    fetchLogs(true);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      Alert.alert(
        'Export Audit Logs',
        'Export logs with current filters to CSV?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Export',
            onPress: async () => {
              try {
                const blob = await exportAuditLogs(filters);
                
                // For web, trigger download
                if (Platform.OS === 'web') {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `audit-logs-${Date.now()}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } else {
                  // For mobile, share the file
                  showToast('Export feature not available on mobile', 'info');
                }
                
                showToast('Audit logs exported successfully', 'success');
              } catch (error) {
                showToast('Failed to export logs', 'error');
              }
            }
          }
        ]
      );
    } catch (error) {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Title */}
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Audit Logs</Text>
          <Text style={styles.headerSubtitle}>Compliance & Security Monitoring</Text>
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.exportButtonText}>📥 Export</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      {stats && (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statsContainer}
          >
            {renderStatCard('Total Actions', stats.totalActions?.toLocaleString() || '0', '📊', '#3B82F6')}
            {renderStatCard('Success Rate', stats.totalActions ? `${Math.round((stats.successfulActions / stats.totalActions) * 100)}%` : '0%', '✅', '#10B981')}
            {renderStatCard('Unique Users', stats.uniqueUsers || 0, '👥', '#8B5CF6')}
            {renderStatCard('Failed', stats.failedActions || 0, '❌', '#EF4444')}
          </ScrollView>
        </Animated.View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search logs..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterButtonText}>🔧 Filters</Text>
        </TouchableOpacity>
        
        {(filters.action || filters.resourceType || filters.status || filters.startDate) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearFilters}
          >
            <Text style={styles.clearButtonText}>✕ Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filters Display */}
      {(filters.action || filters.resourceType || filters.status) && (
        <View style={styles.activeFilters}>
          {filters.action && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Action: {formatActionName(filters.action)}</Text>
            </View>
          )}
          {filters.resourceType && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Resource: {filters.resourceType}</Text>
            </View>
          )}
          {filters.status && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Status: {filters.status}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderLogItem = ({ item }: { item: AuditLog }) => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.logCard}
        onPress={() => {
          setSelectedLog(item);
          setShowDetail(true);
        }}
      >
      <View style={styles.logHeader}>
        <View style={styles.logHeaderLeft}>
          <Text style={styles.logIcon}>{getActionIcon(item.action)}</Text>
          <View>
            <Text style={styles.logAction}>{formatActionName(item.action)}</Text>
            <Text style={styles.logUser}>
              {item.userName || 'System'} • {item.resourceType}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.logDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.logFooter}>
        <Text style={styles.logTime}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
        {item.ipAddress && (
          <Text style={styles.logIP}>📍 {item.ipAddress}</Text>
        )}
        {item.responseData?.duration && (
          <Text style={styles.logDuration}>
            ⏱️ {formatDuration(item.responseData.duration)}
          </Text>
        )}
      </View>

      {item.impact && item.impact.level !== 'NONE' && (
        <View style={[styles.impactBadge, { backgroundColor: getImpactColor(item.impact.level) }]}>
          <Text style={styles.impactText}>Impact: {item.impact.level}</Text>
        </View>
      )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderDetailModal = () => (
    <Modal
      visible={showDetail}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDetail(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Audit Log Details</Text>
            <TouchableOpacity onPress={() => setShowDetail(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedLog && (
            <ScrollView style={styles.modalBody}>
              {/* Action Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Action</Text>
                <Text style={styles.detailText}>
                  {getActionIcon(selectedLog.action)} {formatActionName(selectedLog.action)}
                </Text>
              </View>

              {/* User Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>User</Text>
                <Text style={styles.detailText}>
                  {selectedLog.userName || 'System'}
                  {selectedLog.userEmail && ` (${selectedLog.userEmail})`}
                </Text>
                {selectedLog.userRole && (
                  <Text style={styles.detailSubtext}>Role: {selectedLog.userRole}</Text>
                )}
              </View>

              {/* Resource Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Resource</Text>
                <Text style={styles.detailText}>
                  Type: {selectedLog.resourceType}
                </Text>
                {selectedLog.resourceName && (
                  <Text style={styles.detailSubtext}>Name: {selectedLog.resourceName}</Text>
                )}
                {selectedLog.resourceId && (
                  <Text style={styles.detailSubtext}>ID: {selectedLog.resourceId}</Text>
                )}
              </View>

              {/* Status & Timing */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Status & Timing</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedLog.status) }]}>
                  <Text style={styles.statusText}>{selectedLog.status}</Text>
                </View>
                <Text style={styles.detailSubtext}>
                  Time: {new Date(selectedLog.createdAt).toLocaleString()}
                </Text>
                {selectedLog.responseData?.duration && (
                  <Text style={styles.detailSubtext}>
                    Duration: {formatDuration(selectedLog.responseData.duration)}
                  </Text>
                )}
              </View>

              {/* Network Info */}
              {(selectedLog.ipAddress || selectedLog.userAgent) && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Network</Text>
                  {selectedLog.ipAddress && (
                    <Text style={styles.detailSubtext}>IP: {selectedLog.ipAddress}</Text>
                  )}
                  {selectedLog.userAgent && (
                    <Text style={styles.detailSubtext} numberOfLines={2}>
                      User Agent: {selectedLog.userAgent}
                    </Text>
                  )}
                </View>
              )}

              {/* Impact */}
              {selectedLog.impact && selectedLog.impact.level !== 'NONE' && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Impact</Text>
                  <View style={[styles.impactBadge, { backgroundColor: getImpactColor(selectedLog.impact.level) }]}>
                    <Text style={styles.impactText}>{selectedLog.impact.level}</Text>
                  </View>
                  {selectedLog.impact.affectedUsers && (
                    <Text style={styles.detailSubtext}>
                      Affected Users: {selectedLog.impact.affectedUsers}
                    </Text>
                  )}
                </View>
              )}

              {/* Compliance Tags */}
              {selectedLog.complianceTags && selectedLog.complianceTags.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Compliance</Text>
                  <View style={styles.tagsContainer}>
                    {selectedLog.complianceTags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Error Info */}
              {selectedLog.errorMessage && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Error</Text>
                  <Text style={styles.errorText}>{selectedLog.errorMessage}</Text>
                  {selectedLog.errorCode && (
                    <Text style={styles.detailSubtext}>Code: {selectedLog.errorCode}</Text>
                  )}
                </View>
              )}

              {/* Description */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Description</Text>
                <Text style={styles.detailText}>{selectedLog.description}</Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Action Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Action Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterOption, !filters.action && styles.filterOptionActive]}
                  onPress={() => setFilters(prev => ({ ...prev, action: undefined }))}
                >
                  <Text style={styles.filterOptionText}>All</Text>
                </TouchableOpacity>
                {actionTypes.slice(0, 10).map(action => (
                  <TouchableOpacity
                    key={action}
                    style={[styles.filterOption, filters.action === action && styles.filterOptionActive]}
                    onPress={() => setFilters(prev => ({ ...prev, action }))}
                  >
                    <Text style={styles.filterOptionText}>{formatActionName(action)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Resource Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Resource Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterOption, !filters.resourceType && styles.filterOptionActive]}
                  onPress={() => setFilters(prev => ({ ...prev, resourceType: undefined }))}
                >
                  <Text style={styles.filterOptionText}>All</Text>
                </TouchableOpacity>
                {resourceTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterOption, filters.resourceType === type && styles.filterOptionActive]}
                    onPress={() => setFilters(prev => ({ ...prev, resourceType: type }))}
                  >
                    <Text style={styles.filterOptionText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterRow}>
                {['SUCCESS', 'FAILURE', 'PENDING'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterOption, filters.status === status && styles.filterOptionActive]}
                    onPress={() => setFilters(prev => ({ ...prev, status: prev.status === status ? undefined : status }))}
                  >
                    <Text style={styles.filterOptionText}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No Audit Logs</Text>
      <Text style={styles.emptyText}>
        No audit logs found with current filters.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : null
        }
      />

      {renderDetailModal()}
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  exportButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center'
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  statsContainer: {
    marginBottom: 16
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderLeftWidth: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  statIcon: {
    fontSize: 24,
    marginRight: 12
  },
  statContent: {
    flex: 1
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827'
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 14
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  filterButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500'
  },
  clearButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  clearButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500'
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12
  },
  filterChip: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8
  },
  filterChipText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500'
  },
  logCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  logHeaderLeft: {
    flexDirection: 'row',
    flex: 1
  },
  logIcon: {
    fontSize: 24,
    marginRight: 12
  },
  logAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4
  },
  logUser: {
    fontSize: 13,
    color: '#6B7280'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  logDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20
  },
  logFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  logTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 12
  },
  logIP: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 12
  },
  logDuration: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  impactBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  impactText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827'
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: 'bold'
  },
  modalBody: {
    padding: 20
  },
  detailSection: {
    marginBottom: 20
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  detailText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4
  },
  detailSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444'
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  tag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6
  },
  tagText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500'
  },
  filterSection: {
    marginBottom: 20
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  filterOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },
  filterOptionActive: {
    backgroundColor: '#3B82F6'
  },
  filterOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500'
  },
  applyButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default AuditLogScreen;
