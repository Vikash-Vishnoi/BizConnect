import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import type {Campaign, CampaignStatus} from '../types/campaign';
import {campaignAPI} from '../services/campaignService';
import CampaignCard from '../components/campaigns/CampaignCard';
import SearchBar from '../components/campaigns/SearchBar';

type Props = NativeStackScreenProps<RootStackParamList, 'Campaigns'>;

const CampaignsScreen = ({navigation}: Props) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>(
    'all',
  );

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchQuery, statusFilter]);

  const loadCampaigns = async () => {
    try {
      const data = await campaignAPI.getCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
  };

  const filterCampaigns = () => {
    let filtered = [...campaigns];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        campaign =>
          campaign.name.toLowerCase().includes(query) ||
          campaign.description?.toLowerCase().includes(query),
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    setFilteredCampaigns(filtered);
  };

  const handleCampaignPress = (campaign: Campaign) => {
    navigation.navigate('CampaignDetails', {campaignId: campaign._id});
  };

  const handleCreateCampaign = () => {
    navigation.navigate('CreateCampaign');
  };

  const renderFilterButton = (
    label: string,
    value: CampaignStatus | 'all',
  ) => {
    const isActive = statusFilter === value;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setStatusFilter(value)}>
        <Text
          style={[
            styles.filterButtonText,
            isActive && styles.filterButtonTextActive,
          ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No campaigns found</Text>
      <Text style={styles.emptyText}>
        {searchQuery || statusFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Create your first campaign to get started'}
      </Text>
      {!searchQuery && statusFilter === 'all' && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateCampaign}>
          <Text style={styles.createButtonText}>+ Create Campaign</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Campaigns</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campaigns</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateCampaign}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.content}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search campaigns..."
        />

        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}>
          {renderFilterButton('All', 'all')}
          {renderFilterButton('Running', 'running')}
          {renderFilterButton('Scheduled', 'scheduled')}
          {renderFilterButton('Paused', 'paused')}
          {renderFilterButton('Completed', 'completed')}
          {renderFilterButton('Draft', 'draft')}
        </ScrollView>

        {/* Campaign List */}
        <FlatList
          data={filteredCampaigns}
          keyExtractor={item => item._id}
          renderItem={({item}) => (
            <CampaignCard
              campaign={item}
              onPress={() => handleCampaignPress(item)}
            />
          )}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#25D366']}
            />
          }
          contentContainerStyle={
            filteredCampaigns.length === 0 && styles.listEmpty
          }
        />
      </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    marginTop: -2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filtersContainer: {
    marginBottom: 16,
    maxHeight: 40,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  listEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#25D366',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CampaignsScreen;
